"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
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
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-[var(--radius-full)] text-[var(--color-text-secondary)] transition-colors outline-none hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]",
        className,
      )}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
