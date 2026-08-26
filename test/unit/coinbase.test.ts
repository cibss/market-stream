import { describe, expect, it } from "vitest";

import { parseCoinbaseTickerMessage } from "@/lib/market-data/coinbase";

describe("parseCoinbaseTickerMessage", () => {
  it("converts Coinbase ticker data into our domain model", () => {
    const rawMessage = JSON.stringify({
      channel: "ticker",

      timestamp: "2026-08-26T03:00:00.000Z",

      events: [
        {
          type: "update",

          tickers: [
            {
              product_id: "BTC-USD",

              price: "80967.60",

              price_percent_chg_24_h: "4.49",

              volume_24_h: "12256.5",

              high_24_h: "81061.05",

              low_24_h: "76652.00",

              best_bid: "80967.59",

              best_ask: "80967.61",
            },
          ],
        },
      ],
    });

    const result = parseCoinbaseTickerMessage(rawMessage);

    expect(result).toHaveLength(1);

    expect(result[0]).toEqual(
      expect.objectContaining({
        symbol: "BTC-USD",

        price: 80967.6,

        priceChange24hPct: 4.49,

        volume24h: 12256.5,

        high24h: 81061.05,

        low24h: 76652,

        bestBid: 80967.59,

        bestAsk: 80967.61,
      }),
    );
  });

  it("ignores heartbeat messages", () => {
    const rawMessage = JSON.stringify({
      channel: "heartbeats",

      events: [
        {
          heartbeat_counter: "123",
        },
      ],
    });

    expect(parseCoinbaseTickerMessage(rawMessage)).toEqual([]);
  });

  it("ignores invalid JSON instead of crashing", () => {
    expect(parseCoinbaseTickerMessage("{ definitely-not-json")).toEqual([]);
  });

  it("ignores unsupported symbols", () => {
    const rawMessage = JSON.stringify({
      channel: "ticker",

      events: [
        {
          tickers: [
            {
              product_id: "DOGE-USD",

              price: "1",
            },
          ],
        },
      ],
    });

    expect(parseCoinbaseTickerMessage(rawMessage)).toEqual([]);
  });
});
