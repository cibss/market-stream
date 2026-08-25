import { Subscription } from "rxjs";

import type { AppStore } from "@/lib/store/store";

import {
  MARKET_SYMBOLS,
  type DataSource,
  type MarketTicker,
  type ProcessingMode,
  type SimulationRate,
} from "@/features/market/market.types";

import { marketBatchProcessed } from "@/features/market/market.slice";

import {
  connectionOpened,
  connectionStatusChanged,
  reconnectScheduled,
  selectShouldConnect,
  transportMetricsReceived,
} from "@/features/connection/connection.slice";

import {
  processingMetricsReceived,
  processorBatchCompleted,
  selectDataSource,
  selectProcessingMode,
  selectSimulationRate,
} from "@/features/benchmark/benchmark.slice";

import {
  COINBASE_MARKET_WS_URL,
  createHeartbeatSubscription,
  createTickerSubscription,
} from "@/lib/market-data/coinbase";

import { createMarketStream } from "@/lib/market-data/market-stream";

import { MarketSimulator } from "@/lib/market-data/simulator";

import { MarketAnalyticsEngine } from "@/lib/market-processing/analytics-engine";

import { MarketWorkerClient } from "@/lib/market-processing/worker-client";

import { WebSocketClient } from "@/lib/websocket/websocket-client";

type RuntimeStore = Pick<AppStore, "dispatch" | "getState">;

export class MarketRuntime {
  /**
   * High-frequency data pipeline.
   *
   * Raw transport messages and simulation data
   * eventually converge here before processing.
   */
  private readonly marketStream = createMarketStream();

  /**
   * Same analytics implementation used when
   * processing on the browser main thread.
   */
  private readonly mainEngine = new MarketAnalyticsEngine();

  /**
   * Worker abstraction for processing the same
   * analytics workload off the main thread.
   */
  private readonly workerClient = new MarketWorkerClient();

  /**
   * Synthetic high-frequency market data source.
   */
  private readonly simulator: MarketSimulator;

  /**
   * Browser WebSocket transport.
   */
  private readonly client: WebSocketClient;

  /**
   * Holds all RxJS subscriptions owned by
   * this runtime instance.
   */
  private readonly subscriptions = new Subscription();

  /**
   * Incremented whenever the processor/source
   * changes.
   *
   * Async worker results from an older generation
   * can therefore be ignored safely.
   */
  private processorGeneration = 0;

  private started = false;

  /**
   * Runtime mirrors of configuration stored
   * inside Redux.
   *
   * Redux remains the source of truth.
   * These values prevent unnecessary service work.
   */
  private activeSource: DataSource | null = null;

  private activeRate: SimulationRate | null = null;

  private activeMode: ProcessingMode | null = null;

  private connectionEnabled: boolean | null = null;

  constructor(private readonly store: RuntimeStore) {
    /**
     * Simulator produces already-normalized
     * MarketTicker domain objects.
     */
    this.simulator = new MarketSimulator((batch: MarketTicker[]) => {
      this.marketStream.pushSimulationBatch(batch);
    });

    /**
     * WebSocketClient only knows transport concerns.
     *
     * It does not know about React, RxJS,
     * analytics or market state.
     */
    this.client = new WebSocketClient({
      url: COINBASE_MARKET_WS_URL,

      onStatusChange: (status) => {
        this.store.dispatch(connectionStatusChanged(status));
      },

      onOpen: (socket) => {
        this.store.dispatch(connectionOpened());

        /**
         * Coinbase subscriptions continue to live
         * in the frontend.
         *
         * Cloudflare remains only a transparent
         * transport relay.
         */
        socket.send(createTickerSubscription(MARKET_SYMBOLS));

        socket.send(createHeartbeatSubscription());
      },

      onMessage: (message) => {
        const state = this.store.getState();

        /**
         * The WebSocket may still be in the process
         * of shutting down while the user switches
         * to simulation mode.
         *
         * Ignore any remaining live messages.
         */
        if (selectDataSource(state) !== "live") {
          return;
        }

        this.marketStream.pushLiveMessage(message);
      },

      onReconnectScheduled: () => {
        this.store.dispatch(reconnectScheduled());
      },
    });
  }

