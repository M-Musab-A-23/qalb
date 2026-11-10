import type { Role } from "./types";

/** Pages that only some roles may open. Everything else is open to any signed-in user. */
const restricted: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/patients", roles: ["clinician"] },
  { prefix: "/alerts", roles: ["clinician"] },
];

export function canAccess(role: Role, pathname: string): boolean {
  const rule = restricted.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return rule ? rule.roles.includes(role) : true;
}

/** Where a signed-in user lands after signing in or when a page is off limits. */
export const DEFAULT_PATH = "/dashboard";
