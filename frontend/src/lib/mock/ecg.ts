/** Samples per second produced by the simulated ECG stream. */
export const ECG_SAMPLE_RATE = 250;

export type EcgGenerator = {
  /** Returns the next sample, in millivolts, roughly between -0.4 and 1.1. */
  next: () => number;
  setBpm: (bpm: number) => void;
};

type Wave = { offset: number; amplitude: number; width: number };

// One heartbeat as a sum of Gaussians: P, Q, R, S and T waves.
// Offsets are in seconds relative to the R peak.
const waves: Wave[] = [
  { offset: -0.2, amplitude: 0.12, width: 0.025 },
  { offset: -0.04, amplitude: -0.14, width: 0.009 },
  { offset: 0, amplitude: 1, width: 0.011 },
  { offset: 0.035, amplitude: -0.26, width: 0.011 },
  { offset: 0.28, amplitude: 0.3, width: 0.055 },
];

function beatValue(dt: number): number {
  let sum = 0;
  for (const wave of waves) {
    const x = (dt - wave.offset) / wave.width;
    sum += wave.amplitude * Math.exp(-0.5 * x * x);
  }
  return sum;
}

/** Creates a simulated lead II trace with small beat-to-beat variation. */
export function createEcgGenerator(initialBpm = 72): EcgGenerator {
  let bpm = initialBpm;
  let time = 0;
  let previousBeat = -60 / bpm;
  let currentBeat = 0.2;
  let nextBeat = currentBeat + 60 / bpm;

  function interval(): number {
    // About 3% variation between beats.
    return (60 / bpm) * (1 + (Math.random() - 0.5) * 0.06);
  }

  return {
    setBpm(value) {
      bpm = Math.max(30, Math.min(220, value));
    },
    next() {
      time += 1 / ECG_SAMPLE_RATE;
      if (time >= nextBeat) {
        previousBeat = currentBeat;
        currentBeat = nextBeat;
        nextBeat = currentBeat + interval();
      }
      const value =
        beatValue(time - previousBeat) +
        beatValue(time - currentBeat) +
        beatValue(time - nextBeat);
      const wander = 0.03 * Math.sin(2 * Math.PI * 0.25 * time);
      const noise = (Math.random() - 0.5) * 0.012;
      return value + wander + noise;
    },
  };
}
