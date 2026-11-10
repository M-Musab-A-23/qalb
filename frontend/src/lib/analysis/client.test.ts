import { describe, expect, it } from "vitest";
import { interpretResponse } from "./client";
import { AnalyzeError } from "./errors";
import normal from "./fixtures/sample_normal_100.json";

function catchError(run: () => unknown): AnalyzeError {
  try {
    run();
  } catch (caught) {
    expect(caught).toBeInstanceOf(AnalyzeError);
    return caught as AnalyzeError;
  }
  throw new Error("expected an AnalyzeError");
}

describe("interpretResponse", () => {
  it("parses a successful result", () => {
    const result = interpretResponse(200, JSON.stringify(normal));
    expect(result.rhythm.nBeats).toBe(37);
  });

  it("keeps the code and reason of a proxy error", () => {
    const error = catchError(() =>
      interpretResponse(422, JSON.stringify({ error: "rejected", detail: "Recording is too short." })),
    );
    expect(error.code).toBe("rejected");
    expect(error.message).toBe("Recording is too short.");
    expect(error.serviceDown).toBe(false);
  });

  it("marks an unreachable service as down", () => {
    const error = catchError(() =>
      interpretResponse(502, JSON.stringify({ error: "ml_unreachable", detail: "x" })),
    );
    expect(error.serviceDown).toBe(true);
  });

  it("reports a success body that does not match the schema", () => {
    const error = catchError(() => interpretResponse(200, JSON.stringify({ hello: 1 })));
    expect(error.code).toBe("ml_error");
    expect(error.message).toMatch(/Unexpected analysis result/);
  });

  it("reports text that is not JSON", () => {
    expect(catchError(() => interpretResponse(500, "<html>")).code).toBe("ml_error");
  });

  it("falls back to the status for an unknown error body", () => {
    const error = catchError(() => interpretResponse(500, "{}"));
    expect(error.message).toContain("500");
  });
});
