import { describe, expect, it, vi } from "vitest";
import { forwardLiveStream, forwardRecordList, upstreamQuery } from "./proxy";

const asFetch = (fn: unknown) => fn as typeof fetch;

function request(path: string, signal?: AbortSignal): Request {
  return new Request(`http://app.test/api/live/${path}`, { signal });
}

function sseBody(text: string): ReadableStream<Uint8Array> {
  return new Response(text).body as ReadableStream<Uint8Array>;
}

describe("upstreamQuery", () => {
  it("passes valid parameters through", () => {
    const q = upstreamQuery(new URLSearchParams("speed=2&offset=30.5&samples=false&truth=true"));
    expect(new URLSearchParams(q ?? "").get("speed")).toBe("2");
    expect(new URLSearchParams(q ?? "").get("offset")).toBe("30.5");
    expect(new URLSearchParams(q ?? "").get("samples")).toBe("false");
  });

  it("drops parameters it does not know", () => {
    const q = upstreamQuery(new URLSearchParams("speed=1&ticks=5&admin=1"));
    expect(q).toBe("speed=1");
  });

  it.each(["speed=3", "speed=abc", "offset=-1", "offset=abc", "samples=maybe"])(
    "rejects %s",
    (query) => {
      expect(upstreamQuery(new URLSearchParams(query))).toBeNull();
    },
  );

  it("returns an empty string when there is nothing to forward", () => {
    expect(upstreamQuery(new URLSearchParams())).toBe("");
  });
});

describe("forwardLiveStream", () => {
  it("streams the upstream event stream through", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(sseBody('data: {"type":"status"}\n\n'), { status: 200 }),
    );
    const response = await forwardLiveStream(request("233?speed=2&offset=10"), "233", {
      baseUrl: "http://ml:8000/",
      fetchImpl: asFetch(fetchImpl),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-cache");
    expect(await response.text()).toBe('data: {"type":"status"}\n\n');
    expect(fetchImpl.mock.calls[0][0]).toBe("http://ml:8000/live/233?speed=2&offset=10");
  });

  it("hands the page abort signal to the upstream request", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeDefined();
      return new Response(sseBody("data: x\n\n"));
    });
    await forwardLiveStream(request("100", controller.signal), "100", { fetchImpl: asFetch(fetchImpl) });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects a record name that is not three digits without calling the service", async () => {
    const fetchImpl = vi.fn();
    const response = await forwardLiveStream(request("../x"), "../x", { fetchImpl: asFetch(fetchImpl) });
    expect(response.status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects bad parameters without calling the service", async () => {
    const fetchImpl = vi.fn();
    const response = await forwardLiveStream(request("100?speed=9"), "100", { fetchImpl: asFetch(fetchImpl) });
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("answers 502 ml_unreachable when the service is down", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const response = await forwardLiveStream(request("100"), "100", { fetchImpl: asFetch(fetchImpl) });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: "ml_unreachable" });
  });

  it("maps an unknown record to 404 with the service message", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ detail: "Unknown record '999'." }, { status: 404 }));
    const response = await forwardLiveStream(request("999"), "999", { fetchImpl: asFetch(fetchImpl) });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found", detail: "Unknown record '999'." });
  });

  it("maps a missing model to 503", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ detail: "Model not available" }, { status: 503 }));
    const response = await forwardLiveStream(request("100"), "100", { fetchImpl: asFetch(fetchImpl) });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "service_unavailable" });
  });

  it("maps other failures to 502 ml_error", async () => {
    const fetchImpl = vi.fn(async () => new Response("oops", { status: 500 }));
    const response = await forwardLiveStream(request("100"), "100", { fetchImpl: asFetch(fetchImpl) });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: "ml_error" });
  });
});

describe("forwardRecordList", () => {
  it("returns the record list", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ records: [{ record: "100", label: "x" }] }));
    const response = await forwardRecordList({ baseUrl: "http://ml:9000", fetchImpl: asFetch(fetchImpl) });
    expect(await response.json()).toEqual({ records: [{ record: "100", label: "x" }] });
    expect(fetchImpl.mock.calls[0][0]).toBe("http://ml:9000/live/records");
  });

  it("reports an unreachable service", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("down");
    });
    const response = await forwardRecordList({ fetchImpl: asFetch(fetchImpl) });
    expect(response.status).toBe(502);
  });
});
