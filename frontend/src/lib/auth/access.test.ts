import { describe, expect, it } from "vitest";
import { canAccess } from "./access";

describe("canAccess", () => {
  it("lets clinicians open every page", () => {
    for (const path of ["/dashboard", "/patients", "/alerts", "/devices", "/analyze", "/history"]) {
      expect(canAccess("clinician", path)).toBe(true);
    }
  });

  it("keeps patients out of the patient list and all-patient alerts", () => {
    expect(canAccess("patient", "/patients")).toBe(false);
    expect(canAccess("patient", "/alerts")).toBe(false);
    expect(canAccess("patient", "/alerts/anything")).toBe(false);
  });

  it("lets patients open their own pages", () => {
    for (const path of ["/dashboard", "/devices", "/analyze", "/history", "/settings"]) {
      expect(canAccess("patient", path)).toBe(true);
    }
  });

  it("does not confuse similar prefixes", () => {
    expect(canAccess("patient", "/alerts-help")).toBe(true);
  });
});
