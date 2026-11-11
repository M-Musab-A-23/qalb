import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReplayFeed } from "./replay-feed";
import type { FeedConnection, LiveTarget } from "./types";

const target: LiveTarget = { record: "233", speed: 2, offsetSeconds: 40 };

const encoder = new TextEncoder();

function message(event: object): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

const samples = (t: number, recordT: number) => ({
  type: "samples",
  seq: 0,
  t,
  record_t: recordT,
  fs: 120,
  values: new Array(120).fill(0.1),
});
const status = { type: "status", state: "started", record: "233", speed: 2, t: 0, record_t: 40, loop: 0 };

type Stream = {
  response: Response;
  send: (text: string) => void;
  close: () => void;
};

function openStream(): Stream {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    send: (text) => controller.enqueue(encoder.encode(text)),
    close: () => controller.close(),
  };
}

/** Lets pending promises and microtasks run. */
async function flush() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

function track(feed: ReturnType<typeof createReplayFeed>) {
  const states: string[] = [];
  const connections: FeedConnection[] = [];
  feed.onConnection((c) => {
    states.push(c.state);
    connections.push(c);
  });
  return { states, connections };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createReplayFeed", () => {
  it("requests the proxy route with record, speed and offset", async () => {
    const stream = openStream();
    const fetchImpl = vi.fn<typeof fetch>(async () => stream.response);
    const feed = createReplayFeed({ fetchImpl: fetchImpl as unknown as typeof fetch });
    feed.connect(target);
    await flush();
    expect(fetchImpl.mock.calls[0][0]).toBe("/api/live/233?speed=2&offset=40");
    feed.disconnect();
  });

  it("asks for a status-only stream when samples are not wanted", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => openStream().response);
    const feed = createReplayFeed({ fetchImpl: fetchImpl as unknown as typeof fetch });
    feed.connect({ ...target, samples: false });
    await flush();
    expect(String(fetchImpl.mock.calls[0][0])).toContain("samples=false");
    feed.disconnect();
  });

  it("publishes each event type to its own subscribers and goes live", async () => {
    const stream = openStream();
    const feed = createReplayFeed({ fetchImpl: (async () => stream.response) as unknown as typeof fetch });
    const { states } = track(feed);
    const seen: string[] = [];
    feed.onSamples(() => seen.push("samples"));
    feed.onBeats(() => seen.push("beats"));
    feed.onAlert(() => seen.push("alert"));
    feed.onStatus(() => seen.push("status"));

    feed.connect(target);
    await flush();
    stream.send(message(status));
    stream.send(message(samples(0, 40)));
    stream.send(message({ type: "beats", beats: [{ t: 1, class: "V", confidence: 0.9 }] }));
    stream.send(
      message({ type: "alert", id: "a", alert_type: "x", severity: "high", confidence: 1, message: "m", t: 1 }),
    );
    await flush();

    expect(seen).toEqual(["status", "samples", "beats", "alert"]);
    expect(states).toEqual(["connecting", "live"]);
    expect(feed.getConnection()).toMatchObject({ state: "live", kind: "replay", attempt: 0 });
    feed.disconnect();
  });

  it("skips malformed messages without dropping the stream", async () => {
    const stream = openStream();
    const feed = createReplayFeed({ fetchImpl: (async () => stream.response) as unknown as typeof fetch });
    const statuses: unknown[] = [];
    feed.onStatus((s) => statuses.push(s));
    feed.connect(target);
    await flush();
    stream.send("data: {broken\n\n");
    stream.send(message({ type: "mystery" }));
    stream.send(message(status));
    await flush();
    expect(statuses).toHaveLength(1);
    expect(feed.getConnection().state).toBe("live");
    feed.disconnect();
  });

  it("handles a message split across network chunks", async () => {
    const stream = openStream();
    const feed = createReplayFeed({ fetchImpl: (async () => stream.response) as unknown as typeof fetch });
    const statuses: unknown[] = [];
    feed.onStatus((s) => statuses.push(s));
    feed.connect(target);
    await flush();
    const text = message(status);
    stream.send(text.slice(0, 15));
    await flush();
    expect(statuses).toHaveLength(0);
    stream.send(text.slice(15));
    await flush();
    expect(statuses).toHaveLength(1);
    feed.disconnect();
  });

  it("reconnects with backoff after the stream ends and resumes from the last position", async () => {
    const first = openStream();
    const second = openStream();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(first.response)
      .mockResolvedValueOnce(second.response);
    const feed = createReplayFeed({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      backoff: { jitter: 0 },
    });
    const { states } = track(feed);
    feed.connect(target);
    await flush();
    first.send(message(samples(0, 50)));
    await flush();
    first.close();
    await flush();
    expect(feed.getConnection()).toMatchObject({ state: "reconnecting", attempt: 1 });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // 50 s plus the 1 s of samples already received
    expect(String(fetchImpl.mock.calls[1][0])).toContain("offset=51");

    second.send(message(samples(0, 51)));
    await flush();
    expect(feed.getConnection()).toMatchObject({ state: "live", attempt: 0 });
    expect(states).toEqual(["connecting", "live", "reconnecting", "live"]);
    feed.disconnect();
  });

  it("grows the delay between attempts and reports unavailable when the service stays down", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ error: "ml_unreachable", detail: "The analysis service could not be reached." }, { status: 502 }),
    );
    const feed = createReplayFeed({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      backoff: { jitter: 0 },
      unavailableAfter: 3,
    });
    const { states, connections } = track(feed);
    feed.connect(target);
    await flush();
    expect(states.at(-1)).toBe("reconnecting");

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(feed.getConnection().state).toBe("unavailable");
    expect(feed.getConnection().message).toContain("could not be reached");
    await vi.advanceTimersByTimeAsync(3999);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(connections.map((c) => c.attempt)).toContain(3);
    feed.disconnect();
  });

  it("recovers when the service comes back", async () => {
    const stream = openStream();
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(stream.response);
    const feed = createReplayFeed({ fetchImpl: fetchImpl as unknown as typeof fetch, backoff: { jitter: 0 } });
    feed.connect(target);
    await flush();
    expect(feed.getConnection().state).toBe("reconnecting");
    await vi.advanceTimersByTimeAsync(1000);
    stream.send(message(status));
    await flush();
    expect(feed.getConnection()).toMatchObject({ state: "live", attempt: 0, message: null });
    feed.disconnect();
  });

  it("does not retry an unknown record", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ error: "not_found", detail: "Unknown record" }, { status: 404 }));
    const feed = createReplayFeed({ fetchImpl: fetchImpl as unknown as typeof fetch });
    feed.connect(target);
    await flush();
    expect(feed.getConnection()).toMatchObject({ state: "unavailable", message: "Unknown record" });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("drops a stream that goes silent and reconnects", async () => {
    const first = openStream();
    const second = openStream();
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(async (_url: string, init: RequestInit) => {
        init.signal?.addEventListener("abort", () => first.close());
        return first.response;
      })
      .mockResolvedValueOnce(second.response);
    const feed = createReplayFeed({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stallMs: 5000,
      backoff: { jitter: 0 },
    });
    feed.connect(target);
    await flush();
    first.send(message(status));
    await flush();
    await vi.advanceTimersByTimeAsync(5000);
    await flush();
    expect(feed.getConnection().state).toBe("reconnecting");
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    feed.disconnect();
  });

  it("disconnect aborts the request and stops delivering events", async () => {
    const stream = openStream();
    let aborted = false;
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      init.signal?.addEventListener("abort", () => {
        aborted = true;
      });
      return stream.response;
    });
    const feed = createReplayFeed({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const statuses: unknown[] = [];
    feed.onStatus((s) => statuses.push(s));
    feed.connect(target);
    await flush();
    feed.disconnect();
    expect(aborted).toBe(true);
    expect(feed.getConnection().state).toBe("idle");
    stream.send(message(status));
    await flush();
    expect(statuses).toHaveLength(0);
    feed.disconnect(); // a second call is harmless
  });

  it("disconnect cancels a pending reconnect", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("down"));
    const feed = createReplayFeed({ fetchImpl: fetchImpl as unknown as typeof fetch });
    feed.connect(target);
    await flush();
    feed.disconnect();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("connecting again replaces the old stream", async () => {
    const first = openStream();
    const second = openStream();
    const fetchImpl = vi.fn().mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response);
    const feed = createReplayFeed({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const statuses: string[] = [];
    feed.onStatus((s) => statuses.push(s.record));
    feed.connect(target);
    await flush();
    feed.connect({ ...target, record: "100" });
    await flush();
    first.send(message(status));
    second.send(message({ ...status, record: "100" }));
    await flush();
    expect(statuses).toEqual(["100"]);
    feed.disconnect();
  });

  it("stops notifying a listener after it unsubscribes", async () => {
    const stream = openStream();
    const feed = createReplayFeed({ fetchImpl: (async () => stream.response) as unknown as typeof fetch });
    const statuses: unknown[] = [];
    const off = feed.onStatus((s) => statuses.push(s));
    feed.connect(target);
    await flush();
    off();
    stream.send(message(status));
    await flush();
    expect(statuses).toHaveLength(0);
    feed.disconnect();
  });
});
