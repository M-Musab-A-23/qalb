import { describe, expect, it } from "vitest";
import {
  DEFAULT_BPM,
  MAX_BPM,
  MIN_BPM,
  beatPeriodSeconds,
  normalizeBpm,
} from "./bpm";

describe("normalizeBpm", () => {
  it("keeps a normal rate", () => {
    expect(normalizeBpm(80)).toBe(80);
  });

  it("falls back to the default for missing or invalid values", () => {
    expect(normalizeBpm(undefined)).toBe(DEFAULT_BPM);
    expect(normalizeBpm(null)).toBe(DEFAULT_BPM);
    expect(normalizeBpm(Number.NaN)).toBe(DEFAULT_BPM);
    expect(normalizeBpm(Number.POSITIVE_INFINITY)).toBe(DEFAULT_BPM);
    expect(normalizeBpm(0)).toBe(DEFAULT_BPM);
    expect(normalizeBpm(-10)).toBe(DEFAULT_BPM);
  });

  it("clamps to the supported range", () => {
    expect(normalizeBpm(5)).toBe(MIN_BPM);
    expect(normalizeBpm(900)).toBe(MAX_BPM);
  });
});

describe("beatPeriodSeconds", () => {
  it("is 60 divided by the rate", () => {
    expect(beatPeriodSeconds(60)).toBe(1);
    expect(beatPeriodSeconds(120)).toBeCloseTo(0.5);
  });

  it("uses the default rate when none is given", () => {
    expect(beatPeriodSeconds(undefined)).toBeCloseTo(60 / DEFAULT_BPM);
  });
});
