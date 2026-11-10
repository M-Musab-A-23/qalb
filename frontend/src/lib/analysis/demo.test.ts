import { describe, expect, it } from "vitest";
import { offlineDemoResult, samples } from "./demo";
import { parseSignalText } from "./signal";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("sample results", () => {
  it("parse against the result schema", () => {
    for (const sample of samples) {
      const result = offlineDemoResult(sample.id);
      expect(result.beats.length).toBe(result.rhythm.nBeats);
      expect(result.input.filename).toBe(sample.file);
    }
  });

  it("describe a normal and a ventricular recording", () => {
    expect(offlineDemoResult("normal").alerts).toHaveLength(0);
    const ventricular = offlineDemoResult("ventricular");
    expect(ventricular.rhythm.classCounts.V).toBeGreaterThan(0);
    expect(ventricular.alerts.some((alert) => alert.severity === "high")).toBe(true);
  });

  it("match the sample files shipped in public/samples", () => {
    for (const sample of samples) {
      const text = readFileSync(path.join("public", "samples", sample.file), "utf8");
      const signal = parseSignalText(text, 360);
      const result = offlineDemoResult(sample.id);
      expect(signal.samples.length / signal.fs).toBeCloseTo(result.durationS, 0);
    }
  });
});
