import { cn } from "@/lib/cn";
import { statusClasses, type Status } from "@/lib/status";
import { GlassCard } from "./GlassCard";
import { StatusBadge } from "./StatusBadge";

export type VitalsTileProps = {
  label: string;
  value: string | number;
  unit?: string;
  status?: Status;
  statusLabel?: string;
  /** Renders the tile as a frosted glass card that lifts on hover. */
  glass?: boolean;
  className?: string;
};

export function VitalsTile({
  label,
  value,
  unit,
  status = "normal",
  statusLabel,
  glass = false,
  className,
}: VitalsTileProps) {
  const content = (
    <>
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
    </>
  );

  if (glass) {
    return (
      <GlassCard
        lift
        className={cn(
          "flex flex-col items-start gap-3",
          status !== "normal" && statusClasses[status].border,
          className,
        )}
      >
        {content}
      </GlassCard>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] p-[var(--space-5)]",
        statusClasses[status].border,
        className,
      )}
    >
      {content}
    </div>
  );
}
