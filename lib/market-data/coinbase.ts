import {
  MARKET_SYMBOLS,
  type MarketSymbol,
  type MarketTicker,
} from "@/features/market/market.types";
import { env } from "@/lib/config/env";

type CoinbaseTicker = {
  product_id?: string;

  price?: string;

  price_percent_chg_24_h?: string;

  volume_24_h?: string;

  high_24_h?: string;

  low_24_h?: string;

  best_bid?: string;

  best_ask?: string;
};

type CoinbaseEvent = {
  type?: string;

  tickers?: CoinbaseTicker[];
};

type CoinbaseMessage = {
  channel?: string;

  timestamp?: string;

  events?: CoinbaseEvent[];
};

export const COINBASE_MARKET_WS_URL = env.marketWebSocketUrl;

export function createTickerSubscription(symbols: readonly MarketSymbol[]) {
  return JSON.stringify({
    type: "subscribe",

    product_ids: symbols,

    channel: "ticker",
  });
}

export function createHeartbeatSubscription() {
  return JSON.stringify({
    type: "subscribe",

    channel: "heartbeats",
  });
}

export function parseCoinbaseTickerMessage(message: string): MarketTicker[] {
  let payload: CoinbaseMessage;

  try {
    payload = JSON.parse(message) as CoinbaseMessage;
  } catch {
    return [];
  }

  if (payload.channel !== "ticker") {
    return [];
  }

  if (!Array.isArray(payload.events)) {
    return [];
  }

  const updatedAt = parseTimestamp(payload.timestamp);

  const tickers: MarketTicker[] = [];

  for (const event of payload.events) {
    if (!Array.isArray(event.tickers)) {
      continue;
    }

    for (const ticker of event.tickers) {
      const symbol = ticker.product_id;

      if (!isTrackedSymbol(symbol)) {
        continue;
      }

      const price = toRequiredNumber(ticker.price);

      if (price === null) {
        continue;
      }

      tickers.push({
        symbol,

        price,

        priceChange24hPct: toNullableNumber(ticker.price_percent_chg_24_h),

        volume24h: toNullableNumber(ticker.volume_24_h),

        high24h: toNullableNumber(ticker.high_24_h),

        low24h: toNullableNumber(ticker.low_24_h),

        bestBid: toNullableNumber(ticker.best_bid),

        bestAsk: toNullableNumber(ticker.best_ask),

        updatedAt,
      });
    }
  }

  return tickers;
}

function isTrackedSymbol(value: string | undefined): value is MarketSymbol {
  if (!value) {
    return false;
  }

  return (MARKET_SYMBOLS as readonly string[]).includes(value);
}

function toRequiredNumber(value: string | undefined) {
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableNumber(value: string | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimestamp(value: string | undefined) {
  if (!value) {
    return Date.now();
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? Date.now() : parsed;
}
