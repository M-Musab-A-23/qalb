import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { describeConnection } from "@/lib/live/labels";
import type { FeedConnection } from "@/lib/live/types";

/** Where the data comes from and whether it is flowing: Live replay, Simulated feed, Reconnecting. */
export function ConnectionBadge({
  connection,
  paused = false,
  className,
}: {
  connection: FeedConnection;
  paused?: boolean;
  className?: string;
}) {
  const { label, status, hint } = describeConnection(connection, paused);
  return (
    <span
      role="status"
      aria-live="polite"
      title={hint ?? undefined}
      className={cn("inline-flex", className)}
    >
      {status ? (
        <StatusBadge status={status} label={label} />
      ) : (
        <span className="inline-flex items-center gap-[6px] rounded-[var(--radius-full)] bg-[var(--color-bg-raised)] py-1 pr-3 pl-[10px] text-xs leading-4 font-medium tracking-[0.2px] whitespace-nowrap text-[var(--color-text-secondary)]">
          <span aria-hidden className="size-2 rounded-full bg-[var(--color-text-subtle)]" />
          {label}
        </span>
      )}
    </span>
  );
}
