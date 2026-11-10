import { describe, expect, it } from "vitest";
import { parseAnalysisResult, ResultParseError } from "./parse";

// The example from ml/README.md, trimmed to a few beats.
function sample() {
  return {
    schema_version: "1.0",
    model: { name: "gradient_boosting", version: "1.0" },
    sampling_rate_in: 360.0,
    sampling_rate_model: 360.0,
    duration_s: 30.0,
    beats: [
      { sample: 215, time_s: 0.597, class: "N", confidence: 0.98 },
      { sample: 4210, time_s: 11.694, class: "V", confidence: 0.81 },
    ],
    rhythm: {
      n_beats: 38,
      class_counts: { N: 36, S: 0, V: 2, F: 0, Q: 0 },
      mean_hr_bpm: 76.1,
      rr_mean_s: 0.788,
      rr_cv: 0.09,
      rr_jump_fraction: 0.11,
      rhythm: "regular",
    },
    alerts: [
      {
        type: "ventricular_couplet",
        severity: "medium",
        confidence: 0.71,
        start_sample: 4200,
        end_sample: 4690,
        message: "Ventricular pattern: two consecutive ventricular beats",
      },
    ],
    quality: {
      score: 0.82,
      flatline_fraction: 0.0,
      noise_ratio: 0.01,
      beat_agreement: 0.93,
      rate_plausibility: 1.0,
    },
    warnings: [],
    disclaimer: "QALB is a research and monitoring prototype.",
    input: { filename: "x.csv", original_sampling_rate: 360 },
  };
}

describe("parseAnalysisResult", () => {
  it("maps the service schema to the app type", () => {
    const result = parseAnalysisResult(sample());
    expect(result.durationS).toBe(30);
    expect(result.beats[1]).toEqual({
      sample: 4210,
      timeS: 11.694,
      cls: "V",
      confidence: 0.81,
    });
    expect(result.rhythm.classCounts.V).toBe(2);
    expect(result.rhythm.meanHrBpm).toBe(76.1);
    expect(result.quality.score).toBe(0.82);
    expect(result.input).toEqual({ filename: "x.csv", originalSamplingRate: 360 });
  });

  it("converts alert sample positions to seconds", () => {
    const [alert] = parseAnalysisResult(sample()).alerts;
    expect(alert.startS).toBeCloseTo(11.667, 3);
    expect(alert.endS).toBeCloseTo(13.028, 3);
    expect(alert.severity).toBe("medium");
  });

  it("keeps missing optional metrics as null", () => {
    const json = sample();
    json.rhythm.mean_hr_bpm = null as unknown as number;
    json.rhythm.rhythm = "insufficient data";
    const result = parseAnalysisResult(json);
    expect(result.rhythm.meanHrBpm).toBeNull();
    expect(result.rhythm.rhythm).toBe("insufficient data");
  });

  it("accepts a result without an input block", () => {
    const json: Record<string, unknown> = sample();
    delete json.input;
    expect(parseAnalysisResult(json).input.filename).toBeNull();
  });

  it("rejects non-objects and missing sections with a readable message", () => {
    expect(() => parseAnalysisResult(null)).toThrow(ResultParseError);
    expect(() => parseAnalysisResult([])).toThrow(/result should be an object/);
    const json: Record<string, unknown> = sample();
    delete json.rhythm;
    expect(() => parseAnalysisResult(json)).toThrow(/rhythm should be an object/);
  });

  it("rejects an unknown beat class", () => {
    const json = sample();
    json.beats[0].class = "X";
    expect(() => parseAnalysisResult(json)).toThrow(/beats\[0\]\.class/);
  });

  it("rejects non-numeric beat values", () => {
    const json = sample();
    (json.beats[1] as Record<string, unknown>).time_s = "11.7";
    expect(() => parseAnalysisResult(json)).toThrow(/beats\[1\]\.time_s/);
  });

  it("rejects an unknown severity", () => {
    const json = sample();
    json.alerts[0].severity = "urgent";
    expect(() => parseAnalysisResult(json)).toThrow(/alerts\[0\]\.severity/);
  });

  it("rejects a schema version it does not know", () => {
    const json = sample();
    json.schema_version = "2.0";
    expect(() => parseAnalysisResult(json)).toThrow(/schema 2\.0/);
  });

  it("rejects a zero sampling rate", () => {
    const json = sample();
    json.sampling_rate_in = 0;
    expect(() => parseAnalysisResult(json)).toThrow(/greater than zero/);
  });
});
