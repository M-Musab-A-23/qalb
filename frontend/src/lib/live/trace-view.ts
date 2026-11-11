import type { BeatClass } from "@/lib/analysis/types";

/**
 * Stream time at the right edge of the view. Blocks arrive in steps, so the
 * edge runs a little behind the newest sample and advances with the clock
 * between blocks, which keeps the trace moving smoothly instead of jumping.
 */
export function viewEdge(
  end: number,
  updatedAt: number,
  now: number,
  speed: number,
  blockSeconds = 0.25,
): number {
  if (updatedAt === 0) return end;
  const lag = blockSeconds * speed;
  const elapsed = Math.max(0, (now - updatedAt) / 1000);
  return Math.min(end, end - lag + elapsed * speed);
}

/** Horizontal pixel of stream time `t` in a view of `seconds` ending at `edge`. */
export function timeToX(t: number, edge: number, seconds: number, width: number): number {
  return ((t - (edge - seconds)) / seconds) * width;
}

/** Moves the vertical range toward the visible one so the trace does not jump. */
export function easeRange(
  current: { lo: number; hi: number } | null,
  target: { lo: number; hi: number },
  rate = 0.15,
): { lo: number; hi: number } {
  if (!current) return target;
  return {
    lo: current.lo + (target.lo - current.lo) * rate,
    hi: current.hi + (target.hi - current.hi) * rate,
  };
}

/** Marker text: the model class, with the annotated class when the two differ. */
export function markerLabel(cls: BeatClass, groundTruth?: BeatClass | null): string {
  return groundTruth && groundTruth !== cls ? `${cls} (ref ${groundTruth})` : cls;
}

/** Whether the model and the annotation disagree on a beat. */
export function isMismatch(cls: BeatClass, groundTruth?: BeatClass | null): boolean {
  return Boolean(groundTruth) && groundTruth !== cls;
}
