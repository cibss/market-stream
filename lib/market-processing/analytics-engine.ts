import {
  MARKET_SYMBOLS,
  createEmptyAnalyticsMap,
  type MarketSymbol,
  type MarketTicker,
  type ProcessedMarketBatch,
} from "@/features/market/market.types";

const MAX_HISTORY = 20_000;

export class MarketAnalyticsEngine {
  private history: Record<MarketSymbol, number[]> = {
    "BTC-USD": [],
    "ETH-USD": [],
    "SOL-USD": [],
  };

  reset() {
    this.history = {
      "BTC-USD": [],
      "ETH-USD": [],
      "SOL-USD": [],
    };
  }

  process(batch: MarketTicker[]): ProcessedMarketBatch {
    const startedAt = performance.now();

    const latestTickers: Partial<Record<MarketSymbol, MarketTicker>> = {};

    /*
     * Update rolling price history.
     */
    for (const ticker of batch) {
      latestTickers[ticker.symbol] = ticker;

      const prices = this.history[ticker.symbol];

      prices.push(ticker.price);

      if (prices.length > MAX_HISTORY) {
        prices.splice(0, prices.length - MAX_HISTORY);
      }
    }

    const analytics = createEmptyAnalyticsMap();

    /*
     * Compute rolling statistics
     * for each tracked symbol.
     */
    for (const symbol of MARKET_SYMBOLS) {
      const prices = this.history[symbol];

      if (prices.length === 0) {
        continue;
      }

      analytics[symbol] = calculateAnalytics(symbol, prices);
    }

    const resultTickers = MARKET_SYMBOLS.map(
      (symbol) => latestTickers[symbol],
    ).filter((ticker): ticker is MarketTicker => ticker !== undefined);

    return {
      latestTickers: resultTickers,

      analytics,

      batchSize: batch.length,

      processingDurationMs: performance.now() - startedAt,
    };
  }
}

function calculateAnalytics(symbol: MarketSymbol, prices: number[]) {
  let sum = 0;

  let min = Number.POSITIVE_INFINITY;

  let max = Number.NEGATIVE_INFINITY;

  for (const price of prices) {
    sum += price;

    if (price < min) {
      min = price;
    }

    if (price > max) {
      max = price;
    }
  }

  const mean = sum / prices.length;

  let squaredDifferenceSum = 0;

  for (const price of prices) {
    const difference = price - mean;

    squaredDifferenceSum += difference * difference;
  }

  const standardDeviation = Math.sqrt(squaredDifferenceSum / prices.length);

  const volatilityPct = mean === 0 ? 0 : (standardDeviation / mean) * 100;

  return {
    symbol,

    sampleSize: prices.length,

    meanPrice: mean,

    minPrice: min,

    maxPrice: max,

    sma20: calculateSma(prices, 20),

    sma50: calculateSma(prices, 50),

    sma200: calculateSma(prices, 200),

    volatilityPct,
  };
}

function calculateSma(prices: number[], period: number) {
  const startIndex = Math.max(0, prices.length - period);

  let sum = 0;

  for (let index = startIndex; index < prices.length; index++) {
    sum += prices[index];
  }

  const sampleSize = prices.length - startIndex;

  return sampleSize > 0 ? sum / sampleSize : 0;
}
