import { cn } from "@/lib/cn";
import { statusClasses, type Status } from "@/lib/status";
import { StatusBadge } from "./StatusBadge";

export type VitalsTileProps = {
  label: string;
  value: string | number;
  unit?: string;
  status?: Status;
  statusLabel?: string;
  className?: string;
};

export function VitalsTile({
  label,
  value,
  unit,
  status = "normal",
  statusLabel,
  className,
}: VitalsTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] p-[var(--space-5)]",
        statusClasses[status].border,
        className,
      )}
    >
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
        {label}
      </p>
      <p className="flex items-end gap-2 whitespace-nowrap">
        <span className="font-mono text-[64px] leading-[64px] font-bold tracking-[-0.025em] text-[var(--color-text-primary)] tabular-nums">
          {value}
        </span>
        {unit ? (
          <span className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
            {unit}
          </span>
        ) : null}
      </p>
      <StatusBadge status={status} label={statusLabel} />
    </div>
  );
}
