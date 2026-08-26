"use client";

import { selectDataSource } from "@/features/benchmark/benchmark.slice";
import { selectConnectionStatus } from "@/features/connection/connection.slice";
import {
  faultCommandRequested,
  selectFaultCount,
  selectLastHandledFault,
  selectStreamPaused,
  streamPauseChanged,
} from "@/features/reliability/reliability.slice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

const FAULT_LABELS = {
  "simulate-disconnect": "Simulated Disconnect",

  "inject-invalid-message": "Invalid Message",

  "restart-connection": "Connection Restart",
} as const;

export function ReliabilityPanel() {
  const dispatch = useAppDispatch();

  const dataSource = useAppSelector(selectDataSource);

  const status = useAppSelector(selectConnectionStatus);

  const streamPaused = useAppSelector(selectStreamPaused);

  const faultCount = useAppSelector(selectFaultCount);

  const lastFault = useAppSelector(selectLastHandledFault);

  const liveTransportAvailable =
    dataSource === "live" &&
    (status === "connected" || status === "connecting" || status === "reconnecting");

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">RELIABILITY LAB</p>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          Inject controlled failures into the streaming pipeline and verify that transport, parsing,
          and recovery mechanisms behave as expected.
        </p>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <ControlCard
          title="Stream"
          description={
            streamPaused
              ? "Market ingestion is currently paused."
              : "Temporarily stop market ingestion."
          }
        >
          <button
            type="button"
            onClick={() => {
              dispatch(streamPauseChanged(!streamPaused));
            }}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
          >
            {streamPaused ? "Resume Stream" : "Pause Stream"}
          </button>
        </ControlCard>

        <ControlCard
          title="Transport"
          description="Force the active socket to close and verify automatic reconnection."
        >
          <button
            type="button"
            disabled={!liveTransportAvailable}
            onClick={() => {
              dispatch(faultCommandRequested("simulate-disconnect"));
            }}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Simulate Disconnect
          </button>
        </ControlCard>

        <ControlCard
          title="Parser"
          description="Inject malformed market data and verify that the application rejects it without disrupting the stream."
        >
          <button
            type="button"
            onClick={() => {
              dispatch(faultCommandRequested("inject-invalid-message"));
            }}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
          >
            Inject Invalid Message
          </button>
        </ControlCard>

        <ControlCard
          title="Connection"
          description="Restart the active transport and establish a fresh WebSocket connection."
        >
          <button
            type="button"
            disabled={!liveTransportAvailable}
            onClick={() => {
              dispatch(faultCommandRequested("restart-connection"));
            }}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restart Connection
          </button>
        </ControlCard>
      </div>

      <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-2">
        <Metric label="Faults injected" value={faultCount} />

        <Metric label="Last fault" value={lastFault ? FAULT_LABELS[lastFault] : "—"} />
      </div>
    </section>
  );
}

function ControlCard({
  title,
  description,
  children,
}: {
  title: string;

  description: string;

  children: React.ReactNode;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-[#090b10] p-4">
      <h3 className="text-sm font-medium text-zinc-300">{title}</h3>

      <p className="mt-2 min-h-12 text-xs leading-5 text-zinc-600">{description}</p>

      <div className="mt-4">{children}</div>
    </article>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;

  value: string | number;
}) {
  return (
    <div className="bg-[#090b10] px-5 py-4">
      <p className="text-xs text-zinc-600">{label}</p>

      <p className="mt-2 font-mono text-lg text-zinc-200">{value}</p>
    </div>
  );
}
