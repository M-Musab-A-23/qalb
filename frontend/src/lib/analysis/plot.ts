export type Column = { min: number; max: number };

/**
 * Reduces samples [start, end) to one min/max pair per pixel column, so a
 * long recording draws quickly without losing the R peaks.
 */
export function decimateMinMax(
  samples: ArrayLike<number>,
  start: number,
  end: number,
  columns: number,
): Column[] {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(samples.length, Math.ceil(end));
  const span = to - from;
  if (span <= 0 || columns <= 0) return [];

  const result: Column[] = [];
  for (let column = 0; column < columns; column += 1) {
    const a = from + Math.floor((column / columns) * span);
    const b = Math.max(a + 1, from + Math.floor(((column + 1) / columns) * span));
    let min = Infinity;
    let max = -Infinity;
    for (let i = a; i < Math.min(b, to); i += 1) {
      const value = samples[i];
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (min <= max) result.push({ min, max });
    else result.push(result[result.length - 1] ?? { min: 0, max: 0 });
  }
  return result;
}

/** Value range of a slice, padded so the trace does not touch the edges. */
export function valueRange(
  samples: ArrayLike<number>,
  start: number,
  end: number,
): { min: number; max: number } {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(samples.length, Math.ceil(end));
  let min = Infinity;
  let max = -Infinity;
  for (let i = from; i < to; i += 1) {
    if (samples[i] < min) min = samples[i];
    if (samples[i] > max) max = samples[i];
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: -1, max: 1 };
  const pad = (max - min || 1) * 0.12;
  return { min: min - pad, max: max + pad };
}

/**
 * The index of the largest absolute deviation from the slice median within
 * `radius` samples of `index`, which is where an R peak sits.
 */
export function peakIndexNear(
  samples: ArrayLike<number>,
  index: number,
  radius: number,
): number {
  const from = Math.max(0, Math.round(index) - radius);
  const to = Math.min(samples.length - 1, Math.round(index) + radius);
  if (to < from) return Math.min(Math.max(0, Math.round(index)), samples.length - 1);
  let best = from;
  let bestValue = -Infinity;
  for (let i = from; i <= to; i += 1) {
    if (samples[i] > bestValue) {
      bestValue = samples[i];
      best = i;
    }
  }
  return best;
}

/** The window of a recording to show, clamped to the recording. */
export function clampWindow(
  start: number,
  length: number,
  total: number,
): { start: number; end: number } {
  const size = Math.min(length, total);
  const safeStart = Math.min(Math.max(0, start), Math.max(0, total - size));
  return { start: safeStart, end: safeStart + size };
}
