"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { normalizeBpm } from "@/lib/heart/bpm";
import { HeartErrorBoundary } from "./heart/HeartErrorBoundary";
import { useHeartMode } from "./heart/useHeartMode";
import { useInView } from "./heart/useInView";
import { usePageVisible } from "./heart/usePageVisible";
import { HeartPlaceholder } from "./HeartPlaceholder";

// The scene is loaded in the browser only, and only once we know it can run,
// so three.js is not part of the first load and is never fetched when the
// placeholder is all that will be shown.
const HeartCanvas = dynamic(() => import("./heart/HeartCanvas"), {
  ssr: false,
  loading: () => null,
});

type Props = {
  /** Heart rate the beat follows, in beats per minute. Defaults to 72. */
  bpm?: number;
  className?: string;
};

/**
 * The hero visual. The flat illustration fills the space from the first paint
 * and stays until the 3D heart has drawn its first frame, so the layout never
 * shifts. If WebGL is missing, the visitor asked to save data, or the scene
 * fails, the illustration simply stays.
 */
export function HeroHeart({ bpm, className }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const mode = useHeartMode(failed);
  const inView = useInView(container);
  const pageVisible = usePageVisible();

  const handleReady = useCallback(() => setReady(true), []);
  const handleFail = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  const show3D = mode !== "placeholder";
  const showCanvas = show3D && ready;

  return (
    <div ref={container} className={cn("relative", className)}>
      <div
        aria-hidden={showCanvas || undefined}
        className={cn(
          "absolute inset-0 transition-[opacity,visibility] duration-500",
          showCanvas ? "invisible opacity-0" : "visible opacity-100",
        )}
      >
        <HeartPlaceholder className="size-full" animate={!showCanvas} />
      </div>
      {show3D ? (
        <div
          role="img"
          aria-label="A three-dimensional heart with a pulse line orbiting it"
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <HeartErrorBoundary onError={handleFail}>
            <HeartCanvas
              bpm={normalizeBpm(bpm)}
              animated={mode === "animated"}
              paused={!inView || !pageVisible}
              onReady={handleReady}
              onFail={handleFail}
            />
          </HeartErrorBoundary>
        </div>
      ) : null}
    </div>
  );
}
