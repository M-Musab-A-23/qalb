"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshPhysicalMaterial, ShaderMaterial } from "three";
import { createHeartGeometry } from "@/lib/heart/geometry";
import type { HeartPalette } from "@/lib/heart/palette";
import { beatScale } from "@/lib/heart/pulse";
import { glowParameters } from "./glowShader";
import type { BeatState } from "./useBeat";

type Props = {
  palette: HeartPalette;
  beat: RefObject<BeatState>;
};

/**
 * The heart itself: a glossy crimson surface and, on top of it, a soft glow
 * that brightens with each contraction. Two draw calls in total.
 */
export function HeartBody({ palette, beat }: Props) {
  const geometry = useMemo(() => createHeartGeometry(), []);
  const glowArgs = useMemo(
    () => [glowParameters(palette.highlight)] as const,
    [palette.highlight],
  );
  const glow = useRef<ShaderMaterial>(null);
  const body = useRef<Mesh>(null);
  const shell = useRef<Mesh>(null);
  const surface = useRef<MeshPhysicalMaterial>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const { phase, envelope } = beat.current;
    const scale = beatScale(phase);
    for (const mesh of [body.current, shell.current]) {
      mesh?.scale.setScalar(scale);
    }
    if (surface.current) {
      surface.current.emissiveIntensity = 0.1 + 0.45 * envelope;
    }
    if (glow.current) {
      const base = palette.dark ? 0.55 : 0.35;
      glow.current.uniforms.uIntensity.value =
        base + (palette.dark ? 0.9 : 0.6) * envelope;
    }
  });

  return (
    <>
      <mesh ref={body} geometry={geometry}>
        <meshPhysicalMaterial
          ref={surface}
          color={palette.heart}
          emissive={palette.highlight}
          emissiveIntensity={0.1}
          roughness={0.3}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={1}
        />
      </mesh>
      <mesh ref={shell} geometry={geometry} renderOrder={1}>
        <shaderMaterial ref={glow} args={glowArgs} />
      </mesh>
    </>
  );
}
