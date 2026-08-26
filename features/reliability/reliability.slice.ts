import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type FaultCommandType =
  "simulate-disconnect" | "inject-invalid-message" | "restart-connection";

type FaultCommand = {
  id: number;

  type: FaultCommandType;
};

type ReliabilityState = {
  streamPaused: boolean;

  nextCommandId: number;

  pendingCommand: FaultCommand | null;

  totalFaultsInjected: number;

  lastHandledFault: FaultCommandType | null;
};

const initialState: ReliabilityState = {
  streamPaused: false,

  nextCommandId: 1,

  pendingCommand: null,

  totalFaultsInjected: 0,

  lastHandledFault: null,
};

const reliabilitySlice = createSlice({
  name: "reliability",

  initialState,

  reducers: {
    streamPauseChanged(state, action: PayloadAction<boolean>) {
      state.streamPaused = action.payload;
    },

    faultCommandRequested(state, action: PayloadAction<FaultCommandType>) {
      state.pendingCommand = {
        id: state.nextCommandId,

        type: action.payload,
      };

      state.nextCommandId += 1;
    },

    faultCommandHandled(
      state,
      action: PayloadAction<{
        id: number;

        type: FaultCommandType;
      }>,
    ) {
      if (state.pendingCommand?.id !== action.payload.id) {
        return;
      }

      state.pendingCommand = null;

      state.totalFaultsInjected += 1;

      state.lastHandledFault = action.payload.type;
    },

    reliabilityReset(state) {
      state.streamPaused = false;

      state.pendingCommand = null;

      state.totalFaultsInjected = 0;

      state.lastHandledFault = null;
    },
  },
});

export const { streamPauseChanged, faultCommandRequested, faultCommandHandled, reliabilityReset } =
  reliabilitySlice.actions;

export const selectStreamPaused = (state: { reliability: ReliabilityState }) =>
  state.reliability.streamPaused;

export const selectPendingFaultCommand = (state: { reliability: ReliabilityState }) =>
  state.reliability.pendingCommand;

export const selectFaultCount = (state: { reliability: ReliabilityState }) =>
  state.reliability.totalFaultsInjected;

export const selectLastHandledFault = (state: { reliability: ReliabilityState }) =>
  state.reliability.lastHandledFault;

export default reliabilitySlice.reducer;
