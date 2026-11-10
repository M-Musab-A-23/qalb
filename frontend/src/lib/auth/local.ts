import { AuthError, type AuthFieldErrors } from "./errors";
import { demoAccountList, type DemoAccount } from "./demo";
import {
  DEFAULT_ITERATIONS,
  hashPassword,
  verifyPassword,
  type PasswordHash,
} from "./password";
import type { KeyValueStore } from "./storage";
import type { AuthService, LoginInput, RegisterInput, Role, User } from "./types";
import { validateEmail, validateName, validatePassword } from "../validation";

export const ACCOUNTS_KEY = "qalb.auth.accounts";
export const SESSION_KEY = "qalb.auth.session";

type StoredAccount = User & { password: PasswordHash };

export type LocalAuthOptions = {
  /** Holds the accounts and, for "keep me signed in", the session. */
  persistent: KeyValueStore;
  /** Holds the session when the person did not ask to stay signed in. */
  temporary: KeyValueStore;
  /** Lower this in tests to keep hashing fast. */
  iterations?: number;
};

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUser(account: StoredAccount): User {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    demo: account.demo,
    patientId: account.patientId,
    deviceId: account.deviceId,
    createdAt: account.createdAt,
  };
}

function collectFieldErrors(input: RegisterInput): AuthFieldErrors {
  const checks: AuthFieldErrors = {
    name: validateName(input.name),
    email: validateEmail(input.email),
    password: validatePassword(input.password),
  };
  const fields: AuthFieldErrors = {};
  if (checks.name) fields.name = checks.name;
  if (checks.email) fields.email = checks.email;
  if (checks.password) fields.password = checks.password;
  return fields;
}

/**
 * Local stand-in for a backend: accounts live in browser storage and
 * passwords are stored only as salted PBKDF2 hashes.
 */
export function createLocalAuth(options: LocalAuthOptions): AuthService {
  const { persistent, temporary } = options;
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const listeners = new Set<() => void>();
  let seeding: Promise<void> | null = null;

  function readAccounts(): StoredAccount[] {
    const raw = persistent.get(ACCOUNTS_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
    } catch {
      return [];
    }
  }

  function writeAccounts(accounts: StoredAccount[]): void {
    try {
      persistent.set(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      throw new AuthError(
        "storage_unavailable",
        "This browser is blocking storage, so the account could not be saved.",
      );
    }
  }

  async function toStored(demo: DemoAccount): Promise<StoredAccount> {
    return {
      id: demo.id,
      name: demo.name,
      email: demo.email,
      role: demo.role,
      demo: true,
      patientId: demo.patientId,
      deviceId: demo.deviceId,
      createdAt: new Date(0).toISOString(),
      password: await hashPassword(demo.password, iterations),
    };
  }

  function seedDemoAccounts(): Promise<void> {
    seeding ??= (async () => {
      const accounts = readAccounts();
      const missing = demoAccountList.filter(
        (demo) => !accounts.some((account) => account.id === demo.id),
      );
      if (missing.length === 0) return;
      const seeded = await Promise.all(missing.map(toStored));
      // Read again: another call may have written while the hashes ran.
      writeAccounts([...readAccounts(), ...seeded]);
    })();
    return seeding;
  }

  function notify(): void {
    listeners.forEach((listener) => listener());
  }

  function startSession(userId: string, remember: boolean): void {
    const target = remember ? persistent : temporary;
    const other = remember ? temporary : persistent;
    other.remove(SESSION_KEY);
    try {
      target.set(SESSION_KEY, userId);
    } catch {
      throw new AuthError(
        "storage_unavailable",
        "This browser is blocking storage, so you could not be signed in.",
      );
    }
    notify();
  }

  const invalidCredentials = () =>
    new AuthError("invalid_credentials", "Email or password is incorrect.");

  return {
    async register(input: RegisterInput): Promise<User> {
      await seedDemoAccounts();
      const fields = collectFieldErrors(input);
      if (Object.keys(fields).length > 0) {
        throw new AuthError("invalid_input", "Check the highlighted fields.", fields);
      }
      const email = normaliseEmail(input.email);
      const accounts = readAccounts();
      if (accounts.some((account) => account.email === email)) {
        throw new AuthError(
          "email_taken",
          "An account with this email already exists.",
          { email: "An account with this email already exists" },
        );
      }
      const account: StoredAccount = {
        id: `user-${crypto.randomUUID()}`,
        name: input.name.trim(),
        email,
        // Self-registered accounts are always patients with no data yet.
        role: "patient",
        demo: false,
        patientId: null,
        deviceId: null,
        createdAt: new Date().toISOString(),
        password: await hashPassword(input.password, iterations),
      };
      writeAccounts([...readAccounts(), account]);
      startSession(account.id, true);
      return toUser(account);
    },

    async login(input: LoginInput): Promise<User> {
      await seedDemoAccounts();
      const email = normaliseEmail(input.email);
      const account = readAccounts().find((item) => item.email === email);
      if (!account) {
        // Hash anyway so a missing account takes as long as a wrong password.
        await hashPassword(input.password, iterations);
        throw invalidCredentials();
      }
      if (!(await verifyPassword(input.password, account.password))) {
        throw invalidCredentials();
      }
      startSession(account.id, input.remember ?? true);
      return toUser(account);
    },

    async loginDemo(role: Role): Promise<User> {
      await seedDemoAccounts();
      const id = demoAccountList.find((demo) => demo.role === role)?.id;
      const account = readAccounts().find((item) => item.id === id);
      if (!account) throw invalidCredentials();
      startSession(account.id, false);
      return toUser(account);
    },

    async logout(): Promise<void> {
      persistent.remove(SESSION_KEY);
      temporary.remove(SESSION_KEY);
      notify();
    },

    async currentUser(): Promise<User | null> {
      const id = temporary.get(SESSION_KEY) ?? persistent.get(SESSION_KEY);
      if (!id) return null;
      const account = readAccounts().find((item) => item.id === id);
      return account ? toUser(account) : null;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
