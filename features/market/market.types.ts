export const MARKET_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD"] as const;

export type MarketSymbol = (typeof MARKET_SYMBOLS)[number];

export type ConnectionStatus =
  "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

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

export type DataSource = "live" | "simulation";

export type ProcessingMode = "main-thread" | "web-worker";

export const SIMULATION_RATES = [100, 1_000, 5_000, 10_000] as const;

export type SimulationRate = (typeof SIMULATION_RATES)[number];

export type SymbolAnalytics = {
  symbol: MarketSymbol;

  sampleSize: number;

  meanPrice: number;

  minPrice: number;

  maxPrice: number;

  sma20: number;

  sma50: number;

  sma200: number;

  volatilityPct: number;
};

export type AnalyticsMap = Record<MarketSymbol, SymbolAnalytics | null>;

export type ProcessedMarketBatch = {
  latestTickers: MarketTicker[];

  analytics: AnalyticsMap;

  batchSize: number;

  /**
   * Pure analytics computation time.
   *
   * For Web Workers this does not include
   * messaging / structured-clone overhead.
   */
  processingDurationMs: number;
};

export type ProcessingMetrics = {
  inputEventsPerSecond: number;

  uiCommitsPerSecond: number;

  lastBatchSize: number;

  totalTickerUpdates: number;
};

export type ProcessorMetrics = {
  lastProcessingMs: number;

  averageProcessingMs: number;

  lastRoundTripMs: number;

  averageRoundTripMs: number;

  processedBatches: number;

  processedEvents: number;
};

/**
 * One-second OHLC candle.
 *
 * `time` is Unix time in seconds.
 *
 * We deliberately keep Lightweight Charts'
 * types outside our domain model.
 */
export type MarketCandle = {
  time: number;

  open: number;

  high: number;

  low: number;

  close: number;
};

export type MarketCandleMap = Record<MarketSymbol, MarketCandle[]>;

export type MarketDirection = "up" | "down" | "flat";

export type MarketActivity = {
  id: string;

  symbol: MarketSymbol;

  price: number;

  direction: MarketDirection;

  timestamp: number;
};

export type MarketVisualizationUpdate = {
  /**
   * Only the latest changed candle for
   * each symbol is emitted per RxJS batch.
   */
  candles: Partial<Record<MarketSymbol, MarketCandle>>;

  /**
   * A sampled subset of raw events.
   *
   * We intentionally do not push every one of
   * 10,000 simulated events/sec into Redux.
   */
  activity: MarketActivity[];
};

export function createEmptyTickerMap(): MarketTickerMap {
  return {
    "BTC-USD": null,
    "ETH-USD": null,
    "SOL-USD": null,
  };
}

export function createEmptyAnalyticsMap(): AnalyticsMap {
  return {
    "BTC-USD": null,
    "ETH-USD": null,
    "SOL-USD": null,
  };
}

export function createEmptyCandleMap(): MarketCandleMap {
  return {
    "BTC-USD": [],
    "ETH-USD": [],
    "SOL-USD": [],
  };
}
