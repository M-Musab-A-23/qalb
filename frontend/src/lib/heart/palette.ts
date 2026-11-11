import { Color } from "three";

/** The CSS variables the heart takes its colours from. */
export const HEART_TOKENS = {
  heart: "--color-brand-fill",
  highlight: "--color-brand-fill-hover",
  signal: "--color-signal-line",
} as const;

export type HeartPalette = {
  heart: Color;
  highlight: Color;
  signal: Color;
  /** Dark themes need a stronger glow to read against the page. */
  dark: boolean;
};

const FALLBACK = {
  heart: "#d12a45",
  highlight: "#e8405a",
  signal: "#22d3ee",
} as const;

const COLOR_SYNTAX = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([^)]*\))$/i;

/** Parses a CSS colour string, returning the fallback if it is not one. */
export function parseCssColor(value: string, fallback: string): Color {
  const text = value.trim();
  // Color.set ignores text it does not understand, so check the syntax first.
  if (COLOR_SYNTAX.test(text) || text.toLowerCase() in Color.NAMES) {
    return new Color().set(text);
  }
  return new Color(fallback);
}

/** Reads the heart colours from the tokens in effect on an element. */
export function readHeartPalette(
  element: Element,
  dark: boolean,
): HeartPalette {
  const style = getComputedStyle(element);
  const read = (token: string, fallback: string) =>
    parseCssColor(style.getPropertyValue(token), fallback);
  return {
    heart: read(HEART_TOKENS.heart, FALLBACK.heart),
    highlight: read(HEART_TOKENS.highlight, FALLBACK.highlight),
    signal: read(HEART_TOKENS.signal, FALLBACK.signal),
    dark,
  };
}
