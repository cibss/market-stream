"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createEmptyTickerMap,
  MARKET_SYMBOLS,
  type ConnectionMetrics,
  type ConnectionStatus,
} from "@/features/market/market.types";

import {
  COINBASE_MARKET_WS_URL,
  createHeartbeatSubscription,
  createTickerSubscription,
} from "@/lib/market-data/coinbase";

import { createMarketStream } from "@/lib/market-data/market-stream";

import { WebSocketClient } from "@/lib/websocket/websocket-client";
import type { ProcessingMetrics } from "@/features/market/market.types";

const INITIAL_METRICS: ConnectionMetrics = {
  connectedAt: null,
  lastMessageAt: null,
  messagesPerSecond: 0,
  totalMessages: 0,
  reconnectCount: 0,
};

const INITIAL_PROCESSING_METRICS: ProcessingMetrics = {
  uiCommitsPerSecond: 0,
  lastBatchSize: 0,
  totalTickerUpdates: 0,
};

export function useMarketStream() {
  const [tickers, setTickers] = useState(createEmptyTickerMap);

  const [status, setStatus] = useState<ConnectionStatus>("idle");

  const [metrics, setMetrics] = useState<ConnectionMetrics>(INITIAL_METRICS);

  const [processingMetrics, setProcessingMetrics] = useState<ProcessingMetrics>(
    INITIAL_PROCESSING_METRICS,
  );

  const clientRef = useRef<WebSocketClient | null>(null);

  const reconnectCountRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    /**
     * RxJS stream belongs to this
     * connection lifecycle.
     */
    const marketStream = createMarketStream();

    /**
     * React subscribes to already
     * parsed + batched ticker data.
     */
    const tickerSubscription = marketStream.tickerBatch$.subscribe(
      (updates) => {
        if (!mounted) {
          return;
        }

        setTickers((current) => {
          const next = {
            ...current,
          };

          for (const ticker of updates) {
            next[ticker.symbol] = ticker;
          }

          return next;
        });
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

    /**
     * Stream metrics are also
     * derived through RxJS.
     *
     * This emits at most once
     * per second.
     */
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

      /**
       * Important:
       *
       * WebSocket no longer knows
       * anything about parsing,
       * market state, or React.
       *
       * It only pushes raw messages
       * into the reactive stream.
       */
      onMessage: (message) => {
        marketStream.push(message);
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

      /**
       * Every RxJS subscription
       * should be explicitly cleaned.
       */
      tickerSubscription.unsubscribe();

      processingSubscription.unsubscribe();

      metricsSubscription.unsubscribe();

      marketStream.complete();

      client.disconnect();

      clientRef.current = null;
    };
  }, []);

  const connect = useCallback(() => {
    clientRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  return {
    tickers,
    status,
    metrics,
    processingMetrics,
    connect,
    disconnect,
  };
}
