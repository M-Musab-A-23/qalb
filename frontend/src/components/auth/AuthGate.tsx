"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { canAccess, DEFAULT_PATH } from "@/lib/auth";
import { useAuth } from "./AuthProvider";

function Waiting() {
  return (
    <div
      role="status"
      className="flex min-h-dvh items-center justify-center text-sm text-[var(--color-text-secondary)]"
    >
      Loading your account
    </div>
  );
}

/**
 * Keeps signed-out visitors out of the app and sends signed-in users away
 * from pages their role may not open.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = user ? canAccess(user.role, pathname) : false;

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!allowed) router.replace(DEFAULT_PATH);
  }, [ready, user, allowed, router]);

  if (!ready || !user || !allowed) return <Waiting />;
  return <>{children}</>;
}
