import { describe, expect, it } from "vitest";
import { offlineDemoResult } from "./demo";
import {
  countsLine,
  formatClock,
  formatDuration,
  heartRateSummary,
  qualitySummary,
  rhythmSummary,
  severityStatus,
} from "./summary";

describe("summaries", () => {
  it("classifies heart rate", () => {
    expect(heartRateSummary(72)).toEqual({ status: "normal", label: "In range" });
    expect(heartRateSummary(100).status).toBe("normal");
    expect(heartRateSummary(101).label).toBe("Fast");
    expect(heartRateSummary(49).label).toBe("Slow");
    expect(heartRateSummary(null).label).toBe("Not enough beats");
  });

  it("describes the rhythm", () => {
    expect(rhythmSummary("regular").value).toBe("Regular");
    expect(rhythmSummary("irregular").status).toBe("warning");
    expect(rhythmSummary("insufficient data").value).toBe("Unknown");
  });

  it("grades signal quality at the service threshold", () => {
    expect(qualitySummary(0.9).label).toBe("Good");
    expect(qualitySummary(0.5).label).toBe("Fair");
    expect(qualitySummary(0.34)).toEqual({ status: "critical", label: "Poor" });
  });

  it("maps severities to statuses", () => {
    expect(severityStatus("high")).toBe("critical");
    expect(severityStatus("medium")).toBe("warning");
    expect(severityStatus("low")).toBe("warning");
  });
});

describe("formatting", () => {
  it("formats clock times", () => {
    expect(formatClock(0)).toBe("0:00.0");
    expect(formatClock(12.34)).toBe("0:12.3");
    expect(formatClock(72.4)).toBe("1:12.4");
    expect(formatClock(-1)).toBe("0:00.0");
  });

  it("formats durations", () => {
    expect(formatDuration(30.24)).toBe("30 s");
    expect(formatDuration(125)).toBe("2 min 05 s");
  });

  it("lists only the classes that occur", () => {
    expect(countsLine(offlineDemoResult("normal"))).toBe("N 37");
    expect(countsLine(offlineDemoResult("ventricular"))).toBe("N 20 · V 22 · F 8");
  });
});
