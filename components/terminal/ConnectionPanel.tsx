import type {
  ConnectionMetrics,
  ConnectionStatus,
} from "@/features/market/market.types";

type ConnectionPanelProps = {
  status: ConnectionStatus;
  metrics: ConnectionMetrics;
};

const STATUS_STYLES: Record<ConnectionStatus, string> = {
  idle: "bg-zinc-500",
  connecting: "bg-amber-400",
  connected: "bg-emerald-400",
  reconnecting: "bg-amber-400",
  disconnected: "bg-zinc-500",
  error: "bg-rose-400",
};

export function ConnectionPanel({ status, metrics }: ConnectionPanelProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs font-medium tracking-[0.18em] text-zinc-500">
          STREAM HEALTH
        </p>
      </div>

      <dl className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-5">
        <Metric>
          <dt>Status</dt>

          <dd className="flex items-center gap-2 capitalize">
            <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status]}`} />

            {status}
          </dd>
        </Metric>

        <Metric>
          <dt>Messages / sec</dt>
          <dd>{metrics.messagesPerSecond}</dd>
        </Metric>

        <Metric>
          <dt>Total messages</dt>
          <dd>{metrics.totalMessages.toLocaleString()}</dd>
        </Metric>

        <Metric>
          <dt>Reconnects</dt>
          <dd>{metrics.reconnectCount}</dd>
        </Metric>

        <Metric>
          <dt>Last message</dt>

          <dd>
            {metrics.lastMessageAt
              ? new Date(metrics.lastMessageAt).toLocaleTimeString()
              : "—"}
          </dd>
        </Metric>
      </dl>
    </section>
  );
}

function Metric({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#090b10] px-5 py-4 [&_dd]:mt-2 [&_dd]:font-mono [&_dd]:text-lg [&_dd]:font-medium [&_dd]:text-zinc-200 [&_dt]:text-xs [&_dt]:text-zinc-600">
      {children}
    </div>
  );
}
