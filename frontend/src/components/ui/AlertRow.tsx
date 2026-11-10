import { cn } from "@/lib/cn";
import { statusClasses, type Status } from "@/lib/status";

export type AlertRowProps = {
  severity: Status;
  title: string;
  detail: string;
  time: string;
  className?: string;
};

export function AlertRow({
  severity,
  title,
  detail,
  time,
  className,
}: AlertRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-[var(--color-border-subtle)] py-[var(--space-3)]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-[10px] shrink-0 rounded-full", statusClasses[severity].dot)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[2px] font-medium">
        <p className="truncate text-sm leading-5 text-[var(--color-text-primary)]">
          {title}
        </p>
        <p className="truncate text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
          {detail}
        </p>
      </div>
      <time className="shrink-0 font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
        {time}
      </time>
    </div>
  );
}
