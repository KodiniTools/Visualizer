/**
 * GPU preset: Liquid Light – domain-warped plasma interference. The wave
 * frequencies follow bass / mid / treble, the warp breathes with the bass,
 * a cosine palette around the base colour keeps it in the user's colour.
 * @module visualizers/gl/presets/glPlasma
 */

import { fluidWaves } from '../../organic/fluidWaves.js'

const frag = /* glsl */ `
uniform float uScale;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) * uScale;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float t = uTime;

  // Domain warp that swells with the bass.
  float warpAmt = 0.25 + bass * 0.35;
  vec2 w = vec2(fbm(p * 1.3 + vec2(t * 0.12, 0.0)), fbm(p * 1.3 + vec2(0.0, -t * 0.1))) - 0.5;
  vec2 q = p + w * warpAmt;

  // Classic plasma: four interfering waves, frequencies driven by the bands.
  float fa = 9.0 + bass * 3.0;
  float fb = 11.0 + mid * 4.0;
  float fc = 13.0 + treb * 5.0;
  float v = sin(q.x * fa + t * 0.9)
          + sin(q.y * fb - t * 0.7)
          + sin((q.x + q.y) * fc * 0.5 + t * 1.1)
          + sin(length(q) * (18.0 + bass * 6.0) - t * (1.5 + bass));
  v *= 0.25;                                     // -1 .. 1

  // Cosine palette around the base hue.
  float hue = fract(uColorHsl.x + v * 0.18 + t * 0.01);
  float lum = 0.35 + 0.3 * v;
  vec3 col = hsl2rgb(vec3(hue, 0.85, clamp(lum, 0.15, 0.7)));
  vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.95));

  // Moving contour lines through the field (the liquid-light look) plus a
  // soft glow where the waves align; treble sharpens the lines.
  float contour = abs(fract(v * 2.5 + t * 0.15) - 0.5) * 2.0;
  float lines = (1.0 - smoothstep(0.0, 0.12 - treb * 0.05, contour)) * smoothstep(-0.7, 0.4, v);
  float ridge = smoothstep(0.5 - treb * 0.15, 0.9, v);
  float glow = smoothstep(-0.5, 0.9, v) * 0.45;

  float r = length(p) / uScale;
  float vignette = smoothstep(1.15, 0.45, r);
  float intensity = (0.5 + 0.5 * uIntensity) * vignette;

  vec3 rgb = (col * glow + hot * lines * 0.7 + hot * ridge * (0.5 + uOnset.w * 0.4)) * intensity;
  float alpha = (glow + lines * 0.7 + ridge) * intensity;
  fragColor = outPremul(rgb, alpha);
}
`

export const glPlasma = {
  id: 'glPlasma',
  edgeFade: 'rect',
  name_de: 'Flüssiges Licht (GPU)',
  name_en: 'Liquid Light (GPU)',
  frag,
  uniforms: () => ({ uScale: 1.2 }),
  fallback: fluidWaves,
}
