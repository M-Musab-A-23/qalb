"use client";

import { motion, useReducedMotion } from "motion/react";
import { bladeDuration, bladeEase } from "@/lib/motion";

export type AuthMode = "signin" | "register";

// The blade covers the right of the card when signing in and slides left to
// cover the left side when registering. Percentages are of the blade width,
// so the motion scales with the card.
const BLADE_REGISTER_X = "-94.87%";

export function Blade({ mode }: { mode: AuthMode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      initial={false}
      animate={{ x: mode === "signin" ? "0%" : BLADE_REGISTER_X }}
      transition={{
        duration: reduceMotion ? 0 : bladeDuration,
        ease: bladeEase,
      }}
      className="pointer-events-none absolute -top-px left-[44.64%] h-[calc(100%+2px)] w-[69.64%]"
    >
      <div className="absolute inset-0 origin-center -skew-x-[7deg] overflow-hidden border-x-[1.5px] border-[var(--color-signal-line)] bg-[var(--pulse-900)]">
        <svg
          viewBox="0 0 780 100"
          preserveAspectRatio="none"
          className="absolute bottom-[56px] left-0 h-[100px] w-full text-[var(--neutral-0)] opacity-20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <path
            vectorEffect="non-scaling-stroke"
            d="M0 52H140L168 4L196 96L220 30L238 52H390L418 4L446 96L470 30L488 52H640L668 4L696 96L720 30L738 52H780"
          />
        </svg>
      </div>
    </motion.div>
  );
}
