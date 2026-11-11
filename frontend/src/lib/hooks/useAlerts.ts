"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { User } from "@/lib/auth";
import {
  getAlertsFor,
  getLiveAlerts,
  subscribeLiveAlerts,
  type AlertItem,
} from "@/lib/data";

/** Alerts raised by live feeds this session, newest first. */
export function useLiveAlerts(): AlertItem[] {
  return useSyncExternalStore(subscribeLiveAlerts, getLiveAlerts, getLiveAlerts);
}

/** The alerts an account may see: live ones from this session, then the seeded ones. */
export function useAlertsFor(user: User): AlertItem[] {
  const live = useLiveAlerts();
  // `live` changes whenever a live alert is added, which is when this must recompute.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getAlertsFor(user), [user, live]);
}
