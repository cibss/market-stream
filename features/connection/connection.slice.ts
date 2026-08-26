import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { ConnectionMetrics, ConnectionStatus } from "@/features/market/market.types";

type ConnectionState = {
  status: ConnectionStatus;

  shouldConnect: boolean;

  metrics: ConnectionMetrics;
};

const initialMetrics: ConnectionMetrics = {
  connectedAt: null,
  lastMessageAt: null,
  messagesPerSecond: 0,
  totalMessages: 0,
  reconnectCount: 0,
};

const initialState: ConnectionState = {
  status: "idle",

  shouldConnect: true,

  metrics: initialMetrics,
};

const connectionSlice = createSlice({
  name: "connection",

  initialState,

  reducers: {
    connectionStatusChanged(state, action: PayloadAction<ConnectionStatus>) {
      state.status = action.payload;
    },

    connectionOpened(state) {
      state.metrics.connectedAt = Date.now();
    },

    transportMetricsReceived(
      state,
      action: PayloadAction<{
        messagesPerSecond: number;

        totalMessages: number;

        lastMessageAt: number | null;
      }>,
    ) {
      state.metrics.messagesPerSecond = action.payload.messagesPerSecond;

      state.metrics.totalMessages = action.payload.totalMessages;

      state.metrics.lastMessageAt = action.payload.lastMessageAt;
    },

    reconnectScheduled(state) {
      state.metrics.reconnectCount += 1;
    },

    connectRequested(state) {
      state.shouldConnect = true;
    },

    disconnectRequested(state) {
      state.shouldConnect = false;
    },

    connectionMetricsReset(state) {
      state.metrics = {
        ...initialMetrics,
      };
    },
  },
});

export const {
  connectionStatusChanged,
  connectionOpened,
  transportMetricsReceived,
  reconnectScheduled,
  connectRequested,
  disconnectRequested,
  connectionMetricsReset,
} = connectionSlice.actions;

export const selectConnectionStatus = (state: { connection: ConnectionState }) =>
  state.connection.status;

export const selectConnectionMetrics = (state: { connection: ConnectionState }) =>
  state.connection.metrics;

export const selectShouldConnect = (state: { connection: ConnectionState }) =>
  state.connection.shouldConnect;

export default connectionSlice.reducer;
