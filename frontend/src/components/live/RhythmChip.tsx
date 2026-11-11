import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { rhythmLabel } from "@/lib/live/state";
import type { Status } from "@/lib/status";

/** The rhythm the model reports, as a status chip. */
export function RhythmChip({
  rhythm,
  status,
  className,
}: {
  rhythm: string | null;
  /** Overall status of the stream, which colours the chip. */
  status: Status;
  className?: string;
}) {
  return (
    <GlassCard lift className={cn("flex flex-col items-start gap-3", className)}>
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
        Rhythm
      </p>
      <StatusBadge status={status} label={rhythmLabel(rhythm)} />
    </GlassCard>
  );
}
