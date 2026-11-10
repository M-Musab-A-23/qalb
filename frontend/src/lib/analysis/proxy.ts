import type { AnalyzeErrorBody, AnalyzeErrorCode } from "./errors";

export const DEFAULT_ML_API_URL = "http://localhost:8000";
/** The ML service refuses files above 25 MB; leave room for the form fields. */
export const MAX_REQUEST_BYTES = 26 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120_000;

type Fetch = typeof fetch;

function reply(status: number, error: AnalyzeErrorCode, detail: string): Response {
  const body: AnalyzeErrorBody = { error, detail };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function resolveMlUrl(value: string | undefined): string {
  const base = value?.trim() || DEFAULT_ML_API_URL;
  return base.replace(/\/+$/, "");
}

/** Reads the readable reason out of a FastAPI error body. */
function serviceDetail(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return fallback;
}

/**
 * Forwards a multipart ECG upload to the ML service and returns its JSON.
 * The browser only ever talks to this app, never to the service itself.
 */
export async function forwardToMlService(
  request: Request,
  options: { baseUrl?: string; fetchImpl?: Fetch } = {},
): Promise<Response> {
  const baseUrl = resolveMlUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    return reply(413, "too_large", "File too large. The limit is 25 MB.");
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return reply(400, "bad_request", "The upload must be a multipart form with a file.");
  }

  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return reply(400, "bad_request", "No file was uploaded.");
  }

  const outgoing = new FormData();
  outgoing.append("file", file, file.name);
  const header = incoming.get("header");
  if (header instanceof File) outgoing.append("header", header, header.name);
  const fs = incoming.get("fs");
  if (typeof fs === "string" && fs.trim()) outgoing.append("fs", fs.trim());

  let upstream: Response;
  try {
    upstream = await fetchImpl(`${baseUrl}/analyze`, {
      method: "POST",
      body: outgoing,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (caught) {
    if (caught instanceof Error && caught.name === "TimeoutError") {
      return reply(504, "ml_timeout", "The analysis service took too long to answer.");
    }
    return reply(
      502,
      "ml_unreachable",
      "The analysis service could not be reached. Check that it is running.",
    );
  }

  let body: unknown = null;
  try {
    body = await upstream.json();
  } catch {
    // Handled below: an empty or non-JSON body is only acceptable on failure.
  }

  if (upstream.ok) {
    if (body === null) {
      return reply(502, "ml_error", "The analysis service returned an unreadable answer.");
    }
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  }

  if (upstream.status === 422) {
    return reply(
      422,
      "rejected",
      serviceDetail(body, "The analysis service could not read this file."),
    );
  }
  if (upstream.status === 413) {
    return reply(413, "too_large", serviceDetail(body, "File too large. The limit is 25 MB."));
  }
  if (upstream.status === 503) {
    return reply(
      503,
      "service_unavailable",
      serviceDetail(body, "The analysis service has no model loaded."),
    );
  }
  return reply(
    502,
    "ml_error",
    `The analysis service failed with status ${upstream.status}.`,
  );
}
