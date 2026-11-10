import type { ReactNode } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { statusClasses, type Status } from "@/lib/status";

/** A result card in the same layout as the vitals tiles, sized for text values. */
export function SummaryTile({
  label,
  value,
  unit,
  status,
  statusLabel,
  children,
  className,
}: {
  label: string;
  value?: string;
  unit?: string;
  status?: Status;
  statusLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard
      className={cn(
        "flex flex-col items-start gap-3",
        status && status !== "normal" && statusClasses[status].border,
        className,
      )}
    >
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
        {label}
      </p>
      {value !== undefined ? (
        <p className="flex items-end gap-2 whitespace-nowrap">
          <span className="font-mono text-[40px] leading-[44px] font-bold tracking-[-0.025em] text-[var(--color-text-primary)] tabular-nums">
            {value}
          </span>
          {unit ? (
            <span className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
              {unit}
            </span>
          ) : null}
        </p>
      ) : null}
      {children}
      {status ? <StatusBadge status={status} label={statusLabel} /> : null}
    </GlassCard>
  );
}
