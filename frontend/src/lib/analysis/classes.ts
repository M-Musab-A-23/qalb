import type { BeatClass } from "./types";

export type ClassInfo = {
  /** Plain-language name for tables and the legend. */
  name: string;
  /** Token the plot reads to colour the marker. */
  cssVar: string;
  /** Text colour class for the letter badge. */
  text: string;
  /** Tinted fill class for the letter badge. */
  fill: string;
};

/**
 * Colour is never the only cue: every class also has a letter, shown on the
 * plot markers, in the legend and in the beats table.
 */
export const classInfo: Record<BeatClass, ClassInfo> = {
  N: {
    name: "Normal",
    cssVar: "--color-status-ok-fg",
    text: "text-[var(--color-status-ok-fg)]",
    fill: "bg-[var(--color-status-ok-bg)]",
  },
  S: {
    name: "Supraventricular",
    cssVar: "--color-status-warn-fg",
    text: "text-[var(--color-status-warn-fg)]",
    fill: "bg-[var(--color-status-warn-bg)]",
  },
  V: {
    name: "Ventricular",
    cssVar: "--color-status-crit-fg",
    text: "text-[var(--color-status-crit-fg)]",
    fill: "bg-[var(--color-status-crit-bg)]",
  },
  F: {
    name: "Fusion",
    cssVar: "--color-brand-text",
    text: "text-[var(--color-brand-text)]",
    fill: "bg-[var(--color-brand-tint)]",
  },
  Q: {
    name: "Unclassifiable",
    cssVar: "--color-text-secondary",
    text: "text-[var(--color-text-secondary)]",
    fill: "bg-[var(--color-bg-raised)]",
  },
};
