"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { DEFAULT_PATH } from "@/lib/auth";
import { useAuth } from "./AuthProvider";

/** Sends people who are already signed in past the sign-in and register pages. */
export function GuestGate({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace(DEFAULT_PATH);
  }, [ready, user, router]);

  return <>{children}</>;
}
