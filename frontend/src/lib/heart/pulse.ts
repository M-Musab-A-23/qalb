/**
 * Timing of one heartbeat as a function of the beat phase (0 to 1).
 *
 * A real beat has two sounds, so the envelope has two contractions: a strong
 * first one and a softer second one a little later. Each contraction is quick
 * and each release is slower. The envelope is 0 at rest and 1 at the peak of
 * the first contraction.
 */

type Contraction = {
  /** Phase at which the contraction starts. */
  start: number;
  /** Fraction of the beat spent contracting. */
  attack: number;
  /** Fraction of the beat spent releasing. */
  release: number;
  /** Peak height of this contraction. */
  amplitude: number;
};

export const BEAT_PATTERN: readonly Contraction[] = [
  { start: 0, attack: 0.08, release: 0.22, amplitude: 1 },
  { start: 0.3, attack: 0.07, release: 0.2, amplitude: 0.6 },
];

/** Wraps any phase into the range [0, 1). */
export function wrapPhase(phase: number): number {
  if (!Number.isFinite(phase)) return 0;
  return ((phase % 1) + 1) % 1;
}

function contraction(phase: number, c: Contraction): number {
  const d = phase - c.start;
  if (d < 0 || d > c.attack + c.release) return 0;
  if (d < c.attack) {
    // Quick, decelerating rise.
    const t = d / c.attack;
    return c.amplitude * (1 - (1 - t) * (1 - t));
  }
  // Slower, eased release back to rest.
  const t = (d - c.attack) / c.release;
  return c.amplitude * 0.5 * (1 + Math.cos(Math.PI * t));
}

/** Strength of the beat at a phase: 0 at rest, up to 1 at the first peak. */
export function beatEnvelope(phase: number): number {
  const p = wrapPhase(phase);
  let value = 0;
  for (const c of BEAT_PATTERN) value += contraction(p, c);
  return Math.min(1, value);
}

/** Scale of the heart at a phase. A contraction squeezes it a little. */
export function beatScale(phase: number, squeeze = 0.06): number {
  return 1 - squeeze * beatEnvelope(phase);
}

/** How far the phase moves in a frame of `deltaSeconds` at a heart rate. */
export function phaseStep(deltaSeconds: number, bpm: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  // A long stall (hidden tab, paused canvas) must not skip many beats at once.
  return Math.min(deltaSeconds, 0.25) * (bpm / 60);
}
