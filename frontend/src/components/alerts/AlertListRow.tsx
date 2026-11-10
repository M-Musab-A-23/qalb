import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AlertItem } from "@/lib/data";

export const alertColumns =
  "grid grid-cols-[200px_180px_minmax(0,1fr)_110px_140px] items-center gap-4";

export function AlertListRow({
  alert,
  onAcknowledge,
}: {
  alert: AlertItem;
  onAcknowledge: (id: string) => void;
}) {
  return (
    <div
      className={`${alertColumns} border-b border-[var(--color-border-subtle)] px-5 py-3 last:border-b-0`}
    >
      <span>
        <StatusBadge status={alert.severity} label={alert.title} />
      </span>
      <span className="flex min-w-0 flex-col gap-[2px] font-medium">
        <span className="text-sm leading-5 text-[var(--color-text-primary)]">
          {alert.patientId}
        </span>
        <span className="text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
          {alert.deviceId}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-[2px] font-medium">
        <span className="truncate text-sm leading-5 text-[var(--color-text-primary)]">
          {alert.detail}
        </span>
        <span className="truncate text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
          {alert.note}
        </span>
      </span>
      <time className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
        {alert.time}
      </time>
      <span className="flex justify-end">
        {alert.acknowledged ? (
          <span className="px-4 py-2 text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-text-subtle)]">
            Acknowledged
          </span>
        ) : (
          <Button
            variant="secondary"
            size="s"
            onClick={() => onAcknowledge(alert.id)}
          >
            Acknowledge
          </Button>
        )}
      </span>
    </div>
  );
}
