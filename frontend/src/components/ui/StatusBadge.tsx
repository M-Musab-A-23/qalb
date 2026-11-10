import { cn } from "@/lib/cn";
import { statusClasses, statusLabels, type Status } from "@/lib/status";

export type StatusBadgeProps = {
  status?: Status;
  /** Overrides the default label for the status. */
  label?: string;
  className?: string;
};

export function StatusBadge({
  status = "normal",
  label,
  className,
}: StatusBadgeProps) {
  const c = statusClasses[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[6px] rounded-[var(--radius-full)] py-1 pr-3 pl-[10px] text-xs leading-4 font-medium tracking-[0.2px] whitespace-nowrap",
        c.bg,
        c.fg,
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", c.dot)} />
      {label ?? statusLabels[status]}
    </span>
  );
}
