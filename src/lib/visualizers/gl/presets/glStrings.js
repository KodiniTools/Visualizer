/**
 * GPU preset: Strings – horizontal strings, each tuned to a frequency band,
 * vibrating with fixed ends and glowing with their energy. Successor of
 * vibratingStrings / texturedWave.
 * @module visualizers/gl/presets/glStrings
 */

import { vibratingStrings } from '../../spectrum/vibratingStrings.js'

const frag = /* glsl */ `
uniform float uStrings;   // number of strings (max 12)

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  float t = uTime;
  float count = clamp(uStrings, 1.0, 12.0);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float k = (fi + 0.5) / count;               // 0..1, bottom → top
    float sx = k * 0.9;                          // band: low strings = bass
    float energy = spectrum(sx) * uIntensity;
    float baseY = 0.12 + k * 0.76;

    // Standing wave: mode number rises with pitch, ends fixed at x=0 / x=1.
    float modes = 1.0 + floor(fi * 0.5);
    float env = sin(uv.x * PI);
    float vib = (sin(uv.x * PI * modes) * sin(t * (6.0 + fi * 1.7) + fi)
               + 0.35 * sin(uv.x * PI * (modes + 2.0)) * sin(t * (9.0 + fi * 2.3))) * env;
    float amp = energy * (0.05 + 0.09 * (1.0 - k)) * (1.0 + uOnset.w * 0.6);
    float y = baseY + vib * amp;

    float d = abs(uv.y - y) * uResolution.y;    // px
    float width = 1.2 + energy * 2.2;
    float line = 1.0 - smoothstep(width * 0.5, width * 0.5 + 1.2, d);
    float glow = exp(-d / (6.0 + energy * 14.0)) * (0.12 + energy * 0.55);

    float hue = fract(uColorHsl.x + k * 0.3);
    vec3 col = hsl2rgb(vec3(hue, 0.8, 0.58));
    vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.92));
    rgb += hot * line * (0.5 + energy) + col * glow;
    alpha += line + glow;
  }

  // Faint bridge lines at both ends.
  float bridge = (step(uv.x, 0.012) + step(0.988, uv.x)) * 0.25;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.4, 0.7)) * bridge;
  alpha += bridge;

  fragColor = outPremul(rgb, alpha);
}
`

export const glStrings = {
  id: 'glStrings',
  name_de: 'Saiten (GPU)',
  name_en: 'Strings (GPU)',
  frag,
  uniforms: () => ({ uStrings: 8 }),
  fallback: vibratingStrings,
}
