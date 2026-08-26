"use client";

import { useEffect, useState } from "react";

import {
  BenchmarkCancelledError,
  type BenchmarkProgress,
  type PerformanceBenchmarkResult,
  PerformanceBenchmarkRunner,
} from "@/lib/benchmark/performance-benchmark-runner";
import { useAppStore } from "@/lib/store/hooks";

type BenchmarkStatus = "idle" | "running" | "completed" | "cancelled" | "error";

export function PerformanceBenchmarkPanel() {
  const store = useAppStore();

  const [runner] = useState(() => new PerformanceBenchmarkRunner(store));

  const [status, setStatus] = useState<BenchmarkStatus>("idle");

  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);

  const [results, setResults] = useState<PerformanceBenchmarkResult[]>([]);

  useEffect(() => {
    return () => {
      runner.cancel();
    };
  }, [runner]);

  const runBenchmark = async () => {
    if (status === "running") {
      return;
    }

    setStatus("running");

    setProgress(null);

    setResults([]);

    try {
      await runner.runSuite(undefined, {
        onProgress: setProgress,

        onResult: (result) => {
          setResults((current) => [...current, result]);
        },
      });

      setStatus("completed");
    } catch (error) {
      if (error instanceof BenchmarkCancelledError) {
        setStatus("cancelled");

        return;
      }

      console.error("Performance benchmark failed", error);

      setStatus("error");
    } finally {
      setProgress(null);
    }
  };

  const cancelBenchmark = () => {
    runner.cancel();
  };

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex flex-col gap-5 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">
            PERFORMANCE BENCHMARK
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Runs repeatable Main Thread vs Web Worker scenarios at 1k, 5k and 10k simulated events
            per second.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={status === "running"}
            onClick={() => void runBenchmark()}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Run Benchmark Suite
          </button>

          <button
            type="button"
            disabled={status !== "running"}
            onClick={cancelBenchmark}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="grid gap-px border-b border-white/10 bg-white/10 sm:grid-cols-3">
        <StatusMetric label="Status" value={formatStatus(status)} />

        <StatusMetric
          label="Scenario"
          value={
            progress
              ? `${progress.scenarioIndex + 1} / ${progress.scenarioCount}`
              : results.length > 0
                ? `${results.length} completed`
                : "—"
          }
        />

        <StatusMetric
          label="Phase"
          value={
            progress
              ? `${progress.phase} · ${progress.scenario.rate.toLocaleString()}/s · ${formatMode(
                  progress.scenario.processingMode,
                )}`
              : "—"
          }
        />
      </div>

      {results.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-zinc-600">
              <tr>
                <Header>Rate</Header>

                <Header>Mode</Header>

                <Header>Actual input/s</Header>

                <Header>UI commits/s</Header>

                <Header>Avg compute</Header>

                <Header>P95 compute</Header>

                <Header>Avg round trip</Header>

                <Header>P95 round trip</Header>

                <Header>Avg FPS</Header>

                <Header>Min FPS</Header>

                <Header>Max frame gap</Header>

                <Header>Long tasks</Header>
              </tr>
            </thead>

            <tbody>
              {results.map((result) => (
                <tr key={result.scenarioId} className="border-b border-white/5 last:border-none">
                  <Cell>{result.rate.toLocaleString()}/s</Cell>

                  <Cell>{formatMode(result.processingMode)}</Cell>

                  <Cell>{result.averageInputEventsPerSecond.toFixed(0)}</Cell>

                  <Cell>{result.averageUiCommitsPerSecond.toFixed(1)}</Cell>

                  <Cell>{result.averageProcessingMs.toFixed(2)} ms</Cell>

                  <Cell>{result.p95ProcessingMs.toFixed(2)} ms</Cell>

                  <Cell>{result.averageRoundTripMs.toFixed(2)} ms</Cell>

                  <Cell>{result.p95RoundTripMs.toFixed(2)} ms</Cell>

                  <Cell>{result.averageFps.toFixed(1)}</Cell>

                  <Cell>{result.minimumFps.toFixed(0)}</Cell>

                  <Cell>{result.maximumFrameGapMs.toFixed(1)} ms</Cell>

                  <Cell>{result.totalLongTasks}</Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-zinc-500">No benchmark results yet.</p>

          <p className="mt-2 text-xs text-zinc-700">
            A full suite takes approximately one minute and restores your previous terminal settings
            when complete.
          </p>
        </div>
      )}
    </section>
  );
}

function StatusMetric({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="bg-[#090b10] px-5 py-4">
      <p className="text-xs text-zinc-600">{label}</p>

      <p className="mt-2 font-mono text-sm text-zinc-300">{value}</p>
    </div>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-normal whitespace-nowrap">{children}</th>;
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 font-mono whitespace-nowrap text-zinc-400">{children}</td>;
}

function formatMode(mode: "main-thread" | "web-worker") {
  return mode === "main-thread" ? "Main Thread" : "Web Worker";
}

function formatStatus(status: BenchmarkStatus) {
  switch (status) {
    case "running":
      return "Running";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "error":
      return "Failed";

    default:
      return "Ready";
  }
}
