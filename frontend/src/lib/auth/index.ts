import { createLocalAuth } from "./local";
import { createBrowserStore } from "./storage";
import type { AuthService } from "./types";

export { canAccess, DEFAULT_PATH } from "./access";
export { demoAccounts, DEMO_DEVICE_ID, DEMO_PATIENT_ID } from "./demo";
export { AuthError, type AuthErrorCode, type AuthFieldErrors } from "./errors";
export type {
  AuthService,
  LoginInput,
  RegisterInput,
  Role,
  User,
} from "./types";

let service: AuthService | null = null;

/**
 * The auth service the app uses. To move to a real backend, return a
 * different AuthService here; pages only depend on the interface.
 */
export function getAuth(): AuthService {
  service ??= createLocalAuth({
    persistent: createBrowserStore(localStorage),
    temporary: createBrowserStore(sessionStorage),
  });
  return service;
}
