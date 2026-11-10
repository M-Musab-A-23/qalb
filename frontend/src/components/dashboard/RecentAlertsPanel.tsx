import { AlertRow } from "@/components/ui/AlertRow";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import type { AlertItem } from "@/lib/data";

export function RecentAlertsPanel({
  alerts: source,
  className,
}: {
  alerts: AlertItem[];
  className?: string;
}) {
  const alerts = source
    .slice()
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 4);

  return (
    <GlassCard lift className={cn("flex flex-col gap-3 overflow-hidden", className)}>
      <h2 className="text-xl leading-7 font-semibold whitespace-nowrap text-[var(--color-text-primary)]">
        Recent alerts
      </h2>
      {alerts.length === 0 ? (
        <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
          No alerts for this account.
        </p>
      ) : null}
      <div className="flex flex-col">
        {alerts.map((alert) => (
          <AlertRow
            key={alert.id}
            severity={alert.severity}
            title={alert.title}
            detail={`${alert.patientId} · ${alert.detail.toLowerCase()}`}
            time={alert.time}
          />
        ))}
      </div>
    </GlassCard>
  );
}
