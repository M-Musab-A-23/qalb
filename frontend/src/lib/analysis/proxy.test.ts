import { describe, expect, it, vi } from "vitest";
import { forwardToMlService, resolveMlUrl } from "./proxy";

function uploadRequest(parts: Record<string, string | File> = {}): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(parts)) form.append(key, value);
  return new Request("http://app.test/api/analyze", { method: "POST", body: form });
}

const csv = new File(["1\n2\n3"], "beat.csv", { type: "text/csv" });

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

describe("resolveMlUrl", () => {
  it("defaults to the local service", () => {
    expect(resolveMlUrl(undefined)).toBe("http://localhost:8000");
    expect(resolveMlUrl("  ")).toBe("http://localhost:8000");
  });

  it("drops trailing slashes", () => {
    expect(resolveMlUrl("http://ml:9000//")).toBe("http://ml:9000");
  });
});

describe("forwardToMlService", () => {
  it("forwards the file and rate and returns the service JSON", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect((form.get("file") as File).name).toBe("beat.csv");
      expect(form.get("fs")).toBe("250");
      return jsonResponse({ schema_version: "1.0" });
    });
    const response = await forwardToMlService(uploadRequest({ file: csv, fs: "250" }), {
      baseUrl: "http://ml:8000/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ schema_version: "1.0" });
    expect(fetchImpl.mock.calls[0][0]).toBe("http://ml:8000/analyze");
  });

  it("forwards the WFDB header file", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect((init?.body as FormData).get("header")).toBeInstanceOf(File);
      return jsonResponse({ ok: true });
    });
    const hea = new File(["100 1 360"], "100.hea");
    await forwardToMlService(uploadRequest({ file: new File(["x"], "100.dat"), header: hea }), {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects a request without a file", async () => {
    const fetchImpl = vi.fn();
    const response = await forwardToMlService(uploadRequest({ fs: "360" }), {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("bad_request");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a body that is not a form", async () => {
    const response = await forwardToMlService(
      new Request("http://app.test/api/analyze", { method: "POST", body: "plain" }),
      { fetchImpl: vi.fn() as unknown as typeof fetch },
    );
    expect(response.status).toBe(400);
  });

  it("reports an unreachable service", async () => {
    const response = await forwardToMlService(uploadRequest({ file: csv }), {
      fetchImpl: (async () => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch,
    });
    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("ml_unreachable");
  });

  it("reports a timeout separately", async () => {
    const response = await forwardToMlService(uploadRequest({ file: csv }), {
      fetchImpl: (async () => {
        throw new DOMException("timed out", "TimeoutError");
      }) as unknown as typeof fetch,
    });
    expect(response.status).toBe(504);
    expect((await response.json()).error).toBe("ml_timeout");
  });

  it("passes the service reason for rejected input", async () => {
    const response = await forwardToMlService(uploadRequest({ file: csv }), {
      fetchImpl: (async () => jsonResponse({ detail: "Recording is too short." }, 422)) as unknown as typeof fetch,
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "rejected", detail: "Recording is too short." });
  });

  it("falls back to a generic reason when the detail is not text", async () => {
    const response = await forwardToMlService(uploadRequest({ file: csv }), {
      fetchImpl: (async () => jsonResponse({ detail: [{ msg: "x" }] }, 422)) as unknown as typeof fetch,
    });
    expect((await response.json()).detail).toMatch(/could not read/);
  });

  it("maps a missing model and server errors", async () => {
    const missing = await forwardToMlService(uploadRequest({ file: csv }), {
      fetchImpl: (async () => jsonResponse({ detail: "Model not available on the server." }, 503)) as unknown as typeof fetch,
    });
    expect((await missing.json()).error).toBe("service_unavailable");

    const broken = await forwardToMlService(uploadRequest({ file: csv }), {
      fetchImpl: (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch,
    });
    expect(broken.status).toBe(502);
    expect((await broken.json()).error).toBe("ml_error");
  });

  it("refuses an oversized request before reading it", async () => {
    const request = new Request("http://app.test/api/analyze", {
      method: "POST",
      headers: { "content-length": String(40 * 1024 * 1024) },
      body: new FormData(),
    });
    const response = await forwardToMlService(request, {
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    expect(response.status).toBe(413);
  });
});
