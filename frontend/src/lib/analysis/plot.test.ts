import { describe, expect, it } from "vitest";
import { clampWindow, decimateMinMax, peakIndexNear, valueRange } from "./plot";

describe("decimateMinMax", () => {
  it("keeps a single tall spike when many samples share a column", () => {
    const samples = new Array<number>(1000).fill(0);
    samples[503] = 5;
    const columns = decimateMinMax(samples, 0, 1000, 10);
    expect(columns).toHaveLength(10);
    expect(Math.max(...columns.map((column) => column.max))).toBe(5);
    expect(columns[5].max).toBe(5);
  });

  it("returns one column per sample when there are fewer samples than columns", () => {
    const columns = decimateMinMax([1, 2, 3], 0, 3, 3);
    expect(columns.map((column) => column.min)).toEqual([1, 2, 3]);
  });

  it("returns nothing for an empty range", () => {
    expect(decimateMinMax([1, 2], 5, 8, 10)).toEqual([]);
    expect(decimateMinMax([1, 2], 0, 2, 0)).toEqual([]);
  });
});

describe("valueRange", () => {
  it("pads the range", () => {
    const range = valueRange([0, 10], 0, 2);
    expect(range.min).toBeLessThan(0);
    expect(range.max).toBeGreaterThan(10);
  });

  it("handles flat and empty input", () => {
    expect(valueRange([3, 3, 3], 0, 3).max).toBeGreaterThan(3);
    expect(valueRange([], 0, 0)).toEqual({ min: -1, max: 1 });
  });
});

describe("peakIndexNear", () => {
  it("finds the nearby maximum", () => {
    const samples = [0, 0, 1, 9, 2, 0, 0, 0];
    expect(peakIndexNear(samples, 5, 3)).toBe(3);
  });

  it("stays inside the recording", () => {
    expect(peakIndexNear([1, 2], 50, 5)).toBe(1);
  });
});

describe("clampWindow", () => {
  it("keeps the window inside the recording", () => {
    expect(clampWindow(25, 10, 30)).toEqual({ start: 20, end: 30 });
    expect(clampWindow(-4, 10, 30)).toEqual({ start: 0, end: 10 });
  });

  it("shows everything when the window is longer than the recording", () => {
    expect(clampWindow(3, 60, 30)).toEqual({ start: 0, end: 30 });
  });
});
