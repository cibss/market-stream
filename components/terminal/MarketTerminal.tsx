"use client";

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
  connectRequested,
  disconnectRequested,
  selectConnectionMetrics,
  selectConnectionStatus,
} from "@/features/connection/connection.slice";
import { selectAnalytics } from "@/features/market/market.selectors";
import { useBrowserPerformance } from "@/hooks/use-browser-performance";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

import { ActivityFeed } from "./ActivityFeed";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { ConnectionPanel } from "./ConnectionPanel";
import { MarketChart } from "./MarketChart";
import { ProcessingLab } from "./ProcessingLab";
import { Watchlist } from "./Watchlist";

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

  const isConnectionActive =
    status === "connected" || status === "connecting" || status === "reconnecting";

  return (
    <main className="bg-[#06080c] text-zinc-100">
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
              A high-performance real-time market terminal exploring streaming architecture, browser
              concurrency, resilience and rendering performance.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={dataSource !== "live" || isConnectionActive}
              onClick={() => {
                dispatch(connectRequested());
              }}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Connect
            </button>

            <button
              type="button"
              disabled={dataSource !== "live" || !isConnectionActive}
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
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">
                {dataSource === "live" ? "LIVE MARKET" : "SIMULATED MARKET"}
              </p>

              <p className="mt-1 text-sm text-zinc-600">
                {dataSource === "live"
                  ? "Coinbase Advanced Trade via MarketStream Edge Relay"
                  : `${simulationRate.toLocaleString()} controlled events per second`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <TechnologyBadge>RxJS</TechnologyBadge>

              <TechnologyBadge>
                {processingMode === "web-worker" ? "Web Worker" : "Main Thread"}
              </TechnologyBadge>

              <TechnologyBadge>Redux Toolkit</TechnologyBadge>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
            <Watchlist />

            <MarketChart />

            <ActivityFeed />
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

        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            CURRENT ARCHITECTURE
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-xs">
            <ArchitectureNode>Market Source</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>Edge Relay</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>WebSocket</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>RxJS</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>Processor</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>Redux</ArchitectureNode>

            <Arrow />

            <ArchitectureNode>Virtualized UI</ArchitectureNode>
          </div>

          <p className="mt-5 max-w-4xl text-sm leading-6 text-zinc-600">
            High-frequency events are normalized outside React, batched through RxJS, optionally
            processed in a Web Worker, committed into bounded Redux state, and rendered through
            incremental chart updates and a virtualized activity feed.
          </p>
        </section>
      </div>
    </main>
  );
}

function TechnologyBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] text-zinc-500">
      {children}
    </span>
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
