"use client";

import { useEffect, useRef } from "react";

import { selectShouldConnect } from "@/features/connection/connection.slice";

import {
  selectDataSource,
  selectProcessingMode,
  selectSimulationRate,
} from "@/features/benchmark/benchmark.slice";

import { MarketRuntime } from "@/lib/runtime/market-runtime";

import { useAppSelector, useAppStore } from "@/lib/store/hooks";

export function MarketRuntimeController() {
  const store = useAppStore();

  const dataSource = useAppSelector(selectDataSource);

  const simulationRate = useAppSelector(selectSimulationRate);

  const processingMode = useAppSelector(selectProcessingMode);

  const shouldConnect = useAppSelector(selectShouldConnect);

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

  return null;
}
