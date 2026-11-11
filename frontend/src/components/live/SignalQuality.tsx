import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { qualityLabel } from "@/lib/live/state";

const SEGMENTS = 5;

/** Signal quality from 0 to 1, as a word, a percentage and a segmented bar. */
export function SignalQuality({
  quality,
  className,
}: {
  quality: number | null;
  className?: string;
}) {
  const label = qualityLabel(quality);
  const filled = quality === null ? 0 : Math.round(quality * SEGMENTS);
  const tone =
    label === "Poor"
      ? "bg-[var(--color-status-crit-fg)]"
      : label === "Fair"
        ? "bg-[var(--color-status-warn-fg)]"
        : "bg-[var(--color-status-ok-fg)]";
  return (
    <GlassCard lift className={cn("flex flex-col items-start gap-3", className)}>
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
        Signal quality
      </p>
      <p className="flex items-baseline gap-2">
        <span className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
          {label}
        </span>
        {quality !== null ? (
          <span className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
            {Math.round(quality * 100)}%
          </span>
        ) : null}
      </p>
      <div
        role="meter"
        aria-label="Signal quality"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={quality === null ? undefined : Math.round(quality * 100)}
        aria-valuetext={label}
        className="flex w-full gap-1"
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full",
              i < filled ? tone : "bg-[var(--color-bg-raised)]",
            )}
          />
        ))}
      </div>
    </GlassCard>
  );
}
