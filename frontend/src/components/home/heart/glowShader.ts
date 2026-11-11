import { AdditiveBlending, Color, type ShaderMaterialParameters } from "three";

const vertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// A soft light that is brightest at the edge (rim) with a faint core, drawn
// over the heart so it reads as light coming from inside it.
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.4);
    float core = pow(facing, 3.0);
    float a = (rim * 0.65 + core * 0.35) * uIntensity;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Parameters for a `shaderMaterial`, so React owns the material. */
export function glowParameters(color: Color): ShaderMaterialParameters {
  return {
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uColor: { value: color.clone() },
      uIntensity: { value: 0.4 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  };
}
