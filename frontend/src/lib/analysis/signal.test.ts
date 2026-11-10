import { describe, expect, it } from "vitest";
import { parseSignalText, SignalParseError } from "./signal";

describe("parseSignalText", () => {
  it("reads one column with a header at the entered rate", () => {
    const parsed = parseSignalText("mlii_mv\n-0.2350\n-0.2250\n0.5", 360);
    expect(parsed.samples).toEqual([-0.235, -0.225, 0.5]);
    expect(parsed).toMatchObject({ fs: 360, rateFrom: "entered" });
  });

  it("reads one column without a header and with Windows line endings", () => {
    const parsed = parseSignalText("1\r\n2\r\n3\r\n", 250);
    expect(parsed.samples).toEqual([1, 2, 3]);
    expect(parsed.fs).toBe(250);
  });

  it("reads time and value columns and takes the rate from the time step", () => {
    const text = "time_s,mlii_mv\n0.0000,-0.1\n0.0028,-0.2\n0.0056,-0.3\n0.0084,-0.1";
    const parsed = parseSignalText(text, 100);
    expect(parsed.samples).toEqual([-0.1, -0.2, -0.3, -0.1]);
    expect(parsed.rateFrom).toBe("time-column");
    expect(parsed.fs).toBeCloseTo(357.14, 1);
  });

  it("understands a time column in milliseconds", () => {
    const parsed = parseSignalText("0,1\n4,2\n8,3\n12,4", 360);
    expect(parsed.fs).toBeCloseTo(250, 5);
  });

  it("handles tabs, semicolons and plain spaces", () => {
    expect(parseSignalText("0\t5\n1\t6", 360).samples).toEqual([5, 6]);
    expect(parseSignalText("0;5\n1;6", 360).samples).toEqual([5, 6]);
    expect(parseSignalText("0 5\n1 6", 360).samples).toEqual([5, 6]);
  });

  it("accepts scientific notation and signs", () => {
    expect(parseSignalText("1e-3\n-2.5E+2\n+3", 360).samples).toEqual([0.001, -250, 3]);
  });

  it("reports an empty file", () => {
    expect(() => parseSignalText("  \n\n", 360)).toThrow(/empty/);
  });

  it("reports a header with no data", () => {
    expect(() => parseSignalText("mlii_mv", 360)).toThrow(/no data rows/);
  });

  it("reports the first bad row", () => {
    expect(() => parseSignalText("1\n2\nabc\n4", 360)).toThrow(/Row 3/);
    expect(() => parseSignalText("0,1\n1", 360)).toThrow(SignalParseError);
  });

  it("rejects a time column that does not increase", () => {
    expect(() => parseSignalText("0,1\n0,2\n1,3", 360)).toThrow(/time column/);
  });
});
