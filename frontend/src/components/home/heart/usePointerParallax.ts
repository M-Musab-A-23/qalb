"use client";

import { useEffect, useRef, type RefObject } from "react";

export type Pointer = { x: number; y: number };

/**
 * Tracks the pointer as a position in [-1, 1] on both axes, measured from the
 * centre of the window. The value lives in a ref so reading it every frame
 * does not cause React renders. It eases back to the centre when the pointer
 * leaves the window.
 */
export function usePointerParallax(enabled: boolean): RefObject<Pointer> {
  const pointer = useRef<Pointer>({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      pointer.current.x = 0;
      pointer.current.y = 0;
      return;
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  return pointer;
}
