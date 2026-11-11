"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True while the element is on screen. Starts as true so the scene renders
 * its first frame, and the observer then pauses it once it scrolls away.
 */
export function useInView(
  ref: RefObject<Element | null>,
  rootMargin = "80px",
): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}
