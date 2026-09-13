/**
 * GPU preset: Fire – procedural flames rising from the bottom; the flame
 * height follows the spectrum along x, the bass makes the whole fire roar,
 * embers drift up on the treble. Successor of audioFire.
 * @module visualizers/gl/presets/glFire
 */

import { audioFire } from '../../particle/audioFire.js'

const frag = /* glsl */ `
uniform float uHeight;

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  // Flame height along x follows the (mirrored) spectrum.
  float sx = abs(uv.x * 2.0 - 1.0) * 0.85;
  float spec = 0.0;
  for (int i = -3; i <= 3; i++) spec += spectrum(sx + float(i) * 0.02);
  spec /= 7.0;
  float height = uHeight * (0.35 + spec * 0.45 + bass * 0.3 + uOnset.x * 0.2) * uIntensity;

  // Vertically stretched, domain-warped noise → flame tongues. The field is
  // reduced with height so the flames thin out towards their tips.
  vec2 q = vec2(uv.x * 3.2 * aspect, uv.y * 1.6 - t * (1.4 + bass * 1.1));
  float warp = fbm(q * 1.3 + vec2(t * 0.15, 0.0));
  float n = fbm(q + vec2(warp - 0.5, 0.0) * 1.0);
  n = pow(smoothstep(0.35, 0.8, n), 1.3);
  float rise = clamp(uv.y / max(height, 0.05), 0.0, 1.5);
  float f = n * 1.15 - rise * rise * 0.9 - rise * 0.3;
  float flame = smoothstep(0.12, 0.5, f);
  float hotF = smoothstep(0.55, 0.95, f) * smoothstep(0.5, 0.0, uv.y);

  // Colour ramp around the base hue: dark → saturated → hot white core.
  float hue = uColorHsl.x;
  vec3 dark = hsl2rgb(vec3(fract(hue - 0.04), 0.9, 0.35));
  vec3 mid = hsl2rgb(vec3(hue, 0.9, 0.55));
  vec3 hot = hsl2rgb(vec3(fract(hue + 0.06), 0.7, 0.78));
  vec3 col = mix(dark, mid, smoothstep(0.0, 0.25, f));
  col = mix(col, hot, hotF);

  // Embers.
  vec2 cells = vec2(60.0 * aspect, 60.0);
  vec2 ec = uv * cells + vec2(0.0, -t * (4.0 + bass * 3.0));
  vec2 eid = floor(ec);
  vec2 ef = fract(ec) - 0.5 + (vec2(hash12(eid), hash12(eid + 3.1)) - 0.5) * 0.6;
  float eh = hash12(eid * 1.3);
  float ember = smoothstep(0.985, 1.0, eh) * (1.0 - smoothstep(0.0, 0.25, length(ef)));
  ember *= smoothstep(0.0, 0.5, uv.y) * (1.0 - uv.y) * (0.4 + treb * 1.5);

  // Base glow.
  float glow = exp(-uv.y * 9.0) * (0.15 + bass * 0.35) * uIntensity;

  vec3 rgb = col * flame * (0.75 + hotF * 0.5) + hot * ember + mid * glow;
  float alpha = flame + ember + glow;
  fragColor = outPremul(rgb, alpha);
}
`

export const glFire = {
  id: 'glFire',
  name_de: 'Feuer (GPU)',
  name_en: 'Fire (GPU)',
  frag,
  uniforms: () => ({ uHeight: 0.8 }),
  fallback: audioFire,
}
