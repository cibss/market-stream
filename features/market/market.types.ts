export const MARKET_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD"] as const;

export type MarketSymbol = (typeof MARKET_SYMBOLS)[number];

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type MarketTicker = {
  symbol: MarketSymbol;

  price: number;

  priceChange24hPct: number | null;

  volume24h: number | null;

  high24h: number | null;

  low24h: number | null;

  bestBid: number | null;

  bestAsk: number | null;

  updatedAt: number;
};

export type MarketTickerMap = Record<MarketSymbol, MarketTicker | null>;

export type ConnectionMetrics = {
  connectedAt: number | null;

  lastMessageAt: number | null;

  messagesPerSecond: number;

  totalMessages: number;

  reconnectCount: number;
};

export function createEmptyTickerMap(): MarketTickerMap {
  return {
    "BTC-USD": null,
    "ETH-USD": null,
    "SOL-USD": null,
  };
}
