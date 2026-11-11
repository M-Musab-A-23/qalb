import { describe, expect, it } from "vitest";
import { parseLiveEvent, parseLiveMessage } from "./parse";

describe("parseLiveEvent", () => {
  it("parses a samples event", () => {
    const event = parseLiveEvent({
      type: "samples",
      seq: 3,
      t: 1.5,
      record_t: 101.5,
      fs: 120,
      values: [0.1, 0.2],
    });
    expect(event).toEqual({
      type: "samples",
      seq: 3,
      t: 1.5,
      recordT: 101.5,
      fs: 120,
      values: [0.1, 0.2],
    });
  });

  it("rejects samples with non-numeric values or a bad rate", () => {
    expect(parseLiveEvent({ type: "samples", t: 0, fs: 120, values: [1, "x"] })).toBeNull();
    expect(parseLiveEvent({ type: "samples", t: 0, fs: 0, values: [1] })).toBeNull();
    expect(parseLiveEvent({ type: "samples", t: 0, fs: 120 })).toBeNull();
  });

  it("parses beats and keeps ground truth separate from the class", () => {
    const event = parseLiveEvent({
      type: "beats",
      beats: [
        { t: 1, record_t: 11, class: "V", confidence: 0.9, ground_truth: "N" },
        { t: 2, class: "N", confidence: 0.8 },
      ],
    });
    expect(event).toMatchObject({ type: "beats" });
    if (event?.type !== "beats") throw new Error("not beats");
    expect(event.beats[0]).toMatchObject({ cls: "V", groundTruth: "N" });
    expect(event.beats[1].groundTruth).toBeUndefined();
  });

  it("treats a missing annotation as null ground truth", () => {
    const event = parseLiveEvent({
      type: "beats",
      beats: [{ t: 1, class: "N", confidence: 0.5, ground_truth: null }],
    });
    if (event?.type !== "beats") throw new Error("not beats");
    expect(event.beats[0].groundTruth).toBeNull();
  });

  it("drops malformed beats but keeps the good ones", () => {
    const event = parseLiveEvent({
      type: "beats",
      beats: [{ t: 1, class: "Z", confidence: 1 }, { t: 2, class: "S", confidence: 0.4 }],
    });
    if (event?.type !== "beats") throw new Error("not beats");
    expect(event.beats).toHaveLength(1);
    expect(event.beats[0].cls).toBe("S");
  });

  it("parses an alert and fills the optional times", () => {
    const event = parseLiveEvent({
      type: "alert",
      id: "233-ventricular_couplet-1",
      alert_type: "ventricular_couplet",
      severity: "medium",
      confidence: 0.7,
      message: "two V beats",
      t: 4,
    });
    expect(event).toMatchObject({ type: "alert", severity: "medium", endT: 4, recordT: 4 });
  });

  it("rejects an alert with an unknown severity", () => {
    expect(
      parseLiveEvent({ type: "alert", id: "a", alert_type: "x", severity: "urgent", message: "m", t: 1 }),
    ).toBeNull();
  });

  it("parses a status event with nulls before the first analysis", () => {
    const event = parseLiveEvent({
      type: "status",
      state: "started",
      record: "233",
      speed: 2,
      t: 0,
      record_t: 50,
      loop: 0,
      hr_bpm: null,
      rhythm: null,
      quality: null,
    });
    expect(event).toMatchObject({
      type: "status",
      state: "started",
      heartRate: null,
      rhythm: null,
      quality: null,
      warnings: [],
    });
  });

  it("parses heart rate, rhythm and quality from a streaming status", () => {
    const event = parseLiveEvent({
      type: "status",
      state: "streaming",
      record: "100",
      speed: 1,
      t: 10,
      record_t: 10,
      loop: 1,
      hr_bpm: 72.4,
      rhythm: "regular",
      quality: 0.88,
      n_beats: 12,
      warnings: ["low quality", 4],
    });
    expect(event).toMatchObject({ heartRate: 72.4, rhythm: "regular", quality: 0.88, nBeats: 12, loop: 1 });
    expect((event as { warnings: string[] }).warnings).toEqual(["low quality"]);
  });

  it("ignores unknown types and non-objects", () => {
    expect(parseLiveEvent({ type: "ping" })).toBeNull();
    expect(parseLiveEvent(null)).toBeNull();
    expect(parseLiveEvent([1, 2])).toBeNull();
    expect(parseLiveEvent("samples")).toBeNull();
  });
});

describe("parseLiveMessage", () => {
  it("decodes JSON text", () => {
    expect(parseLiveMessage('{"type":"beats","beats":[]}')).toEqual({ type: "beats", beats: [] });
  });

  it("returns null for invalid JSON", () => {
    expect(parseLiveMessage("{not json")).toBeNull();
  });
});
