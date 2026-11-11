import { describe, expect, it } from "vitest";
import {
  deriveStatus,
  initialMonitorState,
  MAX_ALERTS_KEPT,
  qualityLabel,
  reduceMonitor,
  rhythmLabel,
} from "./state";
import type { LiveAlert, LiveStatus } from "./types";

const status = (over: Partial<LiveStatus> = {}): LiveStatus => ({
  type: "status",
  state: "streaming",
  record: "233",
  speed: 1,
  t: 10,
  recordT: 10,
  loop: 0,
  heartRate: 80,
  rhythm: "regular",
  quality: 0.9,
  nBeats: 12,
  warnings: [],
  ...over,
});

const alert = (id: string, severity: LiveAlert["severity"], t = 10): LiveAlert => ({
  type: "alert",
  id,
  alertType: "ventricular_run",
  severity,
  confidence: 0.8,
  message: "m",
  t,
  endT: t,
  recordT: t,
});

describe("reduceMonitor", () => {
  it("takes heart rate, rhythm and quality from a status", () => {
    const state = reduceMonitor(initialMonitorState(), status());
    expect(state).toMatchObject({ heartRate: 80, rhythm: "regular", quality: 0.9, now: 10 });
  });

  it("keeps the last good heart rate when a window gives none", () => {
    let state = reduceMonitor(initialMonitorState(), status());
    state = reduceMonitor(state, status({ heartRate: null, rhythm: null, quality: 0.5, t: 12 }));
    expect(state).toMatchObject({ heartRate: 80, rhythm: "regular", quality: 0.5 });
  });

  it("starts over when a stream starts", () => {
    let state = reduceMonitor(initialMonitorState(), status());
    state = reduceMonitor(state, alert("a", "high"));
    state = reduceMonitor(state, status({ state: "started", t: 0, heartRate: null }));
    expect(state.alerts).toHaveLength(0);
    expect(state.heartRate).toBeNull();
  });

  it("does not reset on a loop", () => {
    let state = reduceMonitor(initialMonitorState(), status());
    state = reduceMonitor(state, status({ state: "loop", loop: 1, t: 1805, heartRate: null }));
    expect(state.loop).toBe(1);
    expect(state.heartRate).toBe(80);
  });

  it("counts beats by class and compares them with the annotations", () => {
    const state = reduceMonitor(initialMonitorState(), {
      type: "beats",
      beats: [
        { t: 1, recordT: 1, cls: "N", confidence: 0.9, groundTruth: "N" },
        { t: 2, recordT: 2, cls: "V", confidence: 0.9, groundTruth: "N" },
        { t: 3, recordT: 3, cls: "V", confidence: 0.9, groundTruth: "V" },
        { t: 4, recordT: 4, cls: "N", confidence: 0.9 },
      ],
    });
    expect(state.counts).toMatchObject({ N: 2, V: 2, S: 0 });
    expect(state.compared).toBe(3);
    expect(state.agreed).toBe(2);
  });

  it("adds alerts newest first, once each, and caps the list", () => {
    let state = initialMonitorState();
    state = reduceMonitor(state, alert("a", "medium"));
    state = reduceMonitor(state, alert("a", "medium"));
    expect(state.alerts).toHaveLength(1);
    for (let i = 0; i < MAX_ALERTS_KEPT + 10; i += 1) {
      state = reduceMonitor(state, alert(`b${i}`, "low"));
    }
    expect(state.alerts).toHaveLength(MAX_ALERTS_KEPT);
    expect(state.alerts[0].id).toBe(`b${MAX_ALERTS_KEPT + 9}`);
  });

  it("moves the clock on samples without touching the cards", () => {
    const before = reduceMonitor(initialMonitorState(), status());
    const after = reduceMonitor(before, {
      type: "samples",
      seq: 1,
      t: 11,
      recordT: 21,
      fs: 120,
      values: [0],
    });
    expect(after).toMatchObject({ now: 11, recordT: 21, heartRate: 80 });
  });
});

describe("deriveStatus", () => {
  const base = { ...initialMonitorState(), now: 20 };

  it("is normal with no recent alert", () => {
    expect(deriveStatus(base)).toBe("normal");
  });

  it("is critical for a recent high alert", () => {
    expect(deriveStatus({ ...base, alerts: [alert("a", "high", 15)] })).toBe("critical");
  });

  it("is warning for a medium alert or an irregular rhythm", () => {
    expect(deriveStatus({ ...base, alerts: [alert("a", "medium", 15)] })).toBe("warning");
    expect(deriveStatus({ ...base, rhythm: "irregular" })).toBe("warning");
  });

  it("returns to normal once alerts are older than the horizon", () => {
    expect(deriveStatus({ ...base, now: 100, alerts: [alert("a", "high", 15)] })).toBe("normal");
  });

  it("does not treat a low alert as a status change", () => {
    expect(deriveStatus({ ...base, alerts: [alert("a", "low", 19)] })).toBe("normal");
  });
});

describe("labels", () => {
  it("words the rhythm", () => {
    expect(rhythmLabel("regular")).toBe("Regular rhythm");
    expect(rhythmLabel("irregular")).toBe("Irregular rhythm");
    expect(rhythmLabel("insufficient data")).toBe("Collecting data");
    expect(rhythmLabel(null)).toBe("Collecting data");
  });

  it("words the signal quality", () => {
    expect(qualityLabel(0.9)).toBe("Good");
    expect(qualityLabel(0.5)).toBe("Fair");
    expect(qualityLabel(0.1)).toBe("Poor");
    expect(qualityLabel(null)).toBe("Unknown");
  });
});
