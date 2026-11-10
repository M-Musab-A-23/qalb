"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";

function getServerTheme(): Theme | null {
  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  // The server cannot know the theme, so render a neutral state until mounted.
  const theme = useSyncExternalStore<Theme | null>(
    subscribeTheme,
    getTheme,
    getServerTheme,
  );
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      aria-pressed={theme === "dark"}
      className={className}
    >
      {theme === null ? "Theme" : theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
