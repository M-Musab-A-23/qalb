import { describe, expect, it } from "vitest";
import { RollingTrace } from "./buffer";

describe("RollingTrace", () => {
  it("holds samples in order", () => {
    const trace = new RollingTrace(10, 10);
    trace.pushSamples(0, [1, 2, 3]);
    expect(trace.length).toBe(3);
    expect([0, 1, 2].map((i) => trace.at(i))).toEqual([1, 2, 3]);
    expect(trace.end).toBeCloseTo(0.2);
    expect(trace.start).toBeCloseTo(0);
  });

  it("never grows past its capacity and keeps the newest samples", () => {
    const trace = new RollingTrace(1, 10);
    expect(trace.capacity).toBe(10);
    for (let block = 0; block < 100; block += 1) {
      trace.pushSamples(block * 0.5, [0, 1, 2, 3, 4].map((i) => block * 5 + i));
    }
    expect(trace.length).toBe(10);
    expect(trace.at(9)).toBe(499);
    expect(trace.at(0)).toBe(490);
    expect(trace.end - trace.start).toBeCloseTo(0.9);
  });

  it("maps an index to stream time", () => {
    const trace = new RollingTrace(1, 10);
    trace.pushSamples(5, Array.from({ length: 10 }, (_, i) => i));
    expect(trace.timeAt(0)).toBeCloseTo(5);
    expect(trace.timeAt(9)).toBeCloseTo(5.9);
  });

  it("restarts after a gap instead of joining the two pieces", () => {
    const trace = new RollingTrace(10, 10);
    trace.pushSamples(0, [1, 2, 3]);
    trace.pushSamples(50, [9, 9]);
    expect(trace.length).toBe(2);
    expect(trace.start).toBeCloseTo(50);
  });

  it("accepts a contiguous block without restarting", () => {
    const trace = new RollingTrace(10, 10);
    trace.pushSamples(0, [1, 2, 3]);
    trace.pushSamples(0.3, [4, 5]);
    expect(trace.length).toBe(5);
  });

  it("ignores an empty block", () => {
    const trace = new RollingTrace(10, 10);
    trace.pushSamples(0, []);
    expect(trace.length).toBe(0);
  });

  it("drops beat markers that have scrolled out of the window", () => {
    const trace = new RollingTrace(2, 10);
    trace.pushSamples(0, new Array(20).fill(0));
    trace.pushBeat({ t: 0.5, cls: "N" });
    trace.pushSamples(2, new Array(20).fill(0));
    trace.pushSamples(4, new Array(20).fill(0));
    expect(trace.beats.find((b) => b.t === 0.5)).toBeUndefined();
  });

  it("caps the number of beat markers", () => {
    const trace = new RollingTrace(1000, 10, 5);
    trace.pushSamples(0, new Array(10).fill(0));
    for (let i = 0; i < 20; i += 1) trace.pushBeat({ t: 0.1, cls: "V" });
    expect(trace.beats).toHaveLength(5);
  });

  it("reset empties the trace", () => {
    const trace = new RollingTrace(2, 10);
    trace.pushSamples(0, [1, 2]);
    trace.pushBeat({ t: 0, cls: "N" });
    trace.reset();
    expect(trace.length).toBe(0);
    expect(trace.beats).toHaveLength(0);
  });
});
