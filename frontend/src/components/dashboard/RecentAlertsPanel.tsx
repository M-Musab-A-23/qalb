import { AlertRow } from "@/components/ui/AlertRow";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { getAlerts } from "@/lib/data";

export function RecentAlertsPanel({ className }: { className?: string }) {
  const alerts = getAlerts()
    .slice()
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 4);

  return (
    <GlassCard lift className={cn("flex flex-col gap-3 overflow-hidden", className)}>
      <h2 className="text-xl leading-7 font-semibold whitespace-nowrap text-[var(--color-text-primary)]">
        Recent alerts
      </h2>
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
