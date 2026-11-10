/** Error codes shared by the /api/analyze route and the browser client. */
export type AnalyzeErrorCode =
  /** The upload itself is malformed or missing. */
  | "bad_request"
  /** The service looked at the input and refused it (HTTP 422). */
  | "rejected"
  | "too_large"
  /** The service is up but has no model loaded. */
  | "service_unavailable"
  /** The service could not be reached at all. */
  | "ml_unreachable"
  | "ml_timeout"
  /** The service answered with something unusable. */
  | "ml_error"
  /** The browser could not reach this app. */
  | "network";

export type AnalyzeErrorBody = {
  error: AnalyzeErrorCode;
  detail: string;
};

export class AnalyzeError extends Error {
  readonly code: AnalyzeErrorCode;

  constructor(code: AnalyzeErrorCode, message: string) {
    super(message);
    this.name = "AnalyzeError";
    this.code = code;
  }

  /** True when an offline demo result is a sensible fallback. */
  get serviceDown(): boolean {
    return (
      this.code === "ml_unreachable" ||
      this.code === "ml_timeout" ||
      this.code === "service_unavailable" ||
      this.code === "ml_error" ||
      this.code === "network"
    );
  }
}

export function isAnalyzeErrorBody(value: unknown): value is AnalyzeErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.error === "string" && typeof body.detail === "string";
}
