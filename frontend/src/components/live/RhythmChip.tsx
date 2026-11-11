import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { rhythmLabel } from "@/lib/live/state";

/** The rhythm the model reports, as a status chip: amber only when it is irregular. */
export function RhythmChip({
  rhythm,
  className,
}: {
  rhythm: string | null;
  className?: string;
}) {
  return (
    <GlassCard lift className={cn("flex flex-col items-start gap-3", className)}>
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
        Rhythm
      </p>
      <StatusBadge
        status={rhythm === "irregular" ? "warning" : "normal"}
        label={rhythmLabel(rhythm)}
      />
    </GlassCard>
  );
}
