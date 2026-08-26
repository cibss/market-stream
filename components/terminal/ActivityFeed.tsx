"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import { selectMarketActivity } from "@/features/market/market.selectors";
import type { MarketActivity } from "@/features/market/market.types";
import { useAppSelector } from "@/lib/store/hooks";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function ActivityFeed() {
  /**
   * TanStack Virtual currently uses an internal
   * mutable Virtualizer instance that React Compiler
   * cannot memoize safely.
   *
   * Keep this component outside compiler optimization
   * until TanStack Virtual provides full compiler
   * compatibility.
   *
   * This does NOT disable normal React rendering
   * or TanStack Virtual's virtualization behaviour.
   */
  "use no memo";

  const activity = useAppSelector(selectMarketActivity);

  const scrollElementRef = useRef<HTMLDivElement | null>(null);

  /**
   * TanStack Virtual currently triggers
   * react-hooks/incompatible-library because its
   * Virtualizer instance has interior mutable state.
   *
   * This warning is intentionally scoped only to
   * this third-party integration.
   */
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: activity.length,

    getScrollElement: () => scrollElementRef.current,

    estimateSize: () => 52,

    overscan: 8,

    /**
     * Recommended for React 19 when synchronous
     * flushes are unnecessary.
     */
    useFlushSync: false,

    getItemKey: (index) => activity[index]?.id ?? index,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">MARKET ACTIVITY</p>

          <p className="mt-1 text-xs text-zinc-700">Sampled realtime events</p>
        </div>

        <div className="text-right">
          <p className="font-mono text-xs text-zinc-500">{activity.length.toLocaleString()}</p>

          <p className="mt-1 text-[10px] text-zinc-700">stored</p>
        </div>
      </header>

      <div ref={scrollElementRef} className="h-[420px] overflow-auto">
        {activity.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-zinc-600">Waiting for market activity...</p>
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
            }}
          >
            {virtualItems.map((virtualItem) => {
              const item = activity[virtualItem.index];

              if (!item) {
                return null;
              }

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ActivityRow item={item} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[10px] text-zinc-700">
        <span>Virtualized DOM</span>

        <span>{virtualItems.length} rows rendered</span>
      </footer>
    </section>
  );
}

function ActivityRow({ item }: { item: MarketActivity }) {
  const directionSymbol = item.direction === "up" ? "↑" : item.direction === "down" ? "↓" : "·";

  const directionClass =
    item.direction === "up"
      ? "text-emerald-400"
      : item.direction === "down"
        ? "text-rose-400"
        : "text-zinc-500";

  return (
    <div className="flex h-[52px] items-center justify-between border-b border-white/5 px-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`w-3 shrink-0 font-mono text-xs ${directionClass}`}>
          {directionSymbol}
        </span>

        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-zinc-300">{item.symbol}</p>

          <p className="mt-1 text-[10px] text-zinc-700">{formatTimestamp(item.timestamp)}</p>
        </div>
      </div>

      <p className="ml-3 font-mono text-xs text-zinc-400">{currencyFormatter.format(item.price)}</p>
    </div>
  );
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 2,
  });
}
