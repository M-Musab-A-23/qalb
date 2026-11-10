import { AlertRow } from "@/components/ui/AlertRow";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  formatClock,
  formatPercent,
  severityLabels,
  severityStatus,
} from "@/lib/analysis/summary";
import type { RhythmAlert } from "@/lib/analysis/types";

export function AlertList({ alerts }: { alerts: RhythmAlert[] }) {
  return (
    <GlassCard className="flex flex-col gap-3">
      <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
        Alerts
      </h2>
      {alerts.length === 0 ? (
        <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
          No rhythm alerts were raised for this recording.
        </p>
      ) : (
        <div className="flex flex-col">
          {alerts.map((alert, index) => (
            <AlertRow
              key={`${alert.type}-${alert.startSample}-${index}`}
              severity={severityStatus(alert.severity)}
              title={alert.message}
              detail={`${severityLabels[alert.severity]} severity · ${formatPercent(alert.confidence)} confidence`}
              time={formatClock(alert.startS)}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
