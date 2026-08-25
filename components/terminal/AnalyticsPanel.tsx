import {
  MARKET_SYMBOLS,
  type AnalyticsMap,
} from "@/features/market/market.types";

const formatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function AnalyticsPanel({ analytics }: { analytics: AnalyticsMap }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">
          ROLLING ANALYTICS
        </p>

        <p className="mt-2 text-sm text-zinc-600">
          Computed from recent market samples.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="text-xs text-zinc-600">
            <tr className="border-b border-white/10">
              <th className="px-5 py-3 font-normal">Symbol</th>

              <th className="px-5 py-3 font-normal">Samples</th>

              <th className="px-5 py-3 font-normal">Mean</th>

              <th className="px-5 py-3 font-normal">SMA 20</th>

              <th className="px-5 py-3 font-normal">SMA 200</th>

              <th className="px-5 py-3 font-normal">Volatility</th>
            </tr>
          </thead>

          <tbody>
            {MARKET_SYMBOLS.map((symbol) => {
              const data = analytics[symbol];

              return (
                <tr
                  key={symbol}
                  className="border-b border-white/5 last:border-none"
                >
                  <td className="px-5 py-4 font-medium text-zinc-300">
                    {symbol}
                  </td>

                  <td className="px-5 py-4 font-mono text-zinc-500">
                    {data ? data.sampleSize.toLocaleString() : "—"}
                  </td>

                  <td className="px-5 py-4 font-mono text-zinc-400">
                    {data ? formatter.format(data.meanPrice) : "—"}
                  </td>

                  <td className="px-5 py-4 font-mono text-zinc-400">
                    {data ? formatter.format(data.sma20) : "—"}
                  </td>

                  <td className="px-5 py-4 font-mono text-zinc-400">
                    {data ? formatter.format(data.sma200) : "—"}
                  </td>

                  <td className="px-5 py-4 font-mono text-zinc-400">
                    {data ? `${data.volatilityPct.toFixed(3)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
