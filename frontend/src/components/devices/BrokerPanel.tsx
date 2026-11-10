import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import type { BrokerStatus } from "@/lib/data";

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "font-mono text-[32px] leading-10 font-bold text-[var(--color-text-primary)]",
          className,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function BrokerPanel({ broker }: { broker: BrokerStatus }) {
  return (
    <GlassCard lift className="flex flex-col gap-4">
      <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
        MQTT broker
      </h2>
      <dl className="flex flex-wrap gap-x-12 gap-y-4">
        <Stat
          label="Status"
          value={broker.online ? "Online" : "Offline"}
          className={
            broker.online
              ? "text-[var(--color-status-ok-fg)]"
              : "text-[var(--color-status-crit-fg)]"
          }
        />
        <Stat
          label="Connected clients"
          value={`${broker.connectedClients} of ${broker.totalClients}`}
        />
        <Stat label="QoS level" value={String(broker.qos)} />
        <Stat
          label="Transport"
          value={broker.transport}
          className="text-[var(--color-signal-line)]"
        />
      </dl>
    </GlassCard>
  );
}
