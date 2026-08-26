"use client";

import { selectTickerBySymbol } from "@/features/market/market.selectors";
import { MARKET_SYMBOLS, type MarketSymbol } from "@/features/market/market.types";
import { selectedSymbolChanged, selectSelectedSymbol } from "@/features/terminal/terminal.slice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",

  currency: "USD",

  maximumFractionDigits: 2,
});

export function Watchlist() {
  const selectedSymbol = useAppSelector(selectSelectedSymbol);

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">WATCHLIST</p>
      </div>

      <div>
        {MARKET_SYMBOLS.map((symbol) => (
          <WatchlistRow key={symbol} symbol={symbol} selected={selectedSymbol === symbol} />
        ))}
      </div>
    </section>
  );
}

function WatchlistRow({
  symbol,
  selected,
}: {
  symbol: MarketSymbol;

  selected: boolean;
}) {
  const dispatch = useAppDispatch();

  const ticker = useAppSelector((state) => selectTickerBySymbol(state, symbol) ?? null);

  const change = ticker?.priceChange24hPct ?? null;

  const isPositive = change !== null && change >= 0;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        dispatch(selectedSymbolChanged(symbol));
      }}
      className={`flex w-full items-center justify-between border-b border-white/5 px-4 py-4 text-left transition last:border-none ${
        selected ? "bg-white/[0.07]" : "hover:bg-white/[0.03]"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-zinc-200">{symbol}</p>

        <p className="mt-1 text-xs text-zinc-600">
          {symbol.startsWith("BTC") ? "Bitcoin" : symbol.startsWith("ETH") ? "Ethereum" : "Solana"}
        </p>
      </div>

      <div className="text-right">
        <p className="font-mono text-sm text-zinc-300">
          {ticker ? currencyFormatter.format(ticker.price) : "—"}
        </p>

        <p
          className={`mt-1 font-mono text-xs ${
            change === null ? "text-zinc-600" : isPositive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {change === null ? "Waiting" : `${isPositive ? "+" : ""}${change.toFixed(2)}%`}
        </p>
      </div>
    </button>
  );
}
