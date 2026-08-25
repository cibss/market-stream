import { Subject, bufferTime, filter, map, scan, share } from "rxjs";

import type { MarketTicker } from "@/features/market/market.types";

import { parseCoinbaseTickerMessage } from "@/lib/market-data/coinbase";
import type { ProcessingMetrics } from "@/features/market/market.types";

export type MarketStreamMetrics = {
  messagesPerSecond: number;
  totalMessages: number;
  lastMessageAt: number | null;
};

const INITIAL_METRICS: MarketStreamMetrics = {
  messagesPerSecond: 0,
  totalMessages: 0,
  lastMessageAt: null,
};

export function createMarketStream() {
  /**
   * Bridge between the imperative
   * WebSocket API and RxJS.
   */
  const rawMessageSubject = new Subject<string>();

  /**
   * We expose an Observable,
   * not the Subject itself.
   *
   * Consumers can subscribe,
   * but cannot accidentally call next().
   */
  const rawMessage$ = rawMessageSubject.asObservable();

  /**
   * Parse raw Coinbase messages
   * into our application domain.
   */
  const parsedTicker$ = rawMessage$.pipe(
    map((message) => parseCoinbaseTickerMessage(message)),

    filter((updates) => updates.length > 0),

    share(),
  );

  /**
   * Instead of pushing every ticker
   * update directly into React,
   * collect updates for 100ms.
   *
   * Maximum React market commits:
   * approximately 10 per second.
   */
  const tickerBatch$ = parsedTicker$.pipe(
    bufferTime(100),

    map((batches) => batches.flat()),

    filter((batch) => batch.length > 0),

    share(),
  );

  const INITIAL_PROCESSING_METRICS: ProcessingMetrics = {
    uiCommitsPerSecond: 0,
    lastBatchSize: 0,
    totalTickerUpdates: 0,
  };

  const processingMetrics$ = tickerBatch$.pipe(
    bufferTime(1000),

    scan(
      (previous, batches): ProcessingMetrics => {
        const updatesThisSecond = batches.reduce(
          (total, batch) => total + batch.length,
          0,
        );

        const lastBatch = batches.at(-1);

        return {
          uiCommitsPerSecond: batches.length,

          lastBatchSize: lastBatch?.length ?? 0,

          totalTickerUpdates: previous.totalTickerUpdates + updatesThisSecond,
        };
      },

      INITIAL_PROCESSING_METRICS,
    ),

    share(),
  );

  /**
   * Derive stream metrics from
   * the same raw message stream.
   *
   * One emission per second instead
   * of causing a React update
   * for every message.
   */
  const metrics$ = rawMessage$.pipe(
    bufferTime(1000),

    scan(
      (previous, messages): MarketStreamMetrics => {
        return {
          messagesPerSecond: messages.length,

          totalMessages: previous.totalMessages + messages.length,

          lastMessageAt:
            messages.length > 0 ? Date.now() : previous.lastMessageAt,
        };
      },

      INITIAL_METRICS,
    ),

    share(),
  );

  return {
    push(message: string) {
      rawMessageSubject.next(message);
    },

    tickerBatch$,

    metrics$,

    processingMetrics$,

    complete() {
      rawMessageSubject.complete();
    },
  };
}
