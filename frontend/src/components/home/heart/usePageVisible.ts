"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void): () => void {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

function getSnapshot(): boolean {
  return document.visibilityState !== "hidden";
}

function getServerSnapshot(): boolean {
  return true;
}

/** False while the browser tab is hidden. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
