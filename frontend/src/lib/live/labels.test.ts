import { describe, expect, it } from "vitest";
import { describeConnection, sourceSubtitle, traceNote } from "./labels";
import type { FeedConnection } from "./types";

const base: FeedConnection = { state: "live", kind: "replay", attempt: 0, message: null };

describe("describeConnection", () => {
  it("names a live replay", () => {
    expect(describeConnection(base, false)).toMatchObject({ label: "Live replay", status: "normal" });
  });

  it("names the simulated feed and says why it is shown", () => {
    const result = describeConnection(
      { ...base, kind: "mock", message: "The ML service is not running, so a simulated feed is shown." },
      false,
    );
    expect(result).toMatchObject({ label: "Simulated feed", status: "warning" });
    expect(result.hint).toContain("not running");
  });

  it("shows reconnecting with the reason", () => {
    const result = describeConnection({ ...base, state: "reconnecting", attempt: 1, message: "down" }, false);
    expect(result).toMatchObject({ label: "Reconnecting", status: "warning", hint: "down" });
  });

  it("shows a clear state when the service is not running", () => {
    const result = describeConnection({ ...base, state: "unavailable", attempt: 3 }, false);
    expect(result).toMatchObject({ label: "ML service not running", status: "critical" });
    expect(result.hint).toContain("uvicorn");
  });

  it("shows paused whatever the connection says", () => {
    expect(describeConnection(base, true)).toMatchObject({ label: "Paused", status: null });
  });

  it("shows a neutral state before connecting", () => {
    expect(describeConnection({ ...base, state: "idle" }, false)).toMatchObject({ label: "Not connected", status: null });
    expect(describeConnection({ ...base, state: "connecting" }, false).label).toBe("Connecting");
  });
});

describe("traceNote", () => {
  it("describes a replay and the match with the annotations", () => {
    const note = traceNote("replay", "233", { agreed: 29, compared: 31 });
    expect(note).toContain("record 233");
    expect(note).toContain("29 of 31");
  });

  it("leaves out the match before any beat has been compared", () => {
    expect(traceNote("replay", "233", { agreed: 0, compared: 0 })).not.toContain("matches");
  });

  it("says plainly that simulated data is not a recording or a model result", () => {
    const note = traceNote("mock", "233", { agreed: 3, compared: 3 });
    expect(note).toContain("Simulated");
    expect(note).toContain("not a recording");
    expect(note).not.toContain("held-out");
    expect(note).not.toContain("matches");
  });
});

describe("sourceSubtitle", () => {
  it("names the record or the simulation", () => {
    expect(sourceSubtitle("replay", "233")).toBe("replay of MIT-BIH record 233");
    expect(sourceSubtitle("mock", "233")).toBe("simulated ECG");
  });
});
