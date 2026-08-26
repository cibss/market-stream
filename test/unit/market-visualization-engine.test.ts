import { describe, expect, it } from "vitest";

import type { MarketTicker } from "@/features/market/market.types";
import { MarketVisualizationEngine } from "@/lib/market-processing/market-visualization-engine";

function createTicker(price: number, updatedAt: number): MarketTicker {
  return {
    symbol: "BTC-USD",

    price,

    priceChange24hPct: 0,

    volume24h: 100,

    high24h: price,

    low24h: price,

    bestBid: price - 1,

    bestAsk: price + 1,

    updatedAt,
  };
}

describe("MarketVisualizationEngine", () => {
  it("builds OHLC values inside the same one-second candle", () => {
    const engine = new MarketVisualizationEngine();

    engine.process([
      createTicker(100, 1_000),
      createTicker(110, 1_100),
      createTicker(90, 1_200),
      createTicker(105, 1_900),
    ]);

    const result = engine.process([createTicker(107, 1_950)]);

    expect(result.candles["BTC-USD"]).toEqual({
      time: 1,

      open: 100,

      high: 110,

      low: 90,

      close: 107,
    });
  });

  it("starts a new candle when the time bucket changes", () => {
    const engine = new MarketVisualizationEngine();

    engine.process([createTicker(100, 1_000)]);

    const result = engine.process([createTicker(120, 2_000)]);

    expect(result.candles["BTC-USD"]).toEqual({
      time: 2,

      open: 120,

      high: 120,

      low: 120,

      close: 120,
    });
  });

  it("derives price direction from consecutive events", () => {
    const engine = new MarketVisualizationEngine();

    engine.process([createTicker(100, 1_000)]);

    const up = engine.process([createTicker(110, 1_100)]);

    expect(up.activity[0]?.direction).toBe("up");

    const down = engine.process([createTicker(90, 1_200)]);

    expect(down.activity[0]?.direction).toBe("down");
  });

  it("limits activity sampling for very large batches", () => {
    const engine = new MarketVisualizationEngine();

    const batch = Array.from(
      {
        length: 10_000,
      },
      (_, index) => createTicker(100 + index, 1_000 + index),
    );

    const result = engine.process(batch);

    expect(result.activity.length).toBeLessThanOrEqual(30);
  });

  it("clears candle and direction state when reset", () => {
    const engine = new MarketVisualizationEngine();

    engine.process([createTicker(100, 1_000)]);

    engine.reset();

    const result = engine.process([createTicker(120, 2_000)]);

    expect(result.activity[0]?.direction).toBe("flat");

    expect(result.candles["BTC-USD"]?.open).toBe(120);
  });
});
