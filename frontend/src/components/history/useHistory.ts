"use client";

import { useCallback, useEffect, useState } from "react";
import { demoAccounts } from "@/lib/auth";
import {
  clearAnalyses,
  deleteAnalysis,
  listAnalyses,
  type StoredAnalysis,
} from "@/lib/data";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: StoredAnalysis[]; demoItems: StoredAnalysis[] };

async function fetchState(userId: string, includeDemoPatient: boolean): Promise<State> {
  try {
    const [items, demoItems] = await Promise.all([
      listAnalyses(userId),
      includeDemoPatient ? listAnalyses(demoAccounts.patient.id) : Promise.resolve([]),
    ]);
    return { status: "ready", items, demoItems };
  } catch {
    return { status: "error", message: "Your history could not be loaded." };
  }
}

/**
 * The signed-in user's analyses, plus the demo patient's for a clinician.
 * The demo patient's analyses are read-only here: they belong to another account.
 */
export function useHistory(userId: string, includeDemoPatient: boolean) {
  const [state, setState] = useState<State>({ status: "loading" });
  // Bumped after a change so the list is read again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchState(userId, includeDemoPatient).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [userId, includeDemoPatient, version]);

  const remove = useCallback(
    async (id: string) => {
      await deleteAnalysis(userId, id);
      setVersion((value) => value + 1);
    },
    [userId],
  );

  const clearAll = useCallback(async () => {
    await clearAnalyses(userId);
    setVersion((value) => value + 1);
  }, [userId]);

  return { state, remove, clearAll };
}
