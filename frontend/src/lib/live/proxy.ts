import { resolveMlUrl } from "@/lib/analysis/proxy";
import { LIVE_SPEEDS } from "./types";

type Fetch = typeof fetch;

export type LiveErrorCode =
  | "bad_request"
  | "not_found"
  | "service_unavailable"
  | "ml_unreachable"
  | "ml_error";

export type LiveErrorBody = { error: LiveErrorCode; detail: string };

const RECORD_PATTERN = /^[0-9]{3}$/;

function reply(status: number, error: LiveErrorCode, detail: string): Response {
  const body: LiveErrorBody = { error, detail };
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Builds the query string sent to the ML service. Only known parameters pass
 * through, each checked, so the browser cannot shape the upstream request.
 */
export function upstreamQuery(search: URLSearchParams): string | null {
  const out = new URLSearchParams();
  const speed = search.get("speed");
  if (speed !== null) {
    if (!(LIVE_SPEEDS as readonly number[]).includes(Number(speed))) return null;
    out.set("speed", String(Number(speed)));
  }
  const offset = search.get("offset");
  if (offset !== null) {
    const value = Number(offset);
    if (!Number.isFinite(value) || value < 0 || value > 24 * 3600) return null;
    out.set("offset", String(value));
  }
  for (const flag of ["samples", "truth"]) {
    const value = search.get(flag);
    if (value === null) continue;
    if (value !== "true" && value !== "false") return null;
    out.set(flag, value);
  }
  return out.toString();
}

type Options = { baseUrl?: string; fetchImpl?: Fetch };

async function failure(upstream: Response): Promise<Response> {
  let detail = "";
  try {
    const body: unknown = await upstream.json();
    if (typeof body === "object" && body !== null) {
      const value = (body as { detail?: unknown }).detail;
      if (typeof value === "string") detail = value;
    }
  } catch {
    // The body is only used for its message.
  }
  if (upstream.status === 404) {
    return reply(404, "not_found", detail || "That record is not available for replay.");
  }
  if (upstream.status === 422) {
    return reply(400, "bad_request", detail || "The replay request was refused.");
  }
  if (upstream.status === 503) {
    return reply(503, "service_unavailable", detail || "The analysis service has no model loaded.");
  }
  return reply(502, "ml_error", `The analysis service failed with status ${upstream.status}.`);
}

/** Lists the demo records the ML service offers. */
export async function forwardRecordList(options: Options = {}): Promise<Response> {
  const baseUrl = resolveMlUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  let upstream: Response;
  try {
    upstream = await fetchImpl(`${baseUrl}/live/records`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return reply(502, "ml_unreachable", "The analysis service could not be reached. Check that it is running.");
  }
  if (!upstream.ok) return failure(upstream);
  return new Response(upstream.body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Streams one replay from the ML service to the browser. The browser never
 * calls the service directly, and closing the page closes the upstream stream.
 */
export async function forwardLiveStream(
  request: Request,
  record: string,
  options: Options = {},
): Promise<Response> {
  if (!RECORD_PATTERN.test(record)) {
    return reply(404, "not_found", "That record is not available for replay.");
  }
  const query = upstreamQuery(new URL(request.url).searchParams);
  if (query === null) {
    return reply(400, "bad_request", "The speed, offset or flags are not valid.");
  }
  const baseUrl = resolveMlUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  let upstream: Response;
  try {
    upstream = await fetchImpl(
      `${baseUrl}/live/${record}${query ? `?${query}` : ""}`,
      { cache: "no-store", signal: request.signal, headers: { Accept: "text/event-stream" } },
    );
  } catch {
    return reply(502, "ml_unreachable", "The analysis service could not be reached. Check that it is running.");
  }
  if (!upstream.ok) return failure(upstream);
  if (!upstream.body) {
    return reply(502, "ml_error", "The analysis service sent an empty stream.");
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
