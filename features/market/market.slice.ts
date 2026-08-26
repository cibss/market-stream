import { createEntityAdapter, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  type AnalyticsMap,
  createEmptyAnalyticsMap,
  createEmptyCandleMap,
  MARKET_SYMBOLS,
  type MarketActivity,
  type MarketSymbol,
  type MarketTicker,
  type MarketVisualizationUpdate,
  type ProcessedMarketBatch,
} from "./market.types";

const MAX_CHART_CANDLES = 300;

const MAX_ACTIVITY_ITEMS = 5_000;

export const marketAdapter = createEntityAdapter<MarketTicker, MarketSymbol>({
  selectId: (ticker) => ticker.symbol,
});

const initialState = marketAdapter.getInitialState({
  analytics: createEmptyAnalyticsMap(),

  candles: createEmptyCandleMap(),

  /**
   * Important:
   *
   * An empty array by itself can be inferred as:
   *
   * never[]
   *
   * Explicitly tell TypeScript what this
   * collection will contain.
   */
  activity: [] as MarketActivity[],
});

const marketSlice = createSlice({
  name: "market",

  initialState,

  reducers: {
    marketBatchProcessed(state, action: PayloadAction<ProcessedMarketBatch>) {
      marketAdapter.upsertMany(state, action.payload.latestTickers);

      state.analytics = action.payload.analytics;
    },

    marketVisualizationReceived(state, action: PayloadAction<MarketVisualizationUpdate>) {
      for (const symbol of MARKET_SYMBOLS) {
        const candle = action.payload.candles[symbol];

        if (!candle) {
          continue;
        }

        const candles = state.candles[symbol];

        const lastIndex = candles.length - 1;

        const lastCandle = candles[lastIndex];

        /**
         * Same one-second bucket:
         *
         * replace the latest candle because
         * its high/low/close may have changed.
         */
        if (lastCandle?.time === candle.time) {
          candles[lastIndex] = candle;
        } else {
          /**
           * New time bucket:
           *
           * append a new candle.
           */
          candles.push(candle);
        }

        /**
         * Keep chart history bounded.
         *
         * 300 one-second candles
         * ≈ 5 minutes.
         */
        if (candles.length > MAX_CHART_CANDLES) {
          candles.splice(0, candles.length - MAX_CHART_CANDLES);
        }
      }

      if (action.payload.activity.length > 0) {
        /**
         * New activity is already ordered
         * newest-first by the visualization
         * engine.
         *
         * Prepend it and retain only the
         * most recent 5,000 records.
         */
        state.activity = [...action.payload.activity, ...state.activity].slice(
          0,
          MAX_ACTIVITY_ITEMS,
        );
      }
    },

    marketReset(state) {
      marketAdapter.removeAll(state);

      state.analytics = createEmptyAnalyticsMap();

      state.candles = createEmptyCandleMap();

      state.activity = [];
    },

    marketAnalyticsReset(state) {
      state.analytics = createEmptyAnalyticsMap();
    },

    marketVisualizationReset(state) {
      state.candles = createEmptyCandleMap();

      state.activity = [];
    },

    analyticsReplaced(state, action: PayloadAction<AnalyticsMap>) {
      state.analytics = action.payload;
    },
  },
});

export const {
  marketBatchProcessed,
  marketVisualizationReceived,
  marketReset,
  marketAnalyticsReset,
  marketVisualizationReset,
  analyticsReplaced,
} = marketSlice.actions;

export default marketSlice.reducer;
