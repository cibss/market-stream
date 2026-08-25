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
  parseCoinbaseTickerMessage,
} from "@/lib/market-data/coinbase";

import { WebSocketClient } from "@/lib/websocket/websocket-client";

const INITIAL_METRICS: ConnectionMetrics = {
  connectedAt: null,
  lastMessageAt: null,
  messagesPerSecond: 0,
  totalMessages: 0,
  reconnectCount: 0,
};

export function useMarketStream() {
  const [tickers, setTickers] = useState(createEmptyTickerMap);

  const [status, setStatus] = useState<ConnectionStatus>("idle");

  const [metrics, setMetrics] = useState<ConnectionMetrics>(INITIAL_METRICS);

  const clientRef = useRef<WebSocketClient | null>(null);

  const messagesThisSecondRef = useRef(0);

  const totalMessagesRef = useRef(0);

  const lastMessageAtRef = useRef<number | null>(null);

  const reconnectCountRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const client = new WebSocketClient({
      url: COINBASE_MARKET_WS_URL,

      onStatusChange: (nextStatus) => {
        if (mounted) {
          setStatus(nextStatus);
        }
      },

      onOpen: (socket) => {
        if (!mounted) {
          return;
        }

        setMetrics((current) => ({
          ...current,
          connectedAt: Date.now(),
        }));

        /*
         * Coinbase accepts one channel
         * per subscription message.
         *
         * So ticker and heartbeats
         * are separate messages.
         */

        socket.send(createTickerSubscription(MARKET_SYMBOLS));

        socket.send(createHeartbeatSubscription());
      },

      onMessage: (message) => {
        if (!mounted) {
          return;
        }

        messagesThisSecondRef.current += 1;

        totalMessagesRef.current += 1;

        lastMessageAtRef.current = Date.now();

        const updates = parseCoinbaseTickerMessage(message);

        if (updates.length === 0) {
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

      onReconnectScheduled: () => {
        reconnectCountRef.current += 1;
      },
    });

    clientRef.current = client;

    client.connect();

    const metricsInterval = window.setInterval(() => {
      if (!mounted) {
        return;
      }

      setMetrics((current) => ({
        ...current,

        messagesPerSecond: messagesThisSecondRef.current,

        totalMessages: totalMessagesRef.current,

        lastMessageAt: lastMessageAtRef.current,

        reconnectCount: reconnectCountRef.current,
      }));

      messagesThisSecondRef.current = 0;
    }, 1000);

    return () => {
      mounted = false;

      window.clearInterval(metricsInterval);

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
    connect,
    disconnect,
  };
}
