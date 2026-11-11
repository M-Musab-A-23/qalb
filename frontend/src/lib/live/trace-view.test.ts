import { describe, expect, it } from "vitest";
import { easeRange, isMismatch, markerLabel, timeToX, viewEdge } from "./trace-view";

describe("viewEdge", () => {
  it("sits at the newest sample before anything has arrived", () => {
    expect(viewEdge(5, 0, 1000, 1)).toBe(5);
  });

  it("starts a block behind and advances with the clock", () => {
    expect(viewEdge(10, 1000, 1000, 1)).toBeCloseTo(9.75);
    expect(viewEdge(10, 1000, 1100, 1)).toBeCloseTo(9.85);
  });

  it("moves faster at higher replay speeds", () => {
    expect(viewEdge(10, 1000, 1100, 5)).toBeCloseTo(10 - 1.25 + 0.5);
  });

  it("never runs past the newest sample", () => {
    expect(viewEdge(10, 1000, 9000, 1)).toBe(10);
  });
});

describe("timeToX", () => {
  it("maps the window onto the width", () => {
    expect(timeToX(10, 10, 8, 800)).toBe(800);
    expect(timeToX(6, 10, 8, 800)).toBe(400);
    expect(timeToX(2, 10, 8, 800)).toBe(0);
  });
});

describe("easeRange", () => {
  it("starts at the target", () => {
    expect(easeRange(null, { lo: -1, hi: 1 })).toEqual({ lo: -1, hi: 1 });
  });

  it("moves part of the way", () => {
    const next = easeRange({ lo: 0, hi: 1 }, { lo: -1, hi: 3 }, 0.5);
    expect(next).toEqual({ lo: -0.5, hi: 2 });
  });
});

describe("markerLabel", () => {
  it("shows only the class when the annotation agrees or is absent", () => {
    expect(markerLabel("V", "V")).toBe("V");
    expect(markerLabel("N")).toBe("N");
    expect(markerLabel("N", null)).toBe("N");
  });

  it("shows the annotated class when it differs", () => {
    expect(markerLabel("V", "N")).toBe("V (ref N)");
    expect(isMismatch("V", "N")).toBe(true);
    expect(isMismatch("V", "V")).toBe(false);
    expect(isMismatch("V", null)).toBe(false);
  });
});
