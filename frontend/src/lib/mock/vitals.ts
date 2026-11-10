import type { LiveVitals } from "./types";

export const baselineVitals: LiveVitals = {
  heartRate: 72,
  spo2: 98,
  hrv: 48,
  rrInterval: 830,
};

function jitter(value: number, amount: number): number {
  return value + (Math.random() - 0.5) * 2 * amount;
}

/** Returns the next simulated reading, drifting slightly from the baseline. */
export function nextVitals(previous: LiveVitals): LiveVitals {
  const heartRate = Math.round(
    Math.min(
      80,
      Math.max(64, previous.heartRate + (baselineVitals.heartRate - previous.heartRate) * 0.2 + jitter(0, 1.5)),
    ),
  );
  return {
    heartRate,
    spo2: Math.round(Math.min(100, Math.max(96, jitter(98, 1)))),
    hrv: Math.round(Math.min(60, Math.max(38, jitter(48, 4)))),
    rrInterval: Math.round(60000 / heartRate),
  };
}
