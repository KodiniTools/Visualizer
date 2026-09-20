/**
 * GPU preset: Light Rays – volumetric god-rays from a bright core; each
 * ray's strength follows the spectrum around the circle, the core beats
 * with the bass. Successor of lightBeams.
 * @module visualizers/gl/presets/glLightRays
 */

import { lightBeams } from '../../effects/lightBeams.js'

const frag = /* glsl */ `
uniform float uRayCount;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  float r = length(p);
  float ang = atan(p.y, p.x);
  float a01 = fract(ang / TAU + 0.5 + t * 0.015);

  // Rays: layered angular noise, sharpened.
  float rays1 = floor(uRayCount);
  float rays2 = floor(uRayCount * 2.3);
  float n1 = vnoisePeriodicX(vec2(a01 * rays1, t * 0.35), rays1);
  float n2 = vnoisePeriodicX(vec2(a01 * rays2 + 7.0, -t * 0.5), rays2);
  float rays = pow(clamp(n1 * 0.7 + n2 * 0.5, 0.0, 1.0), 3.0);

  // Spectrum around the circle boosts individual rays.
  float spec = spectrum(abs(a01 * 2.0 - 1.0) * 0.85);
  rays *= 0.35 + spec * 1.5 * uIntensity;

  // Radial falloff and a soft core.
  float falloff = smoothstep(1.1, 0.05, r) * (0.5 + 0.5 * exp(-r * 2.0));
  float core = exp(-r * r * (35.0 - bass * 15.0)) * (0.5 + bass * 0.8 + uOnset.x * 0.4);

  float hue = fract(uColorHsl.x + a01 * 0.1 + spec * 0.05);
  vec3 col = hsl2rgb(vec3(hue, max(uColorHsl.y, 0.6), 0.6));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.92));

  float beams = rays * falloff * (0.6 + bass * 0.8);
  vec3 rgb = col * beams + hot * core + hot * beams * treb * 0.5;
  float alpha = beams + core;
  fragColor = outPremul(rgb, alpha);
}
`

export const glLightRays = {
  id: 'glLightRays',
  edgeFade: 'radial',
  name_de: 'Lichtstrahlen (GPU)',
  name_en: 'Light Rays (GPU)',
  frag,
  uniforms: () => ({ uRayCount: 28 }),
  fallback: lightBeams,
}
