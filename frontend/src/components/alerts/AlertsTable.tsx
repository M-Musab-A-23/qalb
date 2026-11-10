import { GlassCard } from "@/components/ui/GlassCard";
import type { AlertItem } from "@/lib/data";
import { AlertListRow, alertColumns } from "./AlertListRow";

const headings = ["Severity", "Patient", "Details", "Time"];

export function AlertsTable({
  alerts,
  onAcknowledge,
}: {
  alerts: AlertItem[];
  onAcknowledge: (id: string) => void;
}) {
  return (
    <GlassCard flush className="overflow-x-auto">
      <div className="min-w-[860px]">
        <div
          className={`${alertColumns} glass-strong rounded-none border-0 px-5 py-[14px]`}
        >
          {headings.map((heading) => (
            <span
              key={heading}
              className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase"
            >
              {heading}
            </span>
          ))}
          <span className="text-right text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
            Action
          </span>
        </div>
        {alerts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--color-text-secondary)]">
            No alerts match this filter.
          </p>
        ) : (
          alerts.map((alert) => (
            <AlertListRow
              key={alert.id}
              alert={alert}
              onAcknowledge={onAcknowledge}
            />
          ))
        )}
      </div>
    </GlassCard>
  );
}
