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
import type { ProcessingMode, SimulationRate } from "@/features/market/market.types";
import type { AppStore } from "@/lib/store/store";

type RunnerStore = Pick<AppStore, "dispatch" | "getState" | "subscribe">;

export type BenchmarkScenario = {
  id: string;

  rate: SimulationRate;

  processingMode: ProcessingMode;

  warmupMs: number;

  durationMs: number;
};

export type BenchmarkPhase = "warmup" | "measuring";

export type BenchmarkProgress = {
  scenarioIndex: number;

  scenarioCount: number;

  scenario: BenchmarkScenario;

  phase: BenchmarkPhase;
};

export type PerformanceBenchmarkResult = {
  scenarioId: string;

  rate: SimulationRate;

  processingMode: ProcessingMode;

  durationMs: number;

  averageInputEventsPerSecond: number;

  averageUiCommitsPerSecond: number;

  averageProcessingMs: number;

  p95ProcessingMs: number;

  averageRoundTripMs: number;

  p95RoundTripMs: number;

  averageFps: number;

  minimumFps: number;

  maximumFrameGapMs: number;

  totalLongTasks: number;

  maximumLongTaskMs: number;

  processedBatchSamples: number;
};

type RunSuiteOptions = {
  onProgress?: (progress: BenchmarkProgress) => void;

  onResult?: (result: PerformanceBenchmarkResult) => void;
};

export const DEFAULT_BENCHMARK_SCENARIOS: BenchmarkScenario[] = [
  createScenario(1_000, "main-thread"),
  createScenario(1_000, "web-worker"),
  createScenario(5_000, "main-thread"),
  createScenario(5_000, "web-worker"),
  createScenario(10_000, "main-thread"),
  createScenario(10_000, "web-worker"),
];

export class BenchmarkCancelledError extends Error {
  constructor() {
    super("Benchmark cancelled");

    this.name = "BenchmarkCancelledError";
  }
}

export class PerformanceBenchmarkRunner {
  private cancelled = false;

  constructor(private readonly store: RunnerStore) {}

  cancel() {
    this.cancelled = true;
  }

  async runSuite(
    scenarios: BenchmarkScenario[] = DEFAULT_BENCHMARK_SCENARIOS,
    options: RunSuiteOptions = {},
  ): Promise<PerformanceBenchmarkResult[]> {
    this.cancelled = false;

    const initialState = this.store.getState();

    const originalSource = selectDataSource(initialState);

    const originalRate = selectSimulationRate(initialState);

    const originalMode = selectProcessingMode(initialState);

    const results: PerformanceBenchmarkResult[] = [];

    try {
      /**
       * All repeatable performance measurements
       * use our deterministic simulation source.
       */
      this.store.dispatch(dataSourceChanged("simulation"));

      for (let index = 0; index < scenarios.length; index += 1) {
        this.assertNotCancelled();

        const scenario = scenarios[index];

        /**
         * Changing either of these also resets
         * benchmark metrics through Redux listener
         * middleware.
         */
        this.store.dispatch(processingModeChanged(scenario.processingMode));

        this.store.dispatch(simulationRateChanged(scenario.rate));

        options.onProgress?.({
          scenarioIndex: index,
          scenarioCount: scenarios.length,
          scenario,
          phase: "warmup",
        });

        await this.wait(scenario.warmupMs);

        this.assertNotCancelled();

        options.onProgress?.({
          scenarioIndex: index,
          scenarioCount: scenarios.length,
          scenario,
          phase: "measuring",
        });

        const result = await this.measureScenario(scenario);

        results.push(result);

        options.onResult?.(result);
      }

      return results;
    } finally {
      /**
       * Benchmarking must not permanently change
       * the user's terminal configuration.
       */
      this.store.dispatch(processingModeChanged(originalMode));

      this.store.dispatch(simulationRateChanged(originalRate));

      this.store.dispatch(dataSourceChanged(originalSource));
    }
  }

