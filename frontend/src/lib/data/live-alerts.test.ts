import { describe, expect, it, vi } from "vitest";
import type { LiveAlert } from "@/lib/live/types";
import { alertTitle, createLiveAlertStore, type LiveAlertInput } from "./live-alerts";

function alert(over: Partial<LiveAlert> = {}): LiveAlert {
  return {
    type: "alert",
    id: "233-ventricular_couplet-100",
    alertType: "ventricular_couplet",
    severity: "medium",
    confidence: 0.76,
    message: "Ventricular pattern: two consecutive ventricular beats",
    t: 5,
    endT: 6,
    recordT: 5,
    ...over,
  };
}

function input(over: Partial<LiveAlertInput> = {}, a: Partial<LiveAlert> = {}): LiveAlertInput {
  return {
    patientId: "P-0042",
    deviceId: "ESP32-01",
    record: "233",
    alert: alert(a),
    source: "live-replay",
    ...over,
  };
}

function clockStore(options: { cooldownMs?: number; max?: number } = {}) {
  let ms = new Date(2026, 0, 1, 9, 5, 7).getTime();
  const store = createLiveAlertStore({ ...options, now: () => ms });
  return { store, advance: (by: number) => (ms += by) };
}

describe("createLiveAlertStore", () => {
  it("adds an alert as an AlertItem marked with its source", () => {
    const { store } = clockStore();
    const item = store.add(input());
    expect(item).toMatchObject({
      severity: "warning",
      title: "Ventricular couplet",
      patientId: "P-0042",
      deviceId: "ESP32-01",
      time: "09:05:07",
      acknowledged: false,
      source: "live-replay",
    });
    expect(item?.note).toContain("Live replay");
    expect(item?.note).toContain("76%");
    expect(store.list()).toHaveLength(1);
  });

  it("does not call a simulated alert a model result", () => {
    const { store } = clockStore();
    const item = store.add(input({ source: "simulated" }));
    expect(item?.source).toBe("simulated");
    expect(item?.note).toBe("Simulated feed, not a model result");
  });

  it("maps severity to the dashboard status", () => {
    const { store } = clockStore();
    expect(store.add(input({}, { alertType: "ventricular_run", severity: "high" }))?.severity).toBe("critical");
    expect(store.add(input({}, { alertType: "fast_rate", severity: "low" }))?.severity).toBe("normal");
  });

  it("does not repeat the same pattern for the same patient inside the cooldown", () => {
    const { store, advance } = clockStore({ cooldownMs: 60_000 });
    expect(store.add(input())).not.toBeNull();
    advance(10_000);
    expect(store.add(input({}, { id: "other-id" }))).toBeNull();
    advance(49_000);
    expect(store.add(input())).toBeNull();
    expect(store.list()).toHaveLength(1);
  });

  it("allows the pattern again after the cooldown", () => {
    const { store, advance } = clockStore({ cooldownMs: 60_000 });
    store.add(input());
    advance(60_000);
    expect(store.add(input())).not.toBeNull();
    expect(store.list()).toHaveLength(2);
  });

  it("does not flood the list when a pattern repeats for a long time", () => {
    const { store, advance } = clockStore({ cooldownMs: 60_000 });
    for (let i = 0; i < 120; i += 1) {
      store.add(input());
      advance(2_000); // one analysis every two seconds for four minutes
    }
    expect(store.list().length).toBeLessThanOrEqual(4);
  });

  it("treats other patients and other alert types separately", () => {
    const { store } = clockStore();
    store.add(input());
    expect(store.add(input({ patientId: "P-0017", deviceId: "ESP32-02" }))).not.toBeNull();
    expect(store.add(input({}, { alertType: "irregular_rhythm" }))).not.toBeNull();
    expect(store.list()).toHaveLength(3);
  });

  it("lets a worse alert of the same type through inside the cooldown", () => {
    const { store, advance } = clockStore();
    store.add(input({}, { alertType: "ventricular_run", severity: "medium" }));
    advance(1000);
    expect(store.add(input({}, { alertType: "ventricular_run", severity: "high" }))).not.toBeNull();
    advance(1000);
    expect(store.add(input({}, { alertType: "ventricular_run", severity: "high" }))).toBeNull();
  });

  it("lists newest first and keeps no more than max", () => {
    const { store, advance } = clockStore({ cooldownMs: 0, max: 3 });
    for (let i = 0; i < 5; i += 1) {
      store.add(input({}, { message: `m${i}` }));
      advance(1000);
    }
    expect(store.list().map((a) => a.detail)).toEqual(["m4", "m3", "m2"]);
  });

  it("acknowledges one alert or all of them", () => {
    const { store } = clockStore();
    const a = store.add(input());
    store.add(input({ patientId: "P-0017" }));
    store.acknowledge(a!.id);
    expect(store.list().filter((x) => x.acknowledged)).toHaveLength(1);
    store.acknowledgeAll();
    expect(store.list().every((x) => x.acknowledged)).toBe(true);
  });

  it("notifies subscribers on change only and hands out a new array each time", () => {
    const { store } = clockStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    const empty = store.list();
    store.add(input());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.list()).not.toBe(empty);
    store.acknowledgeAll();
    store.acknowledgeAll(); // nothing left to change
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    store.clear();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("clear empties the list and forgets the cooldown", () => {
    const { store } = clockStore();
    store.add(input());
    store.clear();
    expect(store.list()).toHaveLength(0);
    expect(store.add(input())).not.toBeNull();
  });
});

describe("alertTitle", () => {
  it("words known and unknown alert types", () => {
    expect(alertTitle("fast_rate")).toBe("Fast heart rate");
    expect(alertTitle("new_pattern_found")).toBe("New pattern found");
    expect(alertTitle("")).toBe("Rhythm alert");
  });
});
