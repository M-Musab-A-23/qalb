"use client";

import { useEffect, useState } from "react";
import { getInitialVitals, readNextVitals, type LiveVitals } from "@/lib/data";

/** Simulated live vitals that update once a second while not paused. */
export function useLiveVitals(paused: boolean): LiveVitals {
  const [vitals, setVitals] = useState<LiveVitals>(getInitialVitals);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setVitals((previous) => readNextVitals(previous));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return vitals;
}
