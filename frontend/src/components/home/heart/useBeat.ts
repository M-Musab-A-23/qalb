"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { beatEnvelope, phaseStep, wrapPhase } from "@/lib/heart/pulse";

export type BeatState = {
  /** Position within the current beat, 0 to 1. */
  phase: number;
  /** Strength of the beat, 0 at rest to 1 at the first peak. */
  envelope: number;
  /** Total beats since the scene started; never wraps. */
  travel: number;
};

/**
 * Advances the heartbeat every frame at the given rate. Phase is accumulated
 * rather than computed from the clock, so changing the rate never makes the
 * heart jump. When not running the heart rests at phase 0.
 */
export function useBeat(bpm: number, running: boolean): RefObject<BeatState> {
  const beat = useRef<BeatState>({ phase: 0.5, envelope: 0, travel: 0 });

  useFrame((_, delta) => {
    const state = beat.current;
    if (!running) {
      state.envelope = 0;
      return;
    }
    const step = phaseStep(delta, bpm);
    state.travel += step;
    state.phase = wrapPhase(state.phase + step);
    state.envelope = beatEnvelope(state.phase);
  }, -1);

  return beat;
}
