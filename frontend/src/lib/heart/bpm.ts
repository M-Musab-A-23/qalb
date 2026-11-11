export const DEFAULT_BPM = 72;
export const MIN_BPM = 30;
export const MAX_BPM = 220;

/**
 * Turns whatever heart rate the page has into one the animation can use.
 * Missing, non-numeric or out-of-range values fall back to the default or the
 * nearest limit, so a bad reading never freezes or strobes the heart.
 */
export function normalizeBpm(bpm: number | null | undefined): number {
  if (typeof bpm !== "number" || !Number.isFinite(bpm) || bpm <= 0) {
    return DEFAULT_BPM;
  }
  return Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
}

/** Length of one beat in seconds. */
export function beatPeriodSeconds(bpm: number | null | undefined): number {
  return 60 / normalizeBpm(bpm);
}
