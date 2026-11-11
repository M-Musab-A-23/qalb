"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * The flat illustration of the heart. It is what first paints, what shows
 * while the 3D heart loads, and what stays when the 3D heart cannot run
 * (no WebGL, reduced data, or a failure).
 */
export function HeartPlaceholder({
  className,
  animate = true,
}: {
  className?: string;
  /** Set to false to stop the pulse once it is hidden behind the 3D heart. */
  animate?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={className}>
      <svg
        viewBox="0 0 560 560"
        role="img"
        aria-label="Illustration of a heart with an ECG line"
        className="block size-full overflow-visible"
      >
        <defs>
          <linearGradient id="hero-heart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-fill-hover)" />
            <stop offset="100%" stopColor="var(--color-brand-fill)" />
          </linearGradient>
        </defs>
        <ellipse
          cx="280"
          cy="290"
          rx="270"
          ry="90"
          fill="none"
          stroke="var(--color-signal-line)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          transform="rotate(-24 280 290)"
        />
        <ellipse
          cx="280"
          cy="290"
          rx="270"
          ry="90"
          fill="none"
          stroke="var(--color-signal-line)"
          strokeOpacity="0.2"
          strokeWidth="1.5"
          transform="rotate(24 280 290)"
        />
        <motion.g
          style={{ transformOrigin: "280px 290px" }}
          animate={reduceMotion || !animate ? undefined : { scale: [1, 1.035, 1, 1.02, 1] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.15, 0.3, 0.45, 1],
          }}
        >
          <g transform="translate(40 30) scale(5.45)">
            <path
              d="M44 79.2L12.32 47.08C9.87923 42.7986 9.01258 37.7984 9.87012 32.9452C10.7277 28.0921 13.2554 23.6917 17.0156 20.506C20.7758 17.3202 25.5317 15.5498 30.4598 15.5012C35.3878 15.4526 40.1777 17.129 44 20.24C47.8223 17.129 52.6122 15.4526 57.5402 15.5012C62.4683 15.5498 67.2242 17.3202 70.9844 20.506C74.7446 23.6917 77.2723 28.0921 78.1299 32.9452C78.9874 37.7984 78.1208 42.7986 75.68 47.08L44 79.2Z"
              fill="url(#hero-heart-fill)"
              stroke="var(--color-brand-fill)"
              strokeWidth="2.4"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 6px var(--color-brand-fill))" }}
            />
          </g>
        </motion.g>
        <path
          d="M20 300H170L205 240L250 400L290 200L330 330L360 300H540"
          fill="none"
          stroke="var(--color-signal-line)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 8px var(--color-signal-line))" }}
        />
      </svg>
    </div>
  );
}
