import {
  MARKET_SYMBOLS,
  type MarketSymbol,
  type MarketTicker,
} from "@/features/market/market.types";

export const COINBASE_MARKET_WS_URL =
  "wss://market-stream-gateway.market-stream-gateway.workers.dev";

export function createTickerSubscription(symbols: readonly MarketSymbol[]) {
  return JSON.stringify({
    type: "subscribe",
    channel: "ticker",
    product_ids: symbols,
  });
}

export function createHeartbeatSubscription() {
  return JSON.stringify({
    type: "subscribe",
    channel: "heartbeats",
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMarketSymbol(value: unknown): value is MarketSymbol {
  return typeof value === "string" && (MARKET_SYMBOLS as readonly string[]).includes(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  if (value === "") {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : null;
}

export function parseCoinbaseTickerMessage(rawMessage: string): MarketTicker[] {
  let payload: unknown;

  try {
    payload = JSON.parse(rawMessage);
  } catch {
    return [];
  }

  if (!isRecord(payload)) {
    return [];
  }

  // Heartbeats, subscription confirmations,
  // and unknown message types are intentionally ignored.
  if (payload.channel !== "ticker") {
    return [];
  }

  if (!Array.isArray(payload.events)) {
    return [];
  }

  const tickers: MarketTicker[] = [];

  for (const event of payload.events) {
    if (!isRecord(event)) {
      continue;
    }

    if (!Array.isArray(event.tickers)) {
      continue;
    }

    for (const ticker of event.tickers) {
      if (!isRecord(ticker)) {
        continue;
      }

      if (!isMarketSymbol(ticker.product_id)) {
        continue;
      }

      const price = toNumber(ticker.price);

      if (price === null) {
        continue;
      }

      const timestamp =
        typeof payload.timestamp === "string" ? Date.parse(payload.timestamp) : Date.now();

      tickers.push({
        symbol: ticker.product_id,

        price,

        priceChange24hPct: toNumber(ticker.price_percent_chg_24_h),

        volume24h: toNumber(ticker.volume_24_h),

        high24h: toNumber(ticker.high_24_h),

        low24h: toNumber(ticker.low_24_h),

        bestBid: toNumber(ticker.best_bid),

        bestAsk: toNumber(ticker.best_ask),

        updatedAt: Number.isNaN(timestamp) ? Date.now() : timestamp,
      });
    }
  }

  return tickers;
}
