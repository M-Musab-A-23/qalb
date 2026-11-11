import { describe, expect, it } from "vitest";
import { createFeedHub, subscriptions } from "./emitter";
import { createFallbackFeed, FALLBACK_MESSAGE } from "./fallback-feed";
import { configuredFeedMode, createLiveFeed, feedLabel, resolveFeedMode } from "./index";
import type { FeedConnection, FeedKind, LiveFeed, LiveSamples, LiveTarget } from "./types";

/** A feed the test drives by hand. */
function fakeFeed(kind: FeedKind) {
  const hub = createFeedHub();
  let connection: FeedConnection = { state: "idle", kind, attempt: 0, message: null };
  const calls: string[] = [];
  const feed: LiveFeed = {
    connect: (t) => calls.push(`connect:${t.record}`),
    disconnect: () => calls.push("disconnect"),
    ...subscriptions(hub),
    getConnection: () => connection,
  };
  return {
    feed,
    hub,
    calls,
    setState(next: Partial<FeedConnection>) {
      connection = { ...connection, ...next };
      hub.connection.emit(connection);
    },
  };
}

const target: LiveTarget = { record: "233", speed: 1, offsetSeconds: 0 };
const block = (t: number): LiveSamples => ({ type: "samples", seq: 0, t, recordT: t, fs: 120, values: [0] });

describe("createFallbackFeed", () => {
  it("uses the primary feed while it works", () => {
    const primary = fakeFeed("replay");
    const mock = fakeFeed("mock");
    const feed = createFallbackFeed(primary.feed, mock.feed);
    const samples: number[] = [];
    feed.onSamples((e) => samples.push(e.t));
    feed.connect(target);
    primary.setState({ state: "live" });
    primary.hub.samples.emit(block(1));
    expect(primary.calls).toEqual(["connect:233"]);
    expect(mock.calls).toEqual([]);
    expect(samples).toEqual([1]);
    expect(feed.getConnection()).toMatchObject({ state: "live", kind: "replay" });
  });

  it("shows reconnecting for the first failed attempt", () => {
    const primary = fakeFeed("replay");
    const feed = createFallbackFeed(primary.feed, fakeFeed("mock").feed, { failuresBeforeFallback: 2 });
    feed.connect(target);
    primary.setState({ state: "reconnecting", attempt: 1, message: "down" });
    expect(feed.getConnection()).toMatchObject({ state: "reconnecting", kind: "replay", attempt: 1 });
  });

  it("switches to the simulated feed after repeated failures and says why", () => {
    const primary = fakeFeed("replay");
    const mock = fakeFeed("mock");
    const feed = createFallbackFeed(primary.feed, mock.feed, { failuresBeforeFallback: 2 });
    const states: FeedConnection[] = [];
    feed.onConnection((c) => states.push(c));
    feed.connect(target);
    primary.setState({ state: "reconnecting", attempt: 1 });
    primary.setState({ state: "unavailable", attempt: 2, message: "down" });
    expect(mock.calls).toEqual(["connect:233"]);
    expect(feed.getConnection()).toMatchObject({
      state: "live",
      kind: "mock",
      message: FALLBACK_MESSAGE,
    });
    expect(states.at(-1)?.kind).toBe("mock");
  });

  it("passes events from the simulated feed only while it is active", () => {
    const primary = fakeFeed("replay");
    const mock = fakeFeed("mock");
    const feed = createFallbackFeed(primary.feed, mock.feed);
    const samples: number[] = [];
    feed.onSamples((e) => samples.push(e.t));
    feed.connect(target);
    mock.hub.samples.emit(block(99)); // not active yet
    primary.setState({ state: "unavailable", attempt: 2 });
    mock.hub.samples.emit(block(5));
    primary.hub.samples.emit(block(77)); // primary is no longer active
    expect(samples).toEqual([5]);
  });

  it("moves back to the primary once it is live again", () => {
    const primary = fakeFeed("replay");
    const mock = fakeFeed("mock");
    const feed = createFallbackFeed(primary.feed, mock.feed);
    feed.connect(target);
    primary.setState({ state: "unavailable", attempt: 2 });
    primary.setState({ state: "unavailable", attempt: 3 });
    expect(feed.getConnection().kind).toBe("mock");
    primary.setState({ state: "live", attempt: 0, message: null });
    expect(mock.calls).toContain("disconnect");
    expect(feed.getConnection()).toMatchObject({ state: "live", kind: "replay", message: null });
  });

  it("keeps the simulated feed when the target changes and retries the primary in the background", () => {
    const primary = fakeFeed("replay");
    const mock = fakeFeed("mock");
    const feed = createFallbackFeed(primary.feed, mock.feed);
    feed.connect(target);
    primary.setState({ state: "unavailable", attempt: 2 });
    feed.connect({ ...target, record: "100" });
    expect(mock.calls.at(-1)).toBe("connect:100");
    expect(primary.calls.at(-1)).toBe("connect:100");
    expect(feed.getConnection().kind).toBe("mock");
  });

  it("disconnect stops both feeds", () => {
    const primary = fakeFeed("replay");
    const mock = fakeFeed("mock");
    const feed = createFallbackFeed(primary.feed, mock.feed);
    feed.connect(target);
    primary.setState({ state: "unavailable", attempt: 2 });
    feed.disconnect();
    expect(primary.calls.at(-1)).toBe("disconnect");
    expect(mock.calls.at(-1)).toBe("disconnect");
    expect(feed.getConnection().state).toBe("idle");
  });
});

describe("createLiveFeed", () => {
  it("resolves the mode from the environment value", () => {
    expect(resolveFeedMode(undefined)).toBe("auto");
    expect(resolveFeedMode("")).toBe("auto");
    expect(resolveFeedMode("nonsense")).toBe("auto");
    expect(resolveFeedMode(" Mock ")).toBe("mock");
    expect(resolveFeedMode("replay")).toBe("replay");
  });

  it("defaults to auto when the variable is not set", () => {
    expect(configuredFeedMode()).toBe("auto");
  });

  it("returns the mock feed in mock mode without touching the replay", () => {
    const mock = fakeFeed("mock");
    const replay = fakeFeed("replay");
    const feed = createLiveFeed({ mode: "mock", mock: mock.feed, replay: replay.feed });
    feed.connect(target);
    expect(mock.calls).toEqual(["connect:233"]);
    expect(replay.calls).toEqual([]);
  });

  it("returns the replay feed alone in replay mode", () => {
    const replay = fakeFeed("replay");
    const feed = createLiveFeed({ mode: "replay", replay: replay.feed, mock: fakeFeed("mock").feed });
    expect(feed).toBe(replay.feed);
  });

  it("falls back to the mock in auto mode", () => {
    const replay = fakeFeed("replay");
    const mock = fakeFeed("mock");
    const feed = createLiveFeed({ mode: "auto", replay: replay.feed, mock: mock.feed });
    feed.connect(target);
    replay.setState({ state: "unavailable", attempt: 2 });
    expect(feed.getConnection().kind).toBe("mock");
  });

  it("labels the two sources", () => {
    expect(feedLabel("mock")).toBe("Simulated feed");
    expect(feedLabel("replay")).toBe("Live replay");
  });
});
