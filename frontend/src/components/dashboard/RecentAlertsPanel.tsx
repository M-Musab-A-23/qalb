import { AlertRow } from "@/components/ui/AlertRow";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { SOURCE_LABELS, type AlertItem } from "@/lib/data";

/** Alerts from a live feed come first, newest first as stored; seeded ones follow by time. */
export function orderAlerts(alerts: AlertItem[]): AlertItem[] {
  return alerts.slice().sort((a, b) => {
    if (Boolean(a.source) !== Boolean(b.source)) return a.source ? -1 : 1;
    return a.source ? 0 : b.time.localeCompare(a.time);
  });
}

export function RecentAlertsPanel({
  alerts: source,
  title = "Recent alerts",
  limit = 4,
  emptyText = "No alerts for this account.",
  className,
}: {
  alerts: AlertItem[];
  title?: string;
  limit?: number;
  emptyText?: string;
  className?: string;
}) {
  const alerts = orderAlerts(source).slice(0, limit);

  return (
    <GlassCard lift className={cn("flex flex-col gap-3 overflow-hidden", className)}>
      <h2 className="text-xl leading-7 font-semibold whitespace-nowrap text-[var(--color-text-primary)]">
        {title}
      </h2>
      {alerts.length === 0 ? (
        <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
          {emptyText}
        </p>
      ) : null}
      <div className="flex flex-col">
        {alerts.map((alert) => (
          <AlertRow
            key={alert.id}
            severity={alert.severity}
            title={alert.title}
            detail={`${alert.patientId} · ${alert.detail.toLowerCase()}${alert.source ? ` · ${SOURCE_LABELS[alert.source]}` : ""}`}
            time={alert.time}
          />
        ))}
      </div>
    </GlassCard>
  );
}
