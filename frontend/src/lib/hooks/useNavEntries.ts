"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { navEntriesFor, type NavEntry } from "@/lib/nav";

/** Sidebar entries for the signed-in role; empty until a user is known. */
export function useNavEntries(): NavEntry[] {
  const { user } = useAuth();
  return user ? navEntriesFor(user.role) : [];
}
