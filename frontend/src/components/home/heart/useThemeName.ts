"use client";

import { useSyncExternalStore } from "react";
import { getTheme, subscribeTheme, type Theme } from "@/lib/theme";

function getServerTheme(): Theme | null {
  return null;
}

/** The theme on <html>, updated when the toggle changes it. */
export function useThemeName(): Theme | null {
  return useSyncExternalStore<Theme | null>(
    subscribeTheme,
    getTheme,
    getServerTheme,
  );
}
