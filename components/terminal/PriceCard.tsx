import type { MarketSymbol, MarketTicker } from "@/features/market/market.types";

type PriceCardProps = {
  symbol: MarketSymbol;
  ticker: MarketTicker | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function PriceCard({ symbol, ticker }: PriceCardProps) {
  const change = ticker?.priceChange24hPct;

  const isPositive = change !== null && change !== undefined && change >= 0;

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">MARKET</p>

          <h2 className="mt-2 text-lg font-semibold text-zinc-100">{symbol}</h2>
        </div>

        <div className="text-right">
          <p className="font-mono text-xl font-semibold text-white">
            {ticker ? currencyFormatter.format(ticker.price) : "—"}
          </p>

          {change !== null && change !== undefined ? (
            <p className={`mt-1 text-sm ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositive ? "+" : ""}
              {change.toFixed(2)}%{"  "}
              <span className="text-zinc-600">24h</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-600">Waiting for market data</p>
          )}
        </div>
      </div>

      {ticker && (
        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/10 pt-4 text-sm">
          <Metric
            label="24h High"
            value={ticker.high24h !== null ? currencyFormatter.format(ticker.high24h) : "—"}
          />

          <Metric
            label="24h Low"
            value={ticker.low24h !== null ? currencyFormatter.format(ticker.low24h) : "—"}
          />

          <Metric
            label="Best Bid"
            value={ticker.bestBid !== null ? currencyFormatter.format(ticker.bestBid) : "—"}
          />

          <Metric
            label="Volume"
            value={ticker.volume24h !== null ? numberFormatter.format(ticker.volume24h) : "—"}
          />
        </dl>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-600">{label}</dt>

      <dd className="mt-1 font-mono text-zinc-300">{value}</dd>
    </div>
  );
}
