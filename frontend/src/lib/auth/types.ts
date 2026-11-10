export type Role = "clinician" | "patient";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** True for the seeded demo accounts. */
  demo: boolean;
  /** Patient record the account is linked to, or null when there is none. */
  patientId: string | null;
  /** Device the account owns, or null when none is paired. */
  deviceId: string | null;
  createdAt: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
  /** Keep the session after the browser closes. Defaults to true. */
  remember?: boolean;
};

/**
 * The only surface the pages talk to. The local stand-in implements it on
 * top of browser storage; a real backend can implement the same methods and
 * be swapped in `index.ts` without touching any page.
 */
export interface AuthService {
  /** Creates a patient account and signs it in. */
  register(input: RegisterInput): Promise<User>;
  login(input: LoginInput): Promise<User>;
  /** Signs in one of the seeded demo accounts without a password. */
  loginDemo(role: Role): Promise<User>;
  logout(): Promise<void>;
  currentUser(): Promise<User | null>;
  /** Calls the listener after every sign in, sign out or registration. */
  subscribe(listener: () => void): () => void;
}
