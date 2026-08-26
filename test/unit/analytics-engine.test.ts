import { describe, expect, it } from "vitest";

import type { MarketTicker } from "@/features/market/market.types";

import { MarketAnalyticsEngine } from "@/lib/market-processing/analytics-engine";

function createTicker(price: number): MarketTicker {
  return {
    symbol: "BTC-USD",

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

describe("MarketAnalyticsEngine", () => {
  it("calculates rolling market statistics", () => {
    const engine = new MarketAnalyticsEngine();

    const result = engine.process([
      createTicker(100),
      createTicker(110),
      createTicker(120),
    ]);

    const btc = result.analytics["BTC-USD"];

    expect(btc).not.toBeNull();

    expect(btc?.sampleSize).toBe(3);

    expect(btc?.meanPrice).toBe(110);

    expect(btc?.minPrice).toBe(100);

    expect(btc?.maxPrice).toBe(120);

    expect(btc?.sma20).toBe(110);

    expect(btc?.volatilityPct).toBeGreaterThan(0);
  });

  it("keeps history across batches", () => {
    const engine = new MarketAnalyticsEngine();

    engine.process([createTicker(100)]);

    const result = engine.process([createTicker(110)]);

    expect(result.analytics["BTC-USD"]?.sampleSize).toBe(2);
  });

  it("clears rolling history when reset", () => {
    const engine = new MarketAnalyticsEngine();

    engine.process([createTicker(100), createTicker(110)]);

    engine.reset();

    const result = engine.process([createTicker(120)]);

    expect(result.analytics["BTC-USD"]?.sampleSize).toBe(1);
  });
});
