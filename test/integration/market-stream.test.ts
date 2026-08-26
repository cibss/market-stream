import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MarketTicker } from "@/features/market/market.types";

import { createMarketStream } from "@/lib/market-data/market-stream";

function createTicker(
  symbol: MarketTicker["symbol"],
  price: number,
): MarketTicker {
  return {
    symbol,

    price,

    priceChange24hPct: 0,

    volume24h: 100,

    high24h: price,

    low24h: price,

    bestBid: price - 1,

    bestAsk: price + 1,

    updatedAt: Date.now(),
  };
}

describe("market stream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("batches multiple incoming simulation events into one emission", async () => {
    const stream = createMarketStream();

    const received: MarketTicker[][] = [];

    const subscription = stream.tickerBatch$.subscribe((batch) => {
      received.push(batch);
    });

    stream.pushSimulationBatch([createTicker("BTC-USD", 100)]);

    stream.pushSimulationBatch([createTicker("ETH-USD", 200)]);

    stream.pushSimulationBatch([createTicker("SOL-USD", 300)]);

    expect(received).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(100);

    expect(received).toHaveLength(1);

    expect(received[0]).toHaveLength(3);

    expect(received[0].map((ticker) => ticker.symbol)).toEqual([
      "BTC-USD",
      "ETH-USD",
      "SOL-USD",
    ]);

    subscription.unsubscribe();

    stream.complete();
  });

  it("does not emit an empty ticker batch", async () => {
    const stream = createMarketStream();

    const received: MarketTicker[][] = [];

    const subscription = stream.tickerBatch$.subscribe((batch) => {
      received.push(batch);
    });

    await vi.advanceTimersByTimeAsync(500);

    expect(received).toEqual([]);

    subscription.unsubscribe();

    stream.complete();
  });
});