  private async measureScenario(scenario: BenchmarkScenario): Promise<PerformanceBenchmarkResult> {
    const inputSamples: number[] = [];

    const commitSamples: number[] = [];

    const processingSamples: number[] = [];

    const roundTripSamples: number[] = [];

    const frameSampler = new FramePerformanceSampler();

    let lastProcessedBatchCount = selectProcessorMetrics(this.store.getState()).processedBatches;

    /**
     * Redux updates processor metrics once for
     * every processed RxJS batch.
     *
     * Observe that counter so we can retain
     * individual latency samples for percentile
     * calculations.
     */
    const unsubscribe = this.store.subscribe(() => {
      const processorMetrics = selectProcessorMetrics(this.store.getState());

      if (processorMetrics.processedBatches === lastProcessedBatchCount) {
        return;
      }

      lastProcessedBatchCount = processorMetrics.processedBatches;

      processingSamples.push(processorMetrics.lastProcessingMs);

      roundTripSamples.push(processorMetrics.lastRoundTripMs);
    });

    const metricsTimer = window.setInterval(() => {
      const metrics = selectProcessingMetrics(this.store.getState());

      inputSamples.push(metrics.inputEventsPerSecond);

      commitSamples.push(metrics.uiCommitsPerSecond);
    }, 1_000);

    frameSampler.start();

    try {
      await this.wait(scenario.durationMs);
    } finally {
      window.clearInterval(metricsTimer);

      unsubscribe();
    }

    const frameMetrics = frameSampler.stop();

    return {
      scenarioId: scenario.id,

      rate: scenario.rate,

      processingMode: scenario.processingMode,

      durationMs: scenario.durationMs,

      averageInputEventsPerSecond: average(inputSamples),

      averageUiCommitsPerSecond: average(commitSamples),

      averageProcessingMs: average(processingSamples),

      p95ProcessingMs: percentile(processingSamples, 95),

      averageRoundTripMs: average(roundTripSamples),

      p95RoundTripMs: percentile(roundTripSamples, 95),

      averageFps: frameMetrics.averageFps,

      minimumFps: frameMetrics.minimumFps,

      maximumFrameGapMs: frameMetrics.maximumFrameGapMs,

      totalLongTasks: frameMetrics.totalLongTasks,

      maximumLongTaskMs: frameMetrics.maximumLongTaskMs,

      processedBatchSamples: roundTripSamples.length,
    };
  }

  private async wait(durationMs: number) {
    const endingAt = performance.now() + durationMs;

    while (performance.now() < endingAt) {
      this.assertNotCancelled();

      const remainingMs = endingAt - performance.now();

      await delay(Math.min(100, Math.max(0, remainingMs)));
    }

    this.assertNotCancelled();
  }

  private assertNotCancelled() {
    if (this.cancelled) {
      throw new BenchmarkCancelledError();
    }
  }
}

type FrameMetrics = {
  averageFps: number;

  minimumFps: number;

  maximumFrameGapMs: number;

  totalLongTasks: number;

  maximumLongTaskMs: number;
};

class FramePerformanceSampler {
  private animationFrameId: number | null = null;

  private startedAt = 0;

  private frameTimestamps: number[] = [];

  private longTaskDurations: number[] = [];

  private observer: PerformanceObserver | null = null;

  start() {
    this.startedAt = performance.now();

    this.frameTimestamps = [];

    this.longTaskDurations = [];

    const measureFrame = (timestamp: number) => {
      this.frameTimestamps.push(timestamp);

      this.animationFrameId = requestAnimationFrame(measureFrame);
    };

    this.animationFrameId = requestAnimationFrame(measureFrame);

    if (!("PerformanceObserver" in window)) {
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTaskDurations.push(entry.duration);
        }
      });

      this.observer.observe({
        type: "longtask",
        buffered: false,
      });
    } catch {
      this.observer = null;
    }
  }

  stop(): FrameMetrics {
    const endedAt = performance.now();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);

      this.animationFrameId = null;
    }

    this.observer?.disconnect();

    this.observer = null;

    const elapsedMs = Math.max(1, endedAt - this.startedAt);

    const averageFps = (this.frameTimestamps.length * 1_000) / elapsedMs;

    const fullSecondCount = Math.floor(elapsedMs / 1_000);

    const framesPerSecond = Array.from({
      length: fullSecondCount,
    }).map((_, secondIndex) => {
      const bucketStart = this.startedAt + secondIndex * 1_000;

      const bucketEnd = bucketStart + 1_000;

      return this.frameTimestamps.filter(
        (timestamp) => timestamp >= bucketStart && timestamp < bucketEnd,
      ).length;
    });

    let maximumFrameGapMs = 0;

    for (let index = 1; index < this.frameTimestamps.length; index += 1) {
      maximumFrameGapMs = Math.max(
        maximumFrameGapMs,
        this.frameTimestamps[index] - this.frameTimestamps[index - 1],
      );
    }

    return {
      averageFps,

      minimumFps: framesPerSecond.length > 0 ? Math.min(...framesPerSecond) : averageFps,

      maximumFrameGapMs,

      totalLongTasks: this.longTaskDurations.length,

      maximumLongTaskMs:
        this.longTaskDurations.length > 0 ? Math.max(...this.longTaskDurations) : 0,
    };
  }
}

function createScenario(rate: SimulationRate, processingMode: ProcessingMode): BenchmarkScenario {
  return {
    id: `${rate}-${processingMode}`,

    rate,

    processingMode,

    /**
     * Build representative analytics history
     * before capturing measurements.
     */
    warmupMs: 2_000,

    durationMs: 8_000,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);

  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;

  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function delay(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}
