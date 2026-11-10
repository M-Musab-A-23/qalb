import { beforeEach, describe, expect, it } from "vitest";
import { demoAccounts } from "./demo";
import { AuthError } from "./errors";
import { ACCOUNTS_KEY, createLocalAuth, SESSION_KEY } from "./local";
import { createMemoryStore, type KeyValueStore } from "./storage";
import type { AuthService } from "./types";

let persistent: KeyValueStore;
let temporary: KeyValueStore;
let auth: AuthService;

beforeEach(() => {
  persistent = createMemoryStore();
  temporary = createMemoryStore();
  auth = createLocalAuth({ persistent, temporary, iterations: 1000 });
});

async function expectAuthError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(AuthError);
  expect((error as AuthError).code).toBe(code);
  return error as AuthError;
}

describe("register", () => {
  it("creates a patient account with empty data and signs it in", async () => {
    const user = await auth.register({
      name: "Sara Khan",
      email: "Sara@Example.com",
      password: "long-enough-pw",
    });
    expect(user.role).toBe("patient");
    expect(user.demo).toBe(false);
    expect(user.email).toBe("sara@example.com");
    expect(user.patientId).toBeNull();
    expect(user.deviceId).toBeNull();
    expect((await auth.currentUser())?.id).toBe(user.id);
  });

  it("never stores the password in plain text", async () => {
    await auth.register({
      name: "Sara Khan",
      email: "sara@example.com",
      password: "long-enough-pw",
    });
    const raw = persistent.get(ACCOUNTS_KEY) ?? "";
    expect(raw).not.toContain("long-enough-pw");
    expect(raw).toContain("PBKDF2-SHA256");
  });

  it("returns a message for each invalid field", async () => {
    const error = await expectAuthError(
      auth.register({ name: " ", email: "nope", password: "short" }),
      "invalid_input",
    );
    expect(error.fields.name).toBeTruthy();
    expect(error.fields.email).toBeTruthy();
    expect(error.fields.password).toBeTruthy();
  });

  it("rejects an email that is already registered", async () => {
    const input = { name: "A", email: "a@example.com", password: "long-enough-pw" };
    await auth.register(input);
    await expectAuthError(auth.register(input), "email_taken");
  });

  it("does not let anyone register a demo account email", async () => {
    await expectAuthError(
      auth.register({
        name: "Copycat",
        email: demoAccounts.clinician.email,
        password: "long-enough-pw",
      }),
      "email_taken",
    );
  });
});

describe("login and logout", () => {
  const credentials = { email: "sara@example.com", password: "long-enough-pw" };

  beforeEach(async () => {
    await auth.register({ name: "Sara", ...credentials });
    await auth.logout();
  });

  it("signs in with the right password", async () => {
    const user = await auth.login(credentials);
    expect(user.email).toBe(credentials.email);
    expect((await auth.currentUser())?.id).toBe(user.id);
  });

  it("is not case sensitive for the email", async () => {
    await auth.login({ ...credentials, email: "SARA@example.com" });
    expect(await auth.currentUser()).not.toBeNull();
  });

  it("rejects a wrong password and an unknown email the same way", async () => {
    const wrong = await expectAuthError(
      auth.login({ ...credentials, password: "wrong-password" }),
      "invalid_credentials",
    );
    const unknown = await expectAuthError(
      auth.login({ email: "who@example.com", password: "long-enough-pw" }),
      "invalid_credentials",
    );
    expect(wrong.message).toBe(unknown.message);
    expect(await auth.currentUser()).toBeNull();
  });

  it("clears the session on logout", async () => {
    await auth.login(credentials);
    await auth.logout();
    expect(await auth.currentUser()).toBeNull();
    expect(persistent.get(SESSION_KEY)).toBeNull();
  });

  it("keeps the session in temporary storage when not remembered", async () => {
    await auth.login({ ...credentials, remember: false });
    expect(temporary.get(SESSION_KEY)).not.toBeNull();
    expect(persistent.get(SESSION_KEY)).toBeNull();
  });

  it("notifies subscribers and stops after unsubscribe", async () => {
    let calls = 0;
    const stop = auth.subscribe(() => void (calls += 1));
    await auth.login(credentials);
    await auth.logout();
    expect(calls).toBe(2);
    stop();
    await auth.login(credentials);
    expect(calls).toBe(2);
  });
});

describe("demo accounts", () => {
  it("signs in the demo clinician and patient instantly", async () => {
    const clinician = await auth.loginDemo("clinician");
    expect(clinician).toMatchObject({ role: "clinician", demo: true });
    const patient = await auth.loginDemo("patient");
    expect(patient).toMatchObject({
      role: "patient",
      demo: true,
      deviceId: demoAccounts.patient.deviceId,
    });
    expect((await auth.currentUser())?.id).toBe(patient.id);
  });

  it("also accepts the documented demo passwords", async () => {
    const user = await auth.login({
      email: demoAccounts.patient.email,
      password: demoAccounts.patient.password,
    });
    expect(user.id).toBe(demoAccounts.patient.id);
  });

  it("seeds each demo account only once", async () => {
    await auth.loginDemo("patient");
    await auth.loginDemo("patient");
    const stored = JSON.parse(persistent.get(ACCOUNTS_KEY) ?? "[]") as unknown[];
    expect(stored).toHaveLength(2);
  });
});
