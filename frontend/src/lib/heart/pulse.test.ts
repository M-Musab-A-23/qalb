import { describe, expect, it } from "vitest";
import {
  BEAT_PATTERN,
  beatEnvelope,
  beatScale,
  phaseStep,
  wrapPhase,
} from "./pulse";

describe("wrapPhase", () => {
  it("wraps into [0, 1)", () => {
    expect(wrapPhase(1.25)).toBeCloseTo(0.25);
    expect(wrapPhase(-0.25)).toBeCloseTo(0.75);
    expect(wrapPhase(3)).toBe(0);
  });

  it("treats a non-finite phase as rest", () => {
    expect(wrapPhase(Number.NaN)).toBe(0);
  });
});

describe("beatEnvelope", () => {
  it("is at rest between the beat and the next one", () => {
    expect(beatEnvelope(0.7)).toBe(0);
    expect(beatEnvelope(0.99)).toBe(0);
  });

  it("peaks at the end of the first attack", () => {
    const [first] = BEAT_PATTERN;
    expect(beatEnvelope(first.attack)).toBeCloseTo(1);
  });

  it("has a second, softer peak", () => {
    const second = BEAT_PATTERN[1];
    const peak = beatEnvelope(second.start + second.attack);
    expect(peak).toBeCloseTo(second.amplitude);
    expect(peak).toBeLessThan(1);
  });

  it("dips between the two contractions", () => {
    const [first, second] = BEAT_PATTERN;
    const valley = beatEnvelope(first.start + first.attack + first.release);
    expect(valley).toBeLessThan(0.05);
    expect(beatEnvelope(second.start + second.attack)).toBeGreaterThan(valley);
  });

  it("rises faster than it releases", () => {
    const [first] = BEAT_PATTERN;
    expect(first.attack).toBeLessThan(first.release);
  });

  it("stays within 0 and 1 and repeats every beat", () => {
    for (let i = 0; i <= 200; i++) {
      const p = i / 100;
      const v = beatEnvelope(p);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(v).toBeCloseTo(beatEnvelope(p + 1), 10);
    }
  });
});

describe("beat pattern", () => {
  it("finishes before the next beat starts", () => {
    for (const c of BEAT_PATTERN) {
      expect(c.start + c.attack + c.release).toBeLessThan(1);
    }
  });

  it("does not overlap the two contractions", () => {
    const [first, second] = BEAT_PATTERN;
    expect(first.start + first.attack + first.release).toBeLessThanOrEqual(
      second.start,
    );
  });

  it("keeps the same rhythm at any rate, only faster or slower", () => {
    // One beat at 60 and at 120 bpm sample the same envelope over phase.
    const slow = [0, 0.1, 0.35, 0.8].map((p) => beatEnvelope(p));
    const fast = [0, 0.1, 0.35, 0.8].map((p) => beatEnvelope(p + 3));
    expect(fast).toEqual(slow);
  });
});

describe("beatScale", () => {
  it("is 1 at rest and smaller at the peak", () => {
    expect(beatScale(0.8)).toBe(1);
    expect(beatScale(BEAT_PATTERN[0].attack, 0.1)).toBeCloseTo(0.9);
  });
});

describe("phaseStep", () => {
  it("advances one beat per period", () => {
    expect(phaseStep(0.2, 150)).toBeCloseTo(0.5);
    expect(phaseStep(0.1, 60)).toBeCloseTo(0.1);
  });

  it("ignores bad frame times and caps long stalls", () => {
    expect(phaseStep(-1, 72)).toBe(0);
    expect(phaseStep(Number.NaN, 72)).toBe(0);
    expect(phaseStep(30, 60)).toBeCloseTo(0.25);
  });
});
