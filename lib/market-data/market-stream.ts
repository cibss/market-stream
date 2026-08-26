import { bufferTime, filter, map, merge, scan, share, Subject } from "rxjs";

import type { MarketTicker, ProcessingMetrics } from "@/features/market/market.types";
import { parseCoinbaseTickerMessage } from "@/lib/market-data/coinbase";

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

const INITIAL_PROCESSING_METRICS: ProcessingMetrics = {
  inputEventsPerSecond: 0,
  uiCommitsPerSecond: 0,
  lastBatchSize: 0,
  totalTickerUpdates: 0,
};

export function createMarketStream() {
  /*
   * Raw transport messages.
   *
   * Only live Coinbase data
   * enters here.
   */
  const rawMessageSubject = new Subject<string>();

  /*
   * Already-normalized domain data.
   *
   * Simulator enters here.
   */
  const simulatedTickerSubject = new Subject<MarketTicker[]>();

  const rawMessage$ = rawMessageSubject.asObservable();

  const liveTicker$ = rawMessage$.pipe(
    map((message) => parseCoinbaseTickerMessage(message)),

    filter((updates) => updates.length > 0),

    share(),
  );

  /*
   * Merge two different sources
   * into one domain stream.
   *
   * From this point onward,
   * processing doesn't care
   * where data came from.
   */
  const tickerInput$ = merge(
    liveTicker$,

    simulatedTickerSubject.asObservable(),
  ).pipe(share());

  /*
   * Application-level batching.
   */
  const tickerBatch$ = tickerInput$.pipe(
    bufferTime(100),

    map((batches) => batches.flat()),

    filter((batch) => batch.length > 0),

    share(),
  );

  /*
   * WebSocket transport metrics.
   *
   * These are intentionally
   * live-feed only.
   */
  const metrics$ = rawMessage$.pipe(
    bufferTime(1000),

    scan(
      (previous, messages): MarketStreamMetrics => ({
        messagesPerSecond: messages.length,

        totalMessages: previous.totalMessages + messages.length,

        lastMessageAt: messages.length > 0 ? Date.now() : previous.lastMessageAt,
      }),

      INITIAL_METRICS,
    ),

    share(),
  );

  /*
   * Domain processing metrics.
   *
   * Works for both:
   *
   * live
   * simulation
   */
  const processingMetrics$ = tickerBatch$.pipe(
    bufferTime(1000),

    scan(
      (previous, batches): ProcessingMetrics => {
        const inputEvents = batches.reduce((total, batch) => total + batch.length, 0);

        const lastBatch = batches.at(-1);

        return {
          inputEventsPerSecond: inputEvents,

          uiCommitsPerSecond: batches.length,

          lastBatchSize: lastBatch?.length ?? 0,

          totalTickerUpdates: previous.totalTickerUpdates + inputEvents,
        };
      },

      INITIAL_PROCESSING_METRICS,
    ),

    share(),
  );

  return {
    pushLiveMessage(message: string) {
      rawMessageSubject.next(message);
    },

    pushSimulationBatch(batch: MarketTicker[]) {
      simulatedTickerSubject.next(batch);
    },

    tickerBatch$,

    metrics$,

    processingMetrics$,

    complete() {
      rawMessageSubject.complete();

      simulatedTickerSubject.complete();
    },
  };
}
