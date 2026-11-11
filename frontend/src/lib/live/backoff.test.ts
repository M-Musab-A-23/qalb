import { describe, expect, it } from "vitest";
import { backoffDelay } from "./backoff";

const plain = { jitter: 0 };

describe("backoffDelay", () => {
  it("doubles from the base delay", () => {
    expect([1, 2, 3, 4].map((n) => backoffDelay(n, plain))).toEqual([1000, 2000, 4000, 8000]);
  });

  it("stops growing at the maximum", () => {
    expect(backoffDelay(10, plain)).toBe(15000);
    expect(backoffDelay(50, { ...plain, maxMs: 5000 })).toBe(5000);
  });

  it("stays within the jitter band", () => {
    const low = backoffDelay(3, { random: () => 0 });
    const high = backoffDelay(3, { random: () => 1 });
    expect(low).toBe(3200);
    expect(high).toBe(4800);
  });

  it("never goes negative", () => {
    expect(backoffDelay(0, { jitter: 1, random: () => 0 })).toBeGreaterThanOrEqual(0);
  });
});
