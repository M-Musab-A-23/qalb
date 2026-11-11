"use client";

import { Environment, Lightformer } from "@react-three/drei";
import type { HeartPalette } from "@/lib/heart/palette";

/**
 * A soft key light, a cyan rim light from behind, and a small generated
 * environment (a few light panels, no image file) for the glossy reflections.
 * The panels are drawn once; they are redrawn only when the theme changes.
 */
export function SceneLights({ palette }: { palette: HeartPalette }) {
  const { dark, key, signal, heart } = palette;
  return (
    <>
      <ambientLight color={key} intensity={dark ? 0.22 : 0.45} />
      <directionalLight
        color={key}
        position={[3.5, 4, 5]}
        intensity={dark ? 2.2 : 2.6}
      />
      <directionalLight
        color={signal}
        position={[-4, 1.5, -3.5]}
        intensity={dark ? 3 : 1.8}
      />
      <Environment
        key={dark ? "dark" : "light"}
        resolution={64}
        frames={1}
        environmentIntensity={dark ? 0.75 : 0.95}
      >
        <Lightformer
          form="rect"
          color={key}
          intensity={2}
          position={[-3, 3, 4]}
          scale={[5, 3, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          color={signal}
          intensity={1.2}
          position={[4, -1, -3]}
          scale={[1.5, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          color={heart}
          intensity={0.8}
          position={[0, -4, 2]}
          scale={4}
          target={[0, 0, 0]}
        />
      </Environment>
    </>
  );
}
