"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createEmptyAnalyticsMap,
  createEmptyTickerMap,
  MARKET_SYMBOLS,
  type ConnectionMetrics,
  type ConnectionStatus,
  type DataSource,
  type ProcessingMetrics,
  type ProcessingMode,
  type ProcessorMetrics,
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

import { WebSocketClient } from "@/lib/websocket/websocket-client";

const INITIAL_CONNECTION_METRICS: ConnectionMetrics = {
  connectedAt: null,
  lastMessageAt: null,
  messagesPerSecond: 0,
  totalMessages: 0,
  reconnectCount: 0,
};

const INITIAL_PROCESSING_METRICS: ProcessingMetrics = {
  inputEventsPerSecond: 0,
  uiCommitsPerSecond: 0,
  lastBatchSize: 0,
  totalTickerUpdates: 0,
};

const INITIAL_PROCESSOR_METRICS: ProcessorMetrics = {
  lastProcessingMs: 0,
  averageProcessingMs: 0,
  processedBatches: 0,
  processedEvents: 0,
};

export function useMarketStream() {
  const [tickers, setTickers] = useState(createEmptyTickerMap);

  const [analytics, setAnalytics] = useState(createEmptyAnalyticsMap);

  const [status, setStatus] = useState<ConnectionStatus>("idle");

  const [metrics, setMetrics] = useState<ConnectionMetrics>(
    INITIAL_CONNECTION_METRICS,
  );

  const [processingMetrics, setProcessingMetrics] = useState<ProcessingMetrics>(
    INITIAL_PROCESSING_METRICS,
  );

  const [processorMetrics, setProcessorMetrics] = useState<ProcessorMetrics>(
    INITIAL_PROCESSOR_METRICS,
  );

  const [dataSource, setDataSource] = useState<DataSource>("live");

  const [simulationRate, setSimulationRate] = useState<SimulationRate>(1_000);

  const [processingMode, setProcessingMode] =
    useState<ProcessingMode>("main-thread");

  const clientRef = useRef<WebSocketClient | null>(null);

  const simulatorRef = useRef<MarketSimulator | null>(null);

  const mainEngineRef = useRef<MarketAnalyticsEngine | null>(null);

  const workerClientRef = useRef<MarketWorkerClient | null>(null);

  const marketStreamRef = useRef<ReturnType<typeof createMarketStream> | null>(
    null,
  );

  const sourceRef = useRef<DataSource>("live");

  const simulationRateRef = useRef<SimulationRate>(1_000);

  const processingModeRef = useRef<ProcessingMode>("main-thread");

  const processorGenerationRef = useRef(0);

  const reconnectCountRef = useRef(0);

  /*
   * Build application services once.
   */
  useEffect(() => {
    let mounted = true;

    const marketStream = createMarketStream();

    const mainEngine = new MarketAnalyticsEngine();

    const workerClient = new MarketWorkerClient();

    const simulator = new MarketSimulator((batch) => {
      marketStream.pushSimulationBatch(batch);
    });

    marketStreamRef.current = marketStream;

    mainEngineRef.current = mainEngine;

    workerClientRef.current = workerClient;

    simulatorRef.current = simulator;

    /*
     * The important subscription:
     *
     * RxJS has already batched
     * incoming market events.
     *
     * Now choose where analytics
     * should execute.
     */
    const tickerSubscription = marketStream.tickerBatch$.subscribe((batch) => {
      const generation = processorGenerationRef.current;

      const mode = processingModeRef.current;

      const processBatch = async () => {
        try {
          const result =
            mode === "web-worker"
              ? await workerClient.process(batch)
              : mainEngine.process(batch);

          /*
           * Ignore results from
           * a previous processor
           * generation.
           *
           * Example:
           *
           * user switches
           * worker → main while
           * worker still has
           * queued work.
           */
          if (!mounted || generation !== processorGenerationRef.current) {
            return;
          }

          setTickers((current) => {
            const next = {
              ...current,
            };

            for (const ticker of result.latestTickers) {
              next[ticker.symbol] = ticker;
            }

            return next;
          });

          setAnalytics(result.analytics);

          setProcessorMetrics((current) => {
            const batchCount = current.processedBatches + 1;

            const average =
              (current.averageProcessingMs * current.processedBatches +
                result.processingDurationMs) /
              batchCount;

            return {
              lastProcessingMs: result.processingDurationMs,

              averageProcessingMs: average,

              processedBatches: batchCount,

              processedEvents: current.processedEvents + result.batchSize,
            };
          });
        } catch (error) {
          console.error("Market processing failed", error);
        }
      };

      void processBatch();
    });

    const metricsSubscription = marketStream.metrics$.subscribe(
      (streamMetrics) => {
        if (!mounted) {
          return;
        }

        setMetrics((current) => ({
          ...current,

          messagesPerSecond: streamMetrics.messagesPerSecond,

          totalMessages: streamMetrics.totalMessages,

          lastMessageAt: streamMetrics.lastMessageAt,
        }));
      },
    );

    const processingSubscription = marketStream.processingMetrics$.subscribe(
      (nextMetrics) => {
        if (!mounted) {
          return;
        }

        setProcessingMetrics(nextMetrics);
      },
    );

    const client = new WebSocketClient({
      url: COINBASE_MARKET_WS_URL,

      onStatusChange: (nextStatus) => {
        if (!mounted) {
          return;
        }

        setStatus(nextStatus);
      },

      onOpen: (socket) => {
        if (!mounted) {
          return;
        }

        setMetrics((current) => ({
          ...current,

          connectedAt: Date.now(),
        }));

        socket.send(createTickerSubscription(MARKET_SYMBOLS));

        socket.send(createHeartbeatSubscription());
      },

      onMessage: (message) => {
        /*
         * Ignore live messages
         * while simulation mode
         * is selected.
         */
        if (sourceRef.current !== "live") {
          return;
        }

        marketStream.pushLiveMessage(message);
      },

      onReconnectScheduled: () => {
        reconnectCountRef.current += 1;

        if (!mounted) {
          return;
        }

        setMetrics((current) => ({
          ...current,

          reconnectCount: reconnectCountRef.current,
        }));
      },
    });

    clientRef.current = client;

    client.connect();

    return () => {
      mounted = false;

      tickerSubscription.unsubscribe();

      metricsSubscription.unsubscribe();

      processingSubscription.unsubscribe();

      simulator.stop();

      marketStream.complete();

      client.disconnect();

      workerClient.terminate();

      clientRef.current = null;

      simulatorRef.current = null;

      mainEngineRef.current = null;

      workerClientRef.current = null;

      marketStreamRef.current = null;
    };
  }, []);

  /*
   * Source switch:
   *
   * Live ↔ Simulation
   */
  useEffect(() => {
    sourceRef.current = dataSource;

    processorGenerationRef.current += 1;

    mainEngineRef.current?.reset();

    workerClientRef.current?.reset();

    setAnalytics(createEmptyAnalyticsMap());

    setProcessorMetrics(INITIAL_PROCESSOR_METRICS);

    if (dataSource === "live") {
      simulatorRef.current?.stop();

      clientRef.current?.connect();

      return;
    }

    clientRef.current?.disconnect();

    simulatorRef.current?.reset();

    simulatorRef.current?.start(simulationRateRef.current);
  }, [dataSource]);

  /*
   * Simulation rate change.
   */
  useEffect(() => {
    simulationRateRef.current = simulationRate;

    if (sourceRef.current !== "simulation") {
      return;
    }

    simulatorRef.current?.start(simulationRate);
  }, [simulationRate]);

  /*
   * Main Thread ↔ Web Worker
   */
  useEffect(() => {
    processingModeRef.current = processingMode;

    processorGenerationRef.current += 1;

    mainEngineRef.current?.reset();

    workerClientRef.current?.reset();

    setAnalytics(createEmptyAnalyticsMap());

    setProcessorMetrics(INITIAL_PROCESSOR_METRICS);
  }, [processingMode]);

  const connect = useCallback(() => {
    if (sourceRef.current === "live") {
      clientRef.current?.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  return {
    tickers,

    analytics,

    status,

    metrics,

    processingMetrics,

    processorMetrics,

    dataSource,

    simulationRate,

    processingMode,

    setDataSource,

    setSimulationRate,

    setProcessingMode,

    connect,

    disconnect,
  };
}
