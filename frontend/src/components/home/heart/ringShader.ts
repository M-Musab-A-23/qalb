import { Color, type ShaderMaterialParameters } from "three";

const vertex = /* glsl */ `
  varying float vAlong;
  void main() {
    vAlong = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A faint ring with a bright head and a fading tail that travels along it.
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPhase;
  uniform float uOpacity;
  varying float vAlong;
  void main() {
    float behind = fract(vAlong - uPhase);
    float trail = pow(1.0 - behind, 7.0);
    float a = uOpacity * (0.14 + 0.86 * trail);
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Parameters for a `shaderMaterial`, so React owns the material. */
export function ringParameters(color: Color): ShaderMaterialParameters {
  return {
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uColor: { value: color.clone() },
      uPhase: { value: 0 },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
  };
}
