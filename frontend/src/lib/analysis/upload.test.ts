import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  classifySelection,
  selectionLabel,
  validateSamplingRate,
} from "./upload";

const file = (name: string, size = 100) => ({ name, size });

describe("classifySelection", () => {
  it("accepts one CSV or TXT file", () => {
    const csv = classifySelection([file("beat.CSV")]);
    expect(csv).toMatchObject({ ok: true, selection: { kind: "text" } });
    expect(classifySelection([file("beat.txt")]).ok).toBe(true);
  });

  it("accepts a WFDB pair in any order with matching names", () => {
    const result = classifySelection([file("100.hea"), file("100.DAT")]);
    expect(result).toMatchObject({ ok: true, selection: { kind: "wfdb" } });
  });

  it("asks for a missing header or data file", () => {
    expect(classifySelection([file("100.dat")])).toMatchObject({
      ok: false,
      error: expect.stringContaining(".hea header"),
    });
    expect(classifySelection([file("100.hea")])).toMatchObject({
      ok: false,
      error: expect.stringContaining(".dat file"),
    });
  });

  it("rejects mismatched WFDB names", () => {
    expect(classifySelection([file("100.dat"), file("101.hea")])).toMatchObject({
      ok: false,
      error: expect.stringContaining("share a name"),
    });
  });

  it("rejects unsupported types and says which file", () => {
    expect(classifySelection([file("scan.pdf")])).toMatchObject({
      ok: false,
      error: expect.stringContaining("scan.pdf is not a supported file"),
    });
  });

  it("rejects mixing a text file with other files", () => {
    expect(classifySelection([file("a.csv"), file("100.dat")]).ok).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    expect(classifySelection([file("a.csv", 0)])).toMatchObject({
      ok: false,
      error: expect.stringContaining("empty"),
    });
    expect(classifySelection([file("a.csv", MAX_UPLOAD_BYTES + 1)])).toMatchObject({
      ok: false,
      error: expect.stringContaining("25 MB"),
    });
  });

  it("asks for a file when none is chosen", () => {
    expect(classifySelection([])).toMatchObject({ ok: false });
  });
});

describe("validateSamplingRate", () => {
  it("accepts rates in range", () => {
    expect(validateSamplingRate("360")).toEqual({ ok: true, value: 360 });
    expect(validateSamplingRate(" 250.5 ")).toEqual({ ok: true, value: 250.5 });
  });

  it("rejects blanks, text and out-of-range rates", () => {
    expect(validateSamplingRate("").ok).toBe(false);
    expect(validateSamplingRate("fast").ok).toBe(false);
    expect(validateSamplingRate("49").ok).toBe(false);
    expect(validateSamplingRate("5001").ok).toBe(false);
  });
});

describe("selectionLabel", () => {
  it("names both files of a WFDB record", () => {
    const result = classifySelection([file("100.dat"), file("100.hea")]);
    if (!result.ok) throw new Error("expected a selection");
    expect(selectionLabel(result.selection)).toBe("100.dat + 100.hea");
  });
});
