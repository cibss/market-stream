import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
  DataSource,
  ProcessingMetrics,
  ProcessingMode,
  ProcessorMetrics,
  SimulationRate,
} from "@/features/market/market.types";

type BenchmarkState = {
  dataSource: DataSource;

  simulationRate: SimulationRate;

  processingMode: ProcessingMode;

  processingMetrics: ProcessingMetrics;

  processorMetrics: ProcessorMetrics;
};

const initialProcessingMetrics: ProcessingMetrics = {
  inputEventsPerSecond: 0,

  uiCommitsPerSecond: 0,

  lastBatchSize: 0,

  totalTickerUpdates: 0,
};

const initialProcessorMetrics: ProcessorMetrics = {
  lastProcessingMs: 0,

  averageProcessingMs: 0,

  lastRoundTripMs: 0,

  averageRoundTripMs: 0,

  processedBatches: 0,

  processedEvents: 0,
};

const initialState: BenchmarkState = {
  dataSource: "live",

  simulationRate: 1_000,

  processingMode: "main-thread",

  processingMetrics: initialProcessingMetrics,

  processorMetrics: initialProcessorMetrics,
};

const benchmarkSlice = createSlice({
  name: "benchmark",

  initialState,

  reducers: {
    dataSourceChanged(state, action: PayloadAction<DataSource>) {
      state.dataSource = action.payload;
    },

    simulationRateChanged(state, action: PayloadAction<SimulationRate>) {
      state.simulationRate = action.payload;
    },

    processingModeChanged(state, action: PayloadAction<ProcessingMode>) {
      state.processingMode = action.payload;
    },

    processingMetricsReceived(state, action: PayloadAction<ProcessingMetrics>) {
      state.processingMetrics = action.payload;
    },

    processorBatchCompleted(
      state,
      action: PayloadAction<{
        processingDurationMs: number;

        roundTripDurationMs: number;

        batchSize: number;
      }>,
    ) {
      const previous = state.processorMetrics;

      const nextBatchCount = previous.processedBatches + 1;

      const nextAverageProcessing =
        (previous.averageProcessingMs * previous.processedBatches +
          action.payload.processingDurationMs) /
        nextBatchCount;

      const nextAverageRoundTrip =
        (previous.averageRoundTripMs * previous.processedBatches +
          action.payload.roundTripDurationMs) /
        nextBatchCount;

      state.processorMetrics = {
        lastProcessingMs: action.payload.processingDurationMs,

        averageProcessingMs: nextAverageProcessing,

        lastRoundTripMs: action.payload.roundTripDurationMs,

        averageRoundTripMs: nextAverageRoundTrip,

        processedBatches: nextBatchCount,

        processedEvents: previous.processedEvents + action.payload.batchSize,
      };
    },

    benchmarkMetricsReset(state) {
      state.processingMetrics = {
        ...initialProcessingMetrics,
      };

      state.processorMetrics = {
        ...initialProcessorMetrics,
      };
    },

    processorMetricsReset(state) {
      state.processorMetrics = {
        ...initialProcessorMetrics,
      };
    },
  },
});

export const {
  dataSourceChanged,
  simulationRateChanged,
  processingModeChanged,
  processingMetricsReceived,
  processorBatchCompleted,
  benchmarkMetricsReset,
  processorMetricsReset,
} = benchmarkSlice.actions;

export const selectDataSource = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.dataSource;

export const selectSimulationRate = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.simulationRate;

export const selectProcessingMode = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.processingMode;

export const selectProcessingMetrics = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.processingMetrics;

export const selectProcessorMetrics = (state: { benchmark: BenchmarkState }) =>
  state.benchmark.processorMetrics;

export default benchmarkSlice.reducer;
