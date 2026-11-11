"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import type { HeartPalette } from "@/lib/heart/palette";
import { HeartBody } from "./HeartBody";
import { PulseRings } from "./PulseRings";
import { SceneLights } from "./SceneLights";
import { useBeat } from "./useBeat";
import type { Pointer } from "./usePointerParallax";

/** Idle turn, in radians per second: one lap in about 35 seconds. */
const IDLE_SPEED = 0.18;
/** Largest tilt towards the cursor, in radians (about 6 degrees). */
const MAX_TILT = 0.1;
/** Pose of the still heart, turned a little so it reads as solid. */
const STILL_YAW = -0.4;

type Props = {
  palette: HeartPalette;
  bpm: number;
  /** Beat, idle rotation and parallax. When false the heart is still. */
  animated: boolean;
  pointer: RefObject<Pointer>;
};

export function HeartScene({ palette, bpm, animated, pointer }: Props) {
  const beat = useBeat(bpm, animated);
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const yaw = useRef(STILL_YAW);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (animated) yaw.current += dt * IDLE_SPEED;
    const { x, y } = animated ? pointer.current : { x: 0, y: 0 };
    if (tilt.current) {
      tilt.current.rotation.x = MathUtils.damp(
        tilt.current.rotation.x,
        -y * MAX_TILT,
        4,
        dt,
      );
      tilt.current.rotation.y = MathUtils.damp(
        tilt.current.rotation.y,
        x * MAX_TILT,
        4,
        dt,
      );
    }
    if (spin.current) spin.current.rotation.y = yaw.current;
  });

  return (
    <>
      <SceneLights palette={palette} />
      <group ref={tilt}>
        <group ref={spin} rotation={[0, STILL_YAW, 0]}>
          <HeartBody palette={palette} beat={beat} />
        </group>
        <PulseRings palette={palette} beat={beat} />
      </group>
    </>
  );
}
