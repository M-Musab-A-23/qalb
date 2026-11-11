"use client";

import { useCallback, useMemo } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import { readHeartPalette } from "@/lib/heart/palette";
import { HeartScene } from "./HeartScene";
import { ReadySignal } from "./ReadySignal";
import { useThemeName } from "./useThemeName";
import { usePointerParallax } from "./usePointerParallax";

export type HeartCanvasProps = {
  bpm: number;
  /** Beat, rotation and parallax. False draws a single still frame. */
  animated: boolean;
  /** True while the hero is off screen or the tab is hidden. */
  paused: boolean;
  onReady: () => void;
  onFail: () => void;
};

/**
 * The 3D heart. This module is only ever loaded in the browser, on demand,
 * so three.js stays out of the first load of the page.
 */
export default function HeartCanvas({
  bpm,
  animated,
  paused,
  onReady,
  onFail,
}: HeartCanvasProps) {
  const theme = useThemeName();
  // Read again whenever the theme changes, so the colours follow the tokens.
  const palette = useMemo(
    () => readHeartPalette(document.documentElement, theme === "dark"),
    [theme],
  );
  const pointer = usePointerParallax(animated && !paused);

  const handleCreated = useCallback(
    ({ gl }: RootState) => {
      gl.setClearColor(0x000000, 0);
      gl.domElement.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        onFail();
      });
    },
    [onFail],
  );

  return (
    <Canvas
      flat
      dpr={[1, 2]}
      frameloop={paused ? "never" : animated ? "always" : "demand"}
      camera={{ position: [0, 0, 6.6], fov: 30, near: 0.1, far: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={handleCreated}
    >
      <HeartScene
        palette={palette}
        bpm={bpm}
        animated={animated}
        pointer={pointer}
      />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}
