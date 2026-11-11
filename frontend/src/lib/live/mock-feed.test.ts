import { describe, expect, it } from "vitest";
import { createMockFeed, MOCK_FS } from "./mock-feed";
import { createSyntheticEcg, seededRandom } from "./synthetic";
import type { LiveBeat, LiveSamples, LiveStatus, LiveTarget } from "./types";

const target: LiveTarget = { record: "233", speed: 1, offsetSeconds: 0 };

/** A timer the test steps by hand, so nothing waits in real time. */
function manualTimer() {
  let tick: (() => void) | null = null;
  return {
    setTimer: (fn: () => void) => {
      tick = fn;
      return () => {
        tick = null;
      };
    },
    step(n = 1) {
      for (let i = 0; i < n; i += 1) tick?.();
    },
    get running() {
      return tick !== null;
    },
  };
}

function collect(speed: 1 | 2 | 5 = 1, ticks = 80, record = "233") {
  const timer = manualTimer();
  const feed = createMockFeed({ setTimer: timer.setTimer });
  const samples: LiveSamples[] = [];
  const beats: LiveBeat[] = [];
  const statuses: LiveStatus[] = [];
  const alerts: string[] = [];
  feed.onSamples((e) => samples.push(e));
  feed.onBeats((e) => beats.push(...e.beats));
  feed.onStatus((e) => statuses.push(e));
  feed.onAlert((e) => alerts.push(e.alertType));
  feed.connect({ ...target, record, speed });
  timer.step(ticks);
  return { feed, timer, samples, beats, statuses, alerts };
}

describe("createMockFeed", () => {
  it("reports itself as a live mock feed", () => {
    const { feed } = collect(1, 0);
    expect(feed.getConnection()).toMatchObject({ kind: "mock", state: "live" });
  });

  it("emits 250 ms of samples per tick at the wire rate", () => {
    const { samples } = collect(1, 4);
    expect(samples).toHaveLength(4);
    expect(samples[0].values).toHaveLength(Math.round(0.25 * MOCK_FS));
    expect(samples[1].t).toBeCloseTo(0.25);
    expect(samples.every((s) => s.fs === MOCK_FS)).toBe(true);
  });

  it("scales the signal per tick with the speed", () => {
    const { samples } = collect(5, 1);
    expect(samples[0].values).toHaveLength(Math.round(1.25 * MOCK_FS));
  });

  it("produces a trace that looks like an ECG, with tall peaks", () => {
    const { samples } = collect(1, 40);
    const all = samples.flatMap((s) => s.values);
    expect(Math.max(...all)).toBeGreaterThan(0.8);
    expect(Math.min(...all)).toBeLessThan(0.1);
    expect(all.every(Number.isFinite)).toBe(true);
  });

  it("announces the stream, then reports heart rate, rhythm and quality every two seconds", () => {
    const { statuses } = collect(1, 40);
    expect(statuses[0].state).toBe("started");
    const analysed = statuses.filter((s) => s.state === "streaming");
    expect(analysed).toHaveLength(5);
    const last = analysed[analysed.length - 1];
    expect(last.heartRate).toBeGreaterThan(40);
    expect(last.heartRate).toBeLessThan(120);
    expect(last.quality).toBeGreaterThan(0.8);
    expect(["regular", "irregular"]).toContain(last.rhythm);
  });

  it("includes occasional ventricular beats", () => {
    const { beats } = collect(5, 400, "233");
    const classes = new Set(beats.map((b) => b.cls));
    expect(classes.has("N")).toBe(true);
    expect(classes.has("V")).toBe(true);
    const share = beats.filter((b) => b.cls === "V").length / beats.length;
    expect(share).toBeGreaterThan(0.02);
    expect(share).toBeLessThan(0.4);
  });

  it("sends every beat once and in order", () => {
    const { beats } = collect(2, 200);
    const times = beats.map((b) => b.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
  });

  it("is repeatable for the same record and different for another", () => {
    const a = collect(1, 40, "233").samples.flatMap((s) => s.values);
    const b = collect(1, 40, "233").samples.flatMap((s) => s.values);
    const c = collect(1, 40, "100").samples.flatMap((s) => s.values);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("leaves out samples for a status-only feed", () => {
    const timer = manualTimer();
    const feed = createMockFeed({ setTimer: timer.setTimer });
    const samples: unknown[] = [];
    const statuses: unknown[] = [];
    feed.onSamples((e) => samples.push(e));
    feed.onStatus((e) => statuses.push(e));
    feed.connect({ ...target, samples: false });
    timer.step(16);
    expect(samples).toHaveLength(0);
    expect(statuses.length).toBeGreaterThan(1);
  });

  it("raises a couplet alert when two ventricular beats come together", () => {
    const { alerts } = collect(5, 1500, "233");
    expect(alerts).toContain("ventricular_couplet");
  });

  it("stops on disconnect and can be started again", () => {
    const { feed, timer, samples } = collect(1, 4);
    feed.disconnect();
    expect(timer.running).toBe(false);
    expect(feed.getConnection().state).toBe("idle");
    timer.step(5);
    expect(samples).toHaveLength(4);
    feed.connect(target);
    expect(timer.running).toBe(true);
    feed.disconnect();
  });
});

describe("createSyntheticEcg", () => {
  it("keeps memory flat once old beats are forgotten", () => {
    const ecg = createSyntheticEcg({ bpm: 70, ventricularRate: 0.1 }, seededRandom(1));
    for (let t = 0; t < 3600; t += 10) {
      ecg.extendTo(t);
      ecg.forgetBefore(t - 30);
    }
    expect(ecg.beats.length).toBeLessThan(60);
  });

  it("spaces normal beats by the heart rate", () => {
    const ecg = createSyntheticEcg({ bpm: 60, ventricularRate: 0 }, seededRandom(1));
    ecg.extendTo(30);
    const gaps = ecg.beats.slice(1).map((b, i) => b.t - ecg.beats[i].t);
    expect(Math.min(...gaps)).toBeGreaterThan(0.9);
    expect(Math.max(...gaps)).toBeLessThan(1.1);
  });
});
