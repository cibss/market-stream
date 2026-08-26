"use client";

import {
  type CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

import { selectCandlesForSymbol, selectTickerBySymbol } from "@/features/market/market.selectors";
import type { MarketCandle, MarketSymbol } from "@/features/market/market.types";
import { selectSelectedSymbol } from "@/features/terminal/terminal.slice";
import { useAppSelector } from "@/lib/store/hooks";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",

  currency: "USD",

  maximumFractionDigits: 2,
});

export function MarketChart() {
  const selectedSymbol = useAppSelector(selectSelectedSymbol);

  const ticker = useAppSelector((state) => selectTickerBySymbol(state, selectedSymbol) ?? null);

  const candles = useAppSelector((state) => selectCandlesForSymbol(state, selectedSymbol));

  const containerRef = useRef<HTMLDivElement | null>(null);

  const chartRef = useRef<IChartApi | null>(null);

  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const previousSymbolRef = useRef<MarketSymbol | null>(null);

  const previousFirstCandleTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,

      height: 420,

      layout: {
        background: {
          type: ColorType.Solid,

          color: "#090b10",
        },

        textColor: "#71717a",
      },

      grid: {
        vertLines: {
          color: "#18181b",
        },

        horzLines: {
          color: "#18181b",
        },
      },

      rightPriceScale: {
        borderColor: "#27272a",
      },

      timeScale: {
        borderColor: "#27272a",

        timeVisible: true,

        secondsVisible: true,

        rightOffset: 4,
      },

      crosshair: {
        vertLine: {
          color: "#52525b",

          labelBackgroundColor: "#27272a",
        },

        horzLine: {
          color: "#52525b",

          labelBackgroundColor: "#27272a",
        },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",

      downColor: "#fb7185",

      borderVisible: false,

      wickUpColor: "#34d399",

      wickDownColor: "#fb7185",

      priceLineVisible: true,

      lastValueVisible: true,
    });

    chartRef.current = chart;

    seriesRef.current = series;

    return () => {
      chart.remove();

      chartRef.current = null;

      seriesRef.current = null;

      previousSymbolRef.current = null;

      previousFirstCandleTimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;

    const series = seriesRef.current;

    if (!chart || !series) {
      return;
    }

    const symbolChanged = previousSymbolRef.current !== selectedSymbol;

    if (symbolChanged) {
      series.setData(candles.map(toChartCandle));

      chart.timeScale().fitContent();

      previousSymbolRef.current = selectedSymbol;

      previousFirstCandleTimeRef.current = candles[0]?.time ?? null;

      return;
    }

    if (candles.length === 0) {
      series.setData([]);

      previousFirstCandleTimeRef.current = null;

      return;
    }

    const firstCandleTime = candles[0].time;

    /**
     * The Redux history is capped.
     *
     * Once the oldest candle gets evicted we need
     * to synchronize the complete bounded history.
     *
     * This happens roughly once per second only
     * after the five-minute history is full.
     */
    if (
      previousFirstCandleTimeRef.current !== null &&
      previousFirstCandleTimeRef.current !== firstCandleTime
    ) {
      series.setData(candles.map(toChartCandle));

      previousFirstCandleTimeRef.current = firstCandleTime;

      return;
    }

    const latestCandle = candles.at(-1);

    if (!latestCandle) {
      return;
    }

    /**
     * Normal realtime path.
     *
     * update() changes only the latest candle
     * or appends the next candle.
     */
    series.update(toChartCandle(latestCandle));

    previousFirstCandleTimeRef.current = firstCandleTime;
  }, [candles, selectedSymbol]);

  const change = ticker?.priceChange24hPct ?? null;

  const isPositive = change !== null && change >= 0;

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#090b10]">
      <header className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-zinc-600">PRICE CHART</p>

          <div className="mt-2 flex items-baseline gap-3">
            <h2 className="text-lg font-semibold text-zinc-100">{selectedSymbol}</h2>

            <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-zinc-500">
              1-second OHLC
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-xl font-medium text-white">
            {ticker ? currencyFormatter.format(ticker.price) : "—"}
          </p>

          <p
            className={`mt-1 font-mono text-xs ${
              change === null ? "text-zinc-600" : isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {change === null
              ? "Waiting for market data"
              : `${isPositive ? "+" : ""}${change.toFixed(2)}% · 24h`}
          </p>
        </div>
      </header>

      <div ref={containerRef} className="h-[420px] w-full" />

      <footer className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-zinc-600">
        <span>{candles.length.toLocaleString()} candles retained</span>

        <span>Incremental series updates</span>
      </footer>
    </section>
  );
}

function toChartCandle(candle: MarketCandle): CandlestickData<UTCTimestamp> {
  return {
    time: candle.time as UTCTimestamp,

    open: candle.open,

    high: candle.high,

    low: candle.low,

    close: candle.close,
  };
}
