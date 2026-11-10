import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("never contains the plain password", async () => {
    const stored = await hashPassword("correct horse battery", 1000);
    expect(JSON.stringify(stored)).not.toContain("correct horse battery");
    expect(stored.algo).toBe("PBKDF2-SHA256");
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery", 1000);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterz", stored)).toBe(false);
  });

  it("uses a fresh salt every time", async () => {
    const a = await hashPassword("same-password", 1000);
    const b = await hashPassword("same-password", 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});
