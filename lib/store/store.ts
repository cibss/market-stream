import { configureStore, createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";

import benchmarkReducer, {
  benchmarkMetricsReset,
  dataSourceChanged,
  processingModeChanged,
  simulationRateChanged,
} from "@/features/benchmark/benchmark.slice";
import connectionReducer, { connectionMetricsReset } from "@/features/connection/connection.slice";
import marketReducer, {
  marketAnalyticsReset,
  marketReset,
  marketVisualizationReset,
} from "@/features/market/market.slice";
import reliabilityReducer from "@/features/reliability/reliability.slice";
import terminalReducer from "@/features/terminal/terminal.slice";

const listenerMiddleware = createListenerMiddleware();

export const makeStore = () =>
  configureStore({
    reducer: {
      market: marketReducer,

      connection: connectionReducer,

      benchmark: benchmarkReducer,

      reliability: reliabilityReducer,

      terminal: terminalReducer,
    },

    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),

    devTools: process.env.NODE_ENV !== "production",
  });

export type AppStore = ReturnType<typeof makeStore>;

export type RootState = ReturnType<AppStore["getState"]>;

export type AppDispatch = AppStore["dispatch"];

const startAppListening = listenerMiddleware.startListening.withTypes<RootState, AppDispatch>();

startAppListening({
  matcher: isAnyOf(dataSourceChanged, simulationRateChanged, processingModeChanged),

  effect: (action, listenerApi) => {
    listenerApi.dispatch(benchmarkMetricsReset());

    listenerApi.dispatch(marketAnalyticsReset());

    if (dataSourceChanged.match(action)) {
      listenerApi.dispatch(marketReset());

      listenerApi.dispatch(connectionMetricsReset());

      return;
    }

    if (simulationRateChanged.match(action)) {
      listenerApi.dispatch(marketVisualizationReset());
    }
  },
});
