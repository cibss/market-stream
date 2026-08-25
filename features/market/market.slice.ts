import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import {
  createEmptyAnalyticsMap,
  type AnalyticsMap,
  type MarketSymbol,
  type MarketTicker,
  type ProcessedMarketBatch,
} from "./market.types";

export const marketAdapter = createEntityAdapter<MarketTicker, MarketSymbol>({
  selectId: (ticker) => ticker.symbol,
});

const initialState = marketAdapter.getInitialState({
  analytics: createEmptyAnalyticsMap(),
});

const marketSlice = createSlice({
  name: "market",

  initialState,

  reducers: {
    marketBatchProcessed(state, action: PayloadAction<ProcessedMarketBatch>) {
      marketAdapter.upsertMany(state, action.payload.latestTickers);

      state.analytics = action.payload.analytics;
    },

    marketReset(state) {
      marketAdapter.removeAll(state);

      state.analytics = createEmptyAnalyticsMap();
    },

    marketAnalyticsReset(state) {
      state.analytics = createEmptyAnalyticsMap();
    },

    analyticsReplaced(state, action: PayloadAction<AnalyticsMap>) {
      state.analytics = action.payload;
    },
  },
});

export const {
  marketBatchProcessed,
  marketReset,
  marketAnalyticsReset,
  analyticsReplaced,
} = marketSlice.actions;

export default marketSlice.reducer;
