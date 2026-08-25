import {
  MARKET_SYMBOLS,
  type MarketSymbol,
  type MarketTicker,
  type SimulationRate,
} from "@/features/market/market.types";

type SimulationState = {
  price: number;

  open24h: number;

  high24h: number;

  low24h: number;

  volume24h: number;
};

const INITIAL_PRICES: Record<MarketSymbol, number> = {
  "BTC-USD": 81_000,
  "ETH-USD": 2_500,
  "SOL-USD": 100,
};

export class MarketSimulator {
  private timer: ReturnType<typeof setInterval> | null = null;

  private state: Record<MarketSymbol, SimulationState> =
    this.createInitialState();

  constructor(private readonly onBatch: (batch: MarketTicker[]) => void) {}

  start(rate: SimulationRate) {
    this.stop();

    /*
     * Generate data every 50ms.
     *
     * 1000 events/sec means:
     *
     * 50 events every 50ms.
     */
    const intervalMs = 50;

    const eventsPerInterval = rate * (intervalMs / 1000);

    let eventCarry = 0;

    this.timer = setInterval(() => {
      eventCarry += eventsPerInterval;

      const eventCount = Math.floor(eventCarry);

      eventCarry -= eventCount;

      if (eventCount === 0) {
        return;
      }

      const batch: MarketTicker[] = [];

      for (let index = 0; index < eventCount; index++) {
        batch.push(this.generateTicker());
      }

      this.onBatch(batch);
    }, intervalMs);
  }

  stop() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);

    this.timer = null;
  }

  reset() {
    this.state = this.createInitialState();
  }

  private generateTicker(): MarketTicker {
    const symbol =
      MARKET_SYMBOLS[Math.floor(Math.random() * MARKET_SYMBOLS.length)];

    const market = this.state[symbol];

    /*
     * Small random price movement.
     *
     * Roughly -0.075% to +0.075%.
     */
    const priceMovement = (Math.random() - 0.5) * 0.0015;

    market.price = Math.max(0.01, market.price * (1 + priceMovement));

    market.high24h = Math.max(market.high24h, market.price);

    market.low24h = Math.min(market.low24h, market.price);

    market.volume24h += Math.random() * 10;

    const changePct = ((market.price - market.open24h) / market.open24h) * 100;

    return {
      symbol,

      price: market.price,

      priceChange24hPct: changePct,

      volume24h: market.volume24h,

      high24h: market.high24h,

      low24h: market.low24h,

      bestBid: market.price * 0.9999,

      bestAsk: market.price * 1.0001,

      updatedAt: Date.now(),
    };
  }

  private createInitialState(): Record<MarketSymbol, SimulationState> {
    return {
      "BTC-USD": createState(INITIAL_PRICES["BTC-USD"]),

      "ETH-USD": createState(INITIAL_PRICES["ETH-USD"]),

      "SOL-USD": createState(INITIAL_PRICES["SOL-USD"]),
    };
  }
}

function createState(price: number): SimulationState {
  return {
    price,

    open24h: price * 0.97,

    high24h: price,

    low24h: price,

    volume24h: Math.random() * 10_000,
  };
}
