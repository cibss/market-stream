import {
  MARKET_SYMBOLS,
  type MarketActivity,
  type MarketCandle,
  type MarketDirection,
  type MarketSymbol,
  type MarketTicker,
  type MarketVisualizationUpdate,
} from "@/features/market/market.types";

const MAX_ACTIVITY_PER_BATCH = 30;

export class MarketVisualizationEngine {
  private currentCandles: Partial<Record<MarketSymbol, MarketCandle>> = {};

  private lastPrices: Partial<Record<MarketSymbol, number>> = {};

  private activitySequence = 0;

  reset() {
    this.currentCandles = {};

    this.lastPrices = {};

    this.activitySequence = 0;
  }

  process(batch: MarketTicker[]): MarketVisualizationUpdate {
    const changedCandles: Partial<Record<MarketSymbol, MarketCandle>> = {};

    const activity: MarketActivity[] = [];

    /**
     * At high simulation rates one RxJS batch
     * may contain hundreds or thousands of events.
     *
     * Rendering all of them would simply move
     * our firehose problem into Redux/React.
     *
     * Sample at most ~30 entries per batch.
     */
    const sampleStride = Math.max(1, Math.ceil(batch.length / MAX_ACTIVITY_PER_BATCH));

    for (let index = 0; index < batch.length; index += 1) {
      const ticker = batch[index];

      const direction = this.getDirection(ticker.symbol, ticker.price);

      this.lastPrices[ticker.symbol] = ticker.price;

      const candle = this.updateCandle(ticker);

      changedCandles[ticker.symbol] = candle;

      if (index % sampleStride === 0 && activity.length < MAX_ACTIVITY_PER_BATCH) {
        activity.push(this.createActivity(ticker, direction));
      }
    }

    /**
     * Activity feed is newest-first.
     */
    activity.reverse();

    return {
      candles: changedCandles,

      activity,
    };
  }

  private updateCandle(ticker: MarketTicker): MarketCandle {
    const bucketTime = Math.floor(ticker.updatedAt / 1_000);

    const current = this.currentCandles[ticker.symbol];

    if (!current || current.time !== bucketTime) {
      const next: MarketCandle = {
        time: bucketTime,

        open: ticker.price,

        high: ticker.price,

        low: ticker.price,

        close: ticker.price,
      };

      this.currentCandles[ticker.symbol] = next;

      return next;
    }

    const next: MarketCandle = {
      ...current,

      high: Math.max(current.high, ticker.price),

      low: Math.min(current.low, ticker.price),

      close: ticker.price,
    };

    this.currentCandles[ticker.symbol] = next;

    return next;
  }

  private getDirection(symbol: MarketSymbol, price: number): MarketDirection {
    const previousPrice = this.lastPrices[symbol];

    if (previousPrice === undefined || previousPrice === price) {
      return "flat";
    }

    return price > previousPrice ? "up" : "down";
  }

  private createActivity(ticker: MarketTicker, direction: MarketDirection): MarketActivity {
    this.activitySequence += 1;

    return {
      id: `${ticker.symbol}-${ticker.updatedAt}-${this.activitySequence}`,

      symbol: ticker.symbol,

      price: ticker.price,

      direction,

      timestamp: ticker.updatedAt,
    };
  }
}

/**
 * Used by tests and future visualization
 * features without duplicating domain knowledge.
 */
export function isTrackedMarketSymbol(value: string): value is MarketSymbol {
  return (MARKET_SYMBOLS as readonly string[]).includes(value);
}
