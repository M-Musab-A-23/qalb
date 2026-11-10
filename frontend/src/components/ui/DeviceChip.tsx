import { cn } from "@/lib/cn";

export type DeviceChipProps = {
  name: string;
  connected?: boolean;
  className?: string;
};

export function DeviceChip({ name, connected = true, className }: DeviceChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-raised)] px-[var(--space-3)] py-[var(--space-2)] font-mono text-[13px] leading-4 font-medium whitespace-nowrap text-[var(--color-text-primary)]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          connected
            ? "bg-[var(--color-status-ok-fg)]"
            : "bg-[var(--color-status-crit-fg)]",
        )}
      />
      {name} · {connected ? "Connected" : "Offline"}
    </span>
  );
}
