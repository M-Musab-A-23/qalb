import { classInfo } from "@/lib/analysis/classes";
import { formatClock } from "@/lib/analysis/summary";
import type { Beat } from "@/lib/analysis/types";
import { cn } from "@/lib/cn";

/** Above this many beats only the non-normal ones are drawn, to stay readable. */
const MAX_DRAWN = 600;

/**
 * Every beat placed along the recording. Used when there is no trace to draw,
 * such as for WFDB uploads, and as the fallback for stored analyses.
 */
export function BeatTimeline({
  beats,
  durationS,
}: {
  beats: Beat[];
  durationS: number;
}) {
  const crowded = beats.length > MAX_DRAWN;
  const drawn = crowded ? beats.filter((beat) => beat.cls !== "N") : beats;
  const total = durationS > 0 ? durationS : 1;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`Timeline of ${beats.length} beats over ${formatClock(durationS)}`}
        className="glass-strong relative h-[96px] overflow-hidden rounded-[var(--radius-md)]"
      >
        <div
          aria-hidden
          className="absolute inset-x-4 top-1/2 h-px bg-[var(--color-border-strong)]"
        />
        <div className="absolute inset-x-4 inset-y-0">
          {drawn.map((beat, index) => (
            <span
              key={`${beat.sample}-${index}`}
              title={`${classInfo[beat.cls].name} at ${formatClock(beat.timeS)}`}
              className={cn(
                "absolute top-1/2 inline-flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-current font-mono text-[10px] leading-none font-semibold",
                classInfo[beat.cls].fill,
                classInfo[beat.cls].text,
              )}
              style={{ left: `${Math.min(100, (beat.timeS / total) * 100)}%` }}
            >
              {beat.cls}
            </span>
          ))}
        </div>
      </div>
      <div className="flex justify-between font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
        <span>{formatClock(0)}</span>
        <span>{formatClock(total / 2)}</span>
        <span>{formatClock(total)}</span>
      </div>
      {crowded ? (
        <p className="text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
          Showing the {drawn.length} beats that are not class N. All {beats.length} beats are in
          the table below.
        </p>
      ) : null}
    </div>
  );
}
