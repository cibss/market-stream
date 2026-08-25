import {
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from "@reduxjs/toolkit";

import marketReducer, {
  marketAnalyticsReset,
  marketReset,
} from "@/features/market/market.slice";

import connectionReducer, {
  connectionMetricsReset,
} from "@/features/connection/connection.slice";

import benchmarkReducer, {
  benchmarkMetricsReset,
  dataSourceChanged,
  processingModeChanged,
  simulationRateChanged,
} from "@/features/benchmark/benchmark.slice";

const listenerMiddleware = createListenerMiddleware();

export const makeStore = () =>
  configureStore({
    reducer: {
      market: marketReducer,

      connection: connectionReducer,

      benchmark: benchmarkReducer,
    },

    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),

    devTools: process.env.NODE_ENV !== "production",
  });

export type AppStore = ReturnType<typeof makeStore>;

export type RootState = ReturnType<AppStore["getState"]>;

export type AppDispatch = AppStore["dispatch"];

const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

/*
 * When benchmark configuration
 * changes, previous processor
 * measurements are no longer
 * comparable.
 */
startAppListening({
  matcher: isAnyOf(
    dataSourceChanged,
    simulationRateChanged,
    processingModeChanged,
  ),

  effect: (action, listenerApi) => {
    listenerApi.dispatch(benchmarkMetricsReset());

    listenerApi.dispatch(marketAnalyticsReset());

    /*
     * Switching between live
     * and simulated data should
     * not leave stale prices
     * from the previous source.
     */
    if (dataSourceChanged.match(action)) {
      listenerApi.dispatch(marketReset());

      listenerApi.dispatch(connectionMetricsReset());
    }
  },
});
