import type { BeatClass } from "@/lib/analysis/types";

/** Small seeded generator so a synthetic trace repeats exactly for the same seed. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export type SyntheticBeat = { t: number; cls: BeatClass };

export type SyntheticProfile = {
  /** Resting heart rate of the normal beats. */
  bpm: number;
  /** Chance that a beat is ventricular. */
  ventricularRate: number;
};

export type SyntheticEcg = {
  /** Value of the trace at time `t` seconds, in millivolts. */
  valueAt(t: number): number;
  /** Beats generated so far, oldest first. */
  beats: readonly SyntheticBeat[];
  /** Makes sure beats exist up to `t` seconds. */
  extendTo(t: number): void;
  /** Drops beats older than `t`, to keep memory flat. */
  forgetBefore(t: number): void;
};

type Wave = { offset: number; amplitude: number; width: number };

const NORMAL: Wave[] = [
  { offset: -0.2, amplitude: 0.12, width: 0.025 },
  { offset: -0.04, amplitude: -0.14, width: 0.009 },
  { offset: 0, amplitude: 1, width: 0.011 },
  { offset: 0.035, amplitude: -0.26, width: 0.011 },
  { offset: 0.28, amplitude: 0.3, width: 0.055 },
];

// A ventricular beat: no P wave, a taller and much wider QRS, and an
// inverted T wave that follows it.
const VENTRICULAR: Wave[] = [
  { offset: -0.03, amplitude: -0.2, width: 0.02 },
  { offset: 0.01, amplitude: 1.25, width: 0.032 },
  { offset: 0.08, amplitude: -0.55, width: 0.03 },
  { offset: 0.3, amplitude: -0.35, width: 0.07 },
];

function waveSum(waves: Wave[], dt: number): number {
  let sum = 0;
  for (const wave of waves) {
    const x = (dt - wave.offset) / wave.width;
    sum += wave.amplitude * Math.exp(-0.5 * x * x);
  }
  return sum;
}

/**
 * A synthetic lead II trace with occasional premature ventricular beats
 * (early, wide, followed by a pause), for when the ML service is not running.
 */
export function createSyntheticEcg(
  profile: SyntheticProfile,
  random: () => number,
): SyntheticEcg {
  const beats: SyntheticBeat[] = [];
  const rr = 60 / profile.bpm;
  let next = 0.4;
  let pendingPause = false;
  let coupletLeft = 0;

  function addBeat() {
    let cls: BeatClass = "N";
    let gap = rr * (1 + (random() - 0.5) * 0.05);
    if (coupletLeft > 0) {
      cls = "V";
      coupletLeft -= 1;
      gap = rr * 0.6;
    } else if (pendingPause) {
      gap = rr * 1.35;
      pendingPause = false;
    } else if (beats.length > 4 && random() < profile.ventricularRate) {
      cls = "V";
      // Some ventricular beats come as a pair, which the rhythm rules flag.
      if (random() < 0.25) coupletLeft = 1;
      else pendingPause = true;
      gap = rr * 0.65;
    }
    beats.push({ t: next, cls });
    next += gap;
  }

  return {
    beats,
    extendTo(t) {
      while (next < t + 1) addBeat();
    },
    forgetBefore(t) {
      let drop = 0;
      while (drop < beats.length - 1 && beats[drop].t < t) drop += 1;
      if (drop > 0) beats.splice(0, drop);
    },
    valueAt(t) {
      let sum = 0.03 * Math.sin(2 * Math.PI * 0.25 * t);
      for (const beat of beats) {
        const dt = t - beat.t;
        if (dt < -0.35 || dt > 0.7) continue;
        sum += waveSum(beat.cls === "V" ? VENTRICULAR : NORMAL, dt);
      }
      return sum + (random() - 0.5) * 0.012;
    },
  };
}
