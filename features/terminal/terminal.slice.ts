import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { MarketSymbol } from "@/features/market/market.types";
import type { RootState } from "@/lib/store/store";

type TerminalState = {
  selectedSymbol: MarketSymbol;
};

const initialState: TerminalState = {
  selectedSymbol: "BTC-USD",
};

const terminalSlice = createSlice({
  name: "terminal",

  initialState,

  reducers: {
    selectedSymbolChanged(state, action: PayloadAction<MarketSymbol>) {
      state.selectedSymbol = action.payload;
    },
  },
});

export const { selectedSymbolChanged } = terminalSlice.actions;

export const selectSelectedSymbol = (state: RootState) => state.terminal.selectedSymbol;

export default terminalSlice.reducer;
