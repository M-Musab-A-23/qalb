"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export type GlassCardProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
> & {
  /** Lifts the card 5 px on hover. */
  lift?: boolean;
  /** Uses the stronger glass fill, for surfaces nested inside a card. */
  strong?: boolean;
  /** Removes the default padding. */
  flush?: boolean;
};

export function GlassCard({
  lift = false,
  strong = false,
  flush = false,
  className,
  children,
  ...rest
}: GlassCardProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      whileHover={lift && !reduceMotion ? { y: -5 } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        strong ? "glass-strong" : "glass",
        "rounded-[20px]",
        !flush && "p-[var(--space-5)]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
