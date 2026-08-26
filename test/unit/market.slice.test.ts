import { describe, expect, it } from "vitest";

import marketReducer from "@/features/market/market.slice";
import { marketBatchProcessed } from "@/features/market/market.slice";
import { createEmptyAnalyticsMap, type ProcessedMarketBatch } from "@/features/market/market.types";

describe("marketSlice", () => {
  it("upserts processed tickers into normalized state", () => {
    const result: ProcessedMarketBatch = {
      latestTickers: [
        {
          symbol: "BTC-USD",

          price: 80_000,

          priceChange24hPct: 1,

          volume24h: 100,

          high24h: 81_000,

          low24h: 79_000,

          bestBid: 79_999,

          bestAsk: 80_001,

          updatedAt: 1,
        },
      ],

      analytics: createEmptyAnalyticsMap(),

      batchSize: 1,

      processingDurationMs: 2,
    };

    const state = marketReducer(
      undefined,

      marketBatchProcessed(result),
    );

    expect(state.ids).toContain("BTC-USD");

    expect(state.entities["BTC-USD"]?.price).toBe(80_000);
  });

  it("updates an existing symbol instead of duplicating it", () => {
    const first: ProcessedMarketBatch = {
      latestTickers: [
        {
          symbol: "BTC-USD",

          price: 80_000,

          priceChange24hPct: 1,

          volume24h: 100,

          high24h: 81_000,

          low24h: 79_000,

          bestBid: 79_999,

          bestAsk: 80_001,

          updatedAt: 1,
        },
      ],

      analytics: createEmptyAnalyticsMap(),

      batchSize: 1,

      processingDurationMs: 1,
    };

    const second = {
      ...first,

      latestTickers: [
        {
          ...first.latestTickers[0],

          price: 82_000,

          updatedAt: 2,
        },
      ],
    };

    const state1 = marketReducer(undefined, marketBatchProcessed(first));

    const state2 = marketReducer(state1, marketBatchProcessed(second));

    expect(state2.ids).toEqual(["BTC-USD"]);

    expect(state2.entities["BTC-USD"]?.price).toBe(82_000);
  });
});
