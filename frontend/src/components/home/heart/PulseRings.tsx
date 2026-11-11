"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  TubeGeometry,
  Vector3,
  type ShaderMaterial,
} from "three";
import type { HeartPalette } from "@/lib/heart/palette";
import { ringParameters } from "./ringShader";
import type { BeatState } from "./useBeat";

const RADIUS = 1.75;
const TILT = 0.42;

function createRingGeometry(): TubeGeometry {
  const points: Vector3[] = [];
  const count = 96;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    points.push(
      new Vector3(Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS),
    );
  }
  const curve = new CatmullRomCurve3(points, true);
  return new TubeGeometry(curve, 160, 0.011, 6, true);
}

/**
 * Two thin cyan rings that orbit the heart, crossing like the rings in the
 * logo. A bright head runs round each, one beat for half a lap, and the
 * opposite way on the second ring.
 */
export function PulseRings({
  palette,
  beat,
}: {
  palette: HeartPalette;
  beat: RefObject<BeatState>;
}) {
  const geometry = useMemo(() => createRingGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const args = useMemo(
    () => [ringParameters(palette.signal)] as const,
    [palette.signal],
  );
  const first = useRef<ShaderMaterial>(null);
  const second = useRef<ShaderMaterial>(null);

  useFrame(() => {
    const travel = (beat.current.travel * 0.5) % 1;
    if (first.current) first.current.uniforms.uPhase.value = travel;
    if (second.current) second.current.uniforms.uPhase.value = -travel;
  });

  return (
    <>
      <mesh geometry={geometry} rotation={[0.35, 0, TILT]} renderOrder={2}>
        <shaderMaterial ref={first} args={args} />
      </mesh>
      <mesh geometry={geometry} rotation={[0.35, 0, -TILT]} renderOrder={2}>
        <shaderMaterial ref={second} args={args} />
      </mesh>
    </>
  );
}
