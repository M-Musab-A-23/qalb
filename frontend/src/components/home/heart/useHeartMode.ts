"use client";

import { useSyncExternalStore } from "react";
import { decideHeartMode, type HeartMode } from "@/lib/heart/mode";
import { detectWebGL, prefersReducedData } from "@/lib/heart/capabilities";

const noopSubscribe = () => () => {};

function subscribeMedia(query: string) {
  return (listener: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  };
}

const subscribeMotion = subscribeMedia("(prefers-reduced-motion: reduce)");

// The WebGL probe creates a context, so run it once and remember the answer.
let webglResult: boolean | null = null;
function getWebGL(): boolean {
  if (webglResult === null) webglResult = detectWebGL();
  return webglResult;
}

/**
 * What the hero should show for this visitor. On the server and during
 * hydration the answer is "placeholder", so the markup matches and the
 * static illustration is what first paints.
 */
export function useHeartMode(failed: boolean): HeartMode {
  const webgl = useSyncExternalStore<boolean | null>(
    noopSubscribe,
    getWebGL,
    () => null,
  );
  const reducedData = useSyncExternalStore(
    noopSubscribe,
    prefersReducedData,
    () => true,
  );
  const reducedMotion = useSyncExternalStore<boolean | null>(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => null,
  );

  return decideHeartMode({ webgl, reducedData, reducedMotion, failed });
}
