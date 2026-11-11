import { describe, expect, it } from "vitest";
import { parseCssColor } from "./palette";

describe("parseCssColor", () => {
  it("reads a hex token", () => {
    expect(parseCssColor(" #ff0000 ", "#000000").getHexString()).toBe(
      "ff0000",
    );
  });

  it("reads rgb notation", () => {
    expect(parseCssColor("rgb(0, 255, 0)", "#000000").getHexString()).toBe(
      "00ff00",
    );
  });

  it("uses the fallback for an empty or unknown value", () => {
    expect(parseCssColor("", "#112233").getHexString()).toBe("112233");
    expect(parseCssColor("not-a-colour", "#112233").getHexString()).toBe(
      "112233",
    );
  });
});
