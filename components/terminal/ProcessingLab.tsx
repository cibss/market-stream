import {
  SIMULATION_RATES,
  type DataSource,
  type ProcessingMetrics,
  type ProcessingMode,
  type ProcessorMetrics,
  type SimulationRate,
} from "@/features/market/market.types";

import type { BrowserPerformanceMetrics } from "@/hooks/use-browser-performance";

type ProcessingLabProps = {
  dataSource: DataSource;

  simulationRate: SimulationRate;

  processingMode: ProcessingMode;

  processingMetrics: ProcessingMetrics;

  processorMetrics: ProcessorMetrics;

  browserMetrics: BrowserPerformanceMetrics;

  onSourceChange: (source: DataSource) => void;

  onRateChange: (rate: SimulationRate) => void;

  onProcessingModeChange: (mode: ProcessingMode) => void;
};

export function ProcessingLab({
  dataSource,
  simulationRate,
  processingMode,
  processingMetrics,
  processorMetrics,
  browserMetrics,
  onSourceChange,
  onRateChange,
  onProcessingModeChange,
}: ProcessingLabProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">
          PROCESSING LAB
        </p>

        <p className="mt-2 text-sm text-zinc-600">
          Compare real-time processing strategies under controlled load.
        </p>
      </div>

      <div className="grid gap-8 p-5 lg:grid-cols-3">
        <ControlGroup label="Data source">
          <ToggleButton
            active={dataSource === "live"}
            onClick={() => onSourceChange("live")}
          >
            Live Market
          </ToggleButton>

          <ToggleButton
            active={dataSource === "simulation"}
            onClick={() => onSourceChange("simulation")}
          >
            Simulation
          </ToggleButton>
        </ControlGroup>

        <ControlGroup label="Processing">
          <ToggleButton
            active={processingMode === "main-thread"}
            onClick={() => onProcessingModeChange("main-thread")}
          >
            Main Thread
          </ToggleButton>

          <ToggleButton
            active={processingMode === "web-worker"}
            onClick={() => onProcessingModeChange("web-worker")}
          >
            Web Worker
          </ToggleButton>
        </ControlGroup>

        <ControlGroup label="Simulation rate">
          <select
            disabled={dataSource !== "simulation"}
            value={simulationRate}
            onChange={(event) =>
              onRateChange(Number(event.target.value) as SimulationRate)
            }
            className="w-full rounded-lg border border-white/10 bg-[#090b10] px-3 py-2 text-sm text-zinc-300 disabled:opacity-40"
          >
            {SIMULATION_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate.toLocaleString()}
                {" events/sec"}
              </option>
            ))}
          </select>
        </ControlGroup>
      </div>

      <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-6">
        <Metric
          label="Input events / sec"
          value={processingMetrics.inputEventsPerSecond}
        />

        <Metric
          label="UI commits / sec"
          value={processingMetrics.uiCommitsPerSecond}
        />

        <Metric label="Last batch" value={processingMetrics.lastBatchSize} />

        <Metric
          label="Processing"
          value={`${processorMetrics.lastProcessingMs.toFixed(2)} ms`}
        />

        <Metric label="FPS" value={browserMetrics.fps} />

        <Metric
          label="Long tasks / sec"
          value={browserMetrics.longTasksPerSecond}
        />
      </div>
    </section>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;

  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-xs text-zinc-600">{label}</p>

      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;

  children: React.ReactNode;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm transition ${
        active
          ? "border-white/20 bg-white/10 text-white"
          : "border-white/10 text-zinc-500 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;

  value: string | number;
}) {
  return (
    <div className="bg-[#090b10] px-5 py-4">
      <p className="text-xs text-zinc-600">{label}</p>

      <p className="mt-2 font-mono text-lg font-medium text-zinc-200">
        {value}
      </p>
    </div>
  );
}
