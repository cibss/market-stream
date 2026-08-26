import { Subscription } from "rxjs";

import {
  processingMetricsReceived,
  processorBatchCompleted,
  selectDataSource,
  selectProcessingMode,
  selectSimulationRate,
} from "@/features/benchmark/benchmark.slice";
import {
  connectionOpened,
  connectionStatusChanged,
  reconnectScheduled,
  selectShouldConnect,
  transportMetricsReceived,
} from "@/features/connection/connection.slice";
import { marketBatchProcessed } from "@/features/market/market.slice";
import {
  type DataSource,
  MARKET_SYMBOLS,
  type MarketTicker,
  type ProcessingMode,
  type SimulationRate,
} from "@/features/market/market.types";
import {
  COINBASE_MARKET_WS_URL,
  createHeartbeatSubscription,
  createTickerSubscription,
} from "@/lib/market-data/coinbase";
import { createMarketStream } from "@/lib/market-data/market-stream";
import { MarketSimulator } from "@/lib/market-data/simulator";
import { MarketAnalyticsEngine } from "@/lib/market-processing/analytics-engine";
import { MarketWorkerClient } from "@/lib/market-processing/worker-client";
import type { AppStore } from "@/lib/store/store";
import { WebSocketClient } from "@/lib/websocket/websocket-client";

type RuntimeStore = Pick<AppStore, "dispatch" | "getState">;

export class MarketRuntime {
  private readonly marketStream = createMarketStream();

  private readonly mainEngine = new MarketAnalyticsEngine();

  private readonly workerClient = new MarketWorkerClient();

  private readonly simulator: MarketSimulator;

  private readonly client: WebSocketClient;

  private readonly subscriptions = new Subscription();

  private processorGeneration = 0;

  private started = false;

  private streamPaused = false;

  private activeSource: DataSource | null = null;

  private activeRate: SimulationRate | null = null;

  private activeMode: ProcessingMode | null = null;

  private connectionEnabled: boolean | null = null;

  constructor(private readonly store: RuntimeStore) {
    this.simulator = new MarketSimulator((batch: MarketTicker[]) => {
      if (this.streamPaused) {
        return;
      }

      this.marketStream.pushSimulationBatch(batch);
    });

    this.client = new WebSocketClient({
      url: COINBASE_MARKET_WS_URL,

      onStatusChange: (status) => {
        this.store.dispatch(connectionStatusChanged(status));
      },

      onOpen: (socket) => {
        this.store.dispatch(connectionOpened());

        socket.send(createTickerSubscription(MARKET_SYMBOLS));

        socket.send(createHeartbeatSubscription());
      },

      onMessage: (message) => {
        const state = this.store.getState();

        if (selectDataSource(state) !== "live") {
          return;
        }

        if (this.streamPaused) {
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

    this.subscriptions.add(
      this.marketStream.tickerBatch$.subscribe((batch) => {
        void this.processBatch(batch);
      }),
    );

    this.subscriptions.add(
      this.marketStream.metrics$.subscribe((metrics) => {
        this.store.dispatch(transportMetricsReceived(metrics));
      }),
    );

    this.subscriptions.add(
      this.marketStream.processingMetrics$.subscribe((metrics) => {
        this.store.dispatch(processingMetricsReceived(metrics));
      }),
    );

    const state = this.store.getState();

    this.setProcessingMode(selectProcessingMode(state));

    this.setSimulationRate(selectSimulationRate(state));

    this.setDataSource(selectDataSource(state));

    this.setConnectionEnabled(selectShouldConnect(state));
  }

  stop() {
    if (!this.started) {
      return;
    }

    this.started = false;

    this.subscriptions.unsubscribe();

    this.simulator.stop();

    this.marketStream.complete();

    this.client.disconnect({
      notify: false,
    });

    this.workerClient.terminate();
  }

  setDataSource(source: DataSource) {
    if (this.activeSource === source) {
      return;
    }

    this.activeSource = source;

    this.resetProcessors();

    if (source === "live") {
      this.simulator.stop();

      if (this.connectionEnabled === true) {
        this.client.connect();
      }

      return;
    }

    this.client.disconnect();

    this.simulator.reset();

    if (this.streamPaused) {
      return;
    }

    const rate = this.activeRate ?? 1_000;

    this.simulator.start(rate);
  }

  setSimulationRate(rate: SimulationRate) {
    if (this.activeRate === rate) {
      return;
    }

    this.activeRate = rate;

    /**
     * A rate change defines a new benchmark workload.
     *
     * Previous analytics history should not leak
     * into the new scenario.
     */
    this.resetProcessors();

    if (this.activeSource !== "simulation") {
      return;
    }

    if (this.streamPaused) {
      return;
    }

    this.simulator.reset();

    this.simulator.start(rate);
  }

  setProcessingMode(mode: ProcessingMode) {
    if (this.activeMode === mode) {
      return;
    }

    this.activeMode = mode;

    this.resetProcessors();
  }

  setConnectionEnabled(enabled: boolean) {
    if (this.connectionEnabled === enabled) {
      return;
    }

    this.connectionEnabled = enabled;

    if (this.activeSource !== "live") {
      return;
    }

    if (enabled) {
      this.client.connect();

      return;
    }

    this.client.disconnect();
  }

  setStreamPaused(paused: boolean) {
    if (this.streamPaused === paused) {
      return;
    }

    this.streamPaused = paused;

    if (this.activeSource !== "simulation") {
      return;
    }

    if (paused) {
      this.simulator.stop();

      return;
    }

    const rate = this.activeRate ?? 1_000;

    this.simulator.start(rate);
  }

  simulateTransportFailure() {
    if (this.activeSource !== "live") {
      return;
    }

    if (this.connectionEnabled !== true) {
      return;
    }

    this.client.simulateFailure();
  }

  injectInvalidMessage() {
    this.marketStream.pushLiveMessage("{ invalid-market-message");
  }

  restartConnection() {
    if (this.activeSource !== "live") {
      return;
    }

    if (this.connectionEnabled !== true) {
      return;
    }

    this.client.restart();
  }

  private resetProcessors() {
    this.processorGeneration += 1;

    this.mainEngine.reset();

    this.workerClient.reset();
  }

  private async processBatch(batch: MarketTicker[]) {
    const generation = this.processorGeneration;

    const mode = this.activeMode ?? "main-thread";

    /**
     * This measures the duration visible to
     * MarketRuntime itself.
     *
     * For workers, this includes message
     * round-trip overhead.
     */
    const roundTripStartedAt = performance.now();

    try {
      const result =
        mode === "web-worker"
          ? await this.workerClient.process(batch)
          : this.mainEngine.process(batch);

      const roundTripDurationMs = performance.now() - roundTripStartedAt;

      if (generation !== this.processorGeneration) {
        return;
      }

      this.store.dispatch(marketBatchProcessed(result));

      this.store.dispatch(
        processorBatchCompleted({
          processingDurationMs: result.processingDurationMs,

          roundTripDurationMs,

          batchSize: result.batchSize,
        }),
      );
    } catch (error) {
      console.error("Market processing failed", error);
    }
  }
}
