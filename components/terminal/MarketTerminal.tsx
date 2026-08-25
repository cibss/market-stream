"use client";

import { ConnectionPanel } from "./ConnectionPanel";

import { PriceCard } from "./PriceCard";
import ProcessingMetric from "./ProcessingMetric";
import { ProcessingLab } from "./ProcessingLab";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { useBrowserPerformance } from "@/hooks/use-browser-performance";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

import {
  connectRequested,
  disconnectRequested,
  selectConnectionMetrics,
  selectConnectionStatus,
} from "@/features/connection/connection.slice";

import {
  dataSourceChanged,
  processingModeChanged,
  selectDataSource,
  selectProcessingMetrics,
  selectProcessingMode,
  selectProcessorMetrics,
  selectSimulationRate,
  simulationRateChanged,
} from "@/features/benchmark/benchmark.slice";

import {
  selectAnalytics,
  selectTickerBySymbol,
} from "@/features/market/market.selectors";

import {
  MARKET_SYMBOLS,
  type MarketSymbol,
} from "@/features/market/market.types";

function ConnectedPriceCard({ symbol }: { symbol: MarketSymbol }) {
  const ticker = useAppSelector(
    (state) => selectTickerBySymbol(state, symbol) ?? null,
  );

  return <PriceCard symbol={symbol} ticker={ticker} />;
}

export function MarketTerminal() {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectConnectionStatus);

  const metrics = useAppSelector(selectConnectionMetrics);

  const dataSource = useAppSelector(selectDataSource);

  const simulationRate = useAppSelector(selectSimulationRate);

  const processingMode = useAppSelector(selectProcessingMode);

  const processingMetrics = useAppSelector(selectProcessingMetrics);

  const processorMetrics = useAppSelector(selectProcessorMetrics);

  const analytics = useAppSelector(selectAnalytics);

  const browserMetrics = useBrowserPerformance();

  const isConnected =
    status === "connected" ||
    status === "connecting" ||
    status === "reconnecting";

  return (
    <main className="min-h-screen bg-[#06080c] text-zinc-100">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              <p className="text-xs font-medium tracking-[0.22em] text-zinc-500">
                REAL-TIME SYSTEM
              </p>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              MarketStream
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              A real-time market engineering terminal built to explore streaming
              architecture, resilience, and browser performance.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isConnected}
              onClick={() => {
                dispatch(connectRequested());
              }}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Connect
            </button>

            <button
              type="button"
              disabled={!isConnected}
              onClick={() => {
                dispatch(disconnectRequested());
              }}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Disconnect
            </button>
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">
                LIVE MARKET
              </p>

              <p className="mt-1 text-sm text-zinc-600">
                Coinbase Advanced Trade market data
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-zinc-500">
              Native WebSocket
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {MARKET_SYMBOLS.map((symbol) => (
              <ConnectedPriceCard key={symbol} symbol={symbol} />
            ))}
          </div>
        </section>

        <div className="mt-6">
          <ConnectionPanel status={status} metrics={metrics} />
        </div>

        <div className="mt-6">
          <ProcessingLab
            dataSource={dataSource}
            simulationRate={simulationRate}
            processingMode={processingMode}
            processingMetrics={processingMetrics}
            processorMetrics={processorMetrics}
            browserMetrics={browserMetrics}
            onSourceChange={(source) => {
              dispatch(dataSourceChanged(source));
            }}
            onRateChange={(rate) => {
              dispatch(simulationRateChanged(rate));
            }}
            onProcessingModeChange={(mode) => {
              dispatch(processingModeChanged(mode));
            }}
          />
        </div>

        <div className="mt-6">
          <AnalyticsPanel analytics={analytics} />
        </div>

        <section className="mt-4 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
          <ProcessingMetric
            label="UI commits / sec"
            value={processingMetrics.uiCommitsPerSecond}
          />

          <ProcessingMetric
            label="Last batch size"
            value={processingMetrics.lastBatchSize}
          />

          <ProcessingMetric
            label="Ticker updates processed"
            value={processingMetrics.totalTickerUpdates.toLocaleString()}
          />
        </section>

        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            CURRENT ARCHITECTURE
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-sm">
            <ArchitectureNode>Market Source</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>Edge Relay</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>RxJS</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>Worker</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>React</ArchitectureNode>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-zinc-600">
            This is intentionally the baseline architecture. In the next
            milestones we will measure its limitations before adding RxJS
            batching, Redux Toolkit, and Web Workers.
          </p>
        </section>
      </div>
    </main>
  );
}

function ArchitectureNode({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-300">
      {children}
    </span>
  );
}

function Arrow() {
  return <span className="text-zinc-700">→</span>;
}
