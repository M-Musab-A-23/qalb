export type HeartMode =
  /** Show the static illustration; do not load the 3D scene. */
  | "placeholder"
  /** Show the 3D heart without any animation. */
  | "still"
  /** Show the 3D heart with the beat, rotation and parallax. */
  | "animated";

export type HeartEnvironment = {
  /** Result of the WebGL check, or null until it has run. */
  webgl: boolean | null;
  /** The visitor asked to save data (Save-Data or prefers-reduced-data). */
  reducedData: boolean;
  /** The visitor prefers reduced motion, or null until it is known. */
  reducedMotion: boolean | null;
  /** The WebGL context was lost or the scene failed to start. */
  failed?: boolean;
};

/**
 * Decides what the hero shows. The static illustration is the default, so the
 * 3D scene is only loaded once we know it can run and the visitor has not
 * asked to save data.
 */
export function decideHeartMode(env: HeartEnvironment): HeartMode {
  if (env.failed) return "placeholder";
  if (env.reducedData) return "placeholder";
  if (env.webgl !== true) return "placeholder";
  if (env.reducedMotion !== false) return "still";
  return "animated";
}
