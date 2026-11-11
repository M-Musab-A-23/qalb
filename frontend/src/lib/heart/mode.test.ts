import { describe, expect, it } from "vitest";
import { decideHeartMode, type HeartEnvironment } from "./mode";

const base: HeartEnvironment = {
  webgl: true,
  reducedData: false,
  reducedMotion: false,
};

describe("decideHeartMode", () => {
  it("animates when everything is available", () => {
    expect(decideHeartMode(base)).toBe("animated");
  });

  it("keeps the placeholder until WebGL has been checked", () => {
    expect(decideHeartMode({ ...base, webgl: null })).toBe("placeholder");
  });

  it("keeps the placeholder when WebGL is unavailable", () => {
    expect(decideHeartMode({ ...base, webgl: false })).toBe("placeholder");
  });

  it("keeps the placeholder when the visitor wants to save data", () => {
    expect(decideHeartMode({ ...base, reducedData: true })).toBe("placeholder");
  });

  it("shows a still heart for reduced motion", () => {
    expect(decideHeartMode({ ...base, reducedMotion: true })).toBe("still");
  });

  it("stays still until the motion preference is known", () => {
    expect(decideHeartMode({ ...base, reducedMotion: null })).toBe("still");
  });

  it("falls back to the placeholder after a failure", () => {
    expect(decideHeartMode({ ...base, failed: true })).toBe("placeholder");
  });

  it("lets data saving win over reduced motion", () => {
    expect(
      decideHeartMode({ ...base, reducedData: true, reducedMotion: true }),
    ).toBe("placeholder");
  });
});
