"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

/** Calls `onReady` once, after the first frame has been drawn. */
export function ReadySignal({ onReady }: { onReady: () => void }) {
  const drawn = useRef(false);
  const fired = useRef(false);

  useFrame(() => {
    drawn.current = true;
  });

  useEffect(() => {
    // The effect runs after the first commit; wait for a frame to be drawn.
    let raf = 0;
    const check = () => {
      if (drawn.current && !fired.current) {
        fired.current = true;
        onReady();
      } else if (!fired.current) {
        raf = requestAnimationFrame(check);
      }
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [onReady]);

  return null;
}
