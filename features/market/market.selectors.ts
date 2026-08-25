import type { RootState } from "@/lib/store/store";
import { marketAdapter } from "./market.slice";

export const marketSelectors = marketAdapter.getSelectors<RootState>(
  (state) => state.market,
);

export const selectTickerBySymbol = marketSelectors.selectById;

export const selectAllTickers = marketSelectors.selectAll;

export const selectAnalytics = (state: RootState) => state.market.analytics;