  start() {
    if (this.started) {
      return;
    }

    this.started = true;

    /**
     * MARKET DATA
     *
     * RxJS has already normalized the update rate
     * into controlled batches by this point.
     */
    this.subscriptions.add(
      this.marketStream.tickerBatch$.subscribe((batch) => {
        void this.processBatch(batch);
      }),
    );

    /**
     * TRANSPORT METRICS
     *
     * WebSocket-level metrics such as:
     *
     * messages/sec
     * total messages
     * last message time
     */
    this.subscriptions.add(
      this.marketStream.metrics$.subscribe((metrics) => {
        this.store.dispatch(transportMetricsReceived(metrics));
      }),
    );

    /**
     * STREAM PROCESSING METRICS
     *
     * Includes values such as:
     *
     * input events/sec
     * UI commits/sec
     * last batch size
     */
    this.subscriptions.add(
      this.marketStream.processingMetrics$.subscribe((metrics) => {
        this.store.dispatch(processingMetricsReceived(metrics));
      }),
    );

    /**
     * Redux is the source of truth for the initial
     * runtime configuration.
     */
    const state = this.store.getState();

    /**
     * 1. Configure processing strategy.
     */
    this.setProcessingMode(selectProcessingMode(state));

    /**
     * 2. Configure simulator rate.
     *
     * This does not start simulation unless the
     * selected data source is simulation.
     */
    this.setSimulationRate(selectSimulationRate(state));

    /**
     * 3. Establish which source is active.
     *
     * At this moment connectionEnabled is still
     * null, so selecting "live" does not yet open
     * the WebSocket.
     */
    this.setDataSource(selectDataSource(state));

    /**
     * 4. Apply the desired connection state.
     *
     * With the default Redux state:
     *
     * activeSource = live
     * shouldConnect = true
     *
     * this is the step that actually calls:
     *
     * client.connect()
     *
     * producing:
     *
     * connecting → connected
     */
    this.setConnectionEnabled(selectShouldConnect(state));
  }

  stop() {
    if (!this.started) {
      return;
    }

    this.started = false;

    /**
     * Stop RxJS consumers first so no more
     * application work can be committed.
     */
    this.subscriptions.unsubscribe();

    /**
     * Stop synthetic event generation.
     */
    this.simulator.stop();

    /**
     * Complete the RxJS producer.
     */
    this.marketStream.complete();

    /**
     * Runtime teardown is NOT the same thing as
     * the user requesting a disconnect.
     *
     * This is particularly important under React
     * development Strict Mode, where effects can
     * be mounted/cleaned up an extra time.
     *
     * Do not dispatch a fake "disconnected" state.
     */
    this.client.disconnect({
      notify: false,
    });

    /**
     * Terminate the background thread.
     */
    this.workerClient.terminate();
  }

  setDataSource(source: DataSource) {
    if (this.activeSource === source) {
      return;
    }

    this.activeSource = source;

    /**
     * Analytics from one source should never leak
     * into the next source's benchmark.
     */
    this.resetProcessors();

    if (source === "live") {
      this.simulator.stop();

      /**
       * Connection may intentionally be disabled
       * through Redux.
       */
      if (this.connectionEnabled === true) {
        this.client.connect();
      }

      return;
    }

    /**
     * Simulation doesn't need the live connection.
     *
     * This is a real application-level disconnect,
     * so Redux may be notified.
     */
    this.client.disconnect();

    this.simulator.reset();

    const rate = this.activeRate ?? 1_000;

    this.simulator.start(rate);
  }

  setSimulationRate(rate: SimulationRate) {
    if (this.activeRate === rate) {
      return;
    }

    this.activeRate = rate;

    /**
     * Updating the configured rate while Live mode
     * is active should not start the simulator.
     */
    if (this.activeSource !== "simulation") {
      return;
    }

    this.simulator.start(rate);
  }

  setProcessingMode(mode: ProcessingMode) {
    if (this.activeMode === mode) {
      return;
    }

    this.activeMode = mode;

    /**
     * Main-thread and worker measurements must
     * start from equivalent analytics histories.
     */
    this.resetProcessors();
  }

  setConnectionEnabled(enabled: boolean) {
    if (this.connectionEnabled === enabled) {
      return;
    }

    this.connectionEnabled = enabled;

    /**
     * The connection preference is still stored
     * while simulation mode is active, but it
     * should not create a socket until Live mode
     * becomes active.
     */
    if (this.activeSource !== "live") {
      return;
    }

    if (enabled) {
      this.client.connect();

      return;
    }

    this.client.disconnect();
  }

  private resetProcessors() {
    /**
     * Any asynchronous result produced before this
     * point becomes stale.
     */
    this.processorGeneration += 1;

    this.mainEngine.reset();

    this.workerClient.reset();
  }

  private async processBatch(batch: MarketTicker[]) {
    const generation = this.processorGeneration;

    const mode = this.activeMode ?? "main-thread";

    try {
      /**
       * Same input.
       * Same analytics algorithm.
       * Same output.
       *
       * Only the execution location changes.
       */
      const result =
        mode === "web-worker"
          ? await this.workerClient.process(batch)
          : this.mainEngine.process(batch);

      /**
       * A worker response may arrive after the user
       * switches:
       *
       * Main Thread ↔ Web Worker
       *
       * or:
       *
       * Live ↔ Simulation
       *
       * Never commit those stale results.
       */
      if (generation !== this.processorGeneration) {
        return;
      }

      /**
       * Store the latest normalized application
       * snapshot in Redux.
       */
      this.store.dispatch(marketBatchProcessed(result));

      /**
       * Store benchmark statistics separately.
       */
      this.store.dispatch(
        processorBatchCompleted({
          durationMs: result.processingDurationMs,

          batchSize: result.batchSize,
        }),
      );
    } catch (error) {
      console.error("Market processing failed", error);
    }
  }
}
