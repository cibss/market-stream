"use client";

import { useEffect, useRef } from "react";

import { selectShouldConnect } from "@/features/connection/connection.slice";

import {
  selectDataSource,
  selectProcessingMode,
  selectSimulationRate,
} from "@/features/benchmark/benchmark.slice";

import {
  faultCommandHandled,
  selectPendingFaultCommand,
  selectStreamPaused,
} from "@/features/reliability/reliability.slice";

import { MarketRuntime } from "@/lib/runtime/market-runtime";

import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/store/hooks";

export function MarketRuntimeController() {
  const store = useAppStore();

  const dispatch = useAppDispatch();

  const dataSource = useAppSelector(selectDataSource);

  const simulationRate = useAppSelector(selectSimulationRate);

  const processingMode = useAppSelector(selectProcessingMode);

  const shouldConnect = useAppSelector(selectShouldConnect);

  const streamPaused = useAppSelector(selectStreamPaused);

  const pendingFaultCommand = useAppSelector(selectPendingFaultCommand);

  const runtimeRef = useRef<MarketRuntime | null>(null);

  useEffect(() => {
    const runtime = new MarketRuntime(store);

    runtimeRef.current = runtime;

    runtime.start();

    return () => {
      runtime.stop();

      runtimeRef.current = null;
    };
  }, [store]);

  useEffect(() => {
    runtimeRef.current?.setDataSource(dataSource);
  }, [dataSource]);

  useEffect(() => {
    runtimeRef.current?.setSimulationRate(simulationRate);
  }, [simulationRate]);

  useEffect(() => {
    runtimeRef.current?.setProcessingMode(processingMode);
  }, [processingMode]);

  useEffect(() => {
    runtimeRef.current?.setConnectionEnabled(shouldConnect);
  }, [shouldConnect]);

  useEffect(() => {
    runtimeRef.current?.setStreamPaused(streamPaused);
  }, [streamPaused]);

  useEffect(() => {
    if (!pendingFaultCommand) {
      return;
    }

    const runtime = runtimeRef.current;

    if (!runtime) {
      return;
    }

    switch (pendingFaultCommand.type) {
      case "simulate-disconnect":
        runtime.simulateTransportFailure();

        break;

      case "inject-invalid-message":
        runtime.injectInvalidMessage();

        break;

      case "restart-connection":
        runtime.restartConnection();

        break;
    }

    dispatch(
      faultCommandHandled({
        id: pendingFaultCommand.id,

        type: pendingFaultCommand.type,
      }),
    );
  }, [dispatch, pendingFaultCommand]);

  return null;
}
