/**
 * GPU preset: LED Ring – two concentric rings of addressable LEDs. The outer
 * ring shows the mirrored spectrum around the circle with a running comet,
 * the inner ring counter-rotates with the mids, the bass flashes everything.
 * @module visualizers/gl/presets/glLedRing
 */

import { radialBars } from '../../spectrum/radialBars.js'

const frag = /* glsl */ `
uniform float uOuterLeds;
uniform float uInnerLeds;

vec4 ringLeds(vec2 p, float radius, float count, float ledR, float spin, float chaseSpeed, float baseHue, float energyScale) {
  float r = length(p);
  float a01 = fract(atan(p.y, p.x) / TAU + 0.5 + spin);
  float idx = floor(a01 * count);
  float af = fract(a01 * count) - 0.5;
  // LED centre in polar → cartesian offset.
  float dAng = af / count * TAU * radius;      // arc distance
  float dRad = r - radius;
  float d = length(vec2(dAng, dRad));
  float aaPx = 1.0 / uResolution.y;

  float sx = abs(fract(idx / count + 0.0) * 2.0 - 1.0) * 0.9;
  float e = spectrum(sx) * energyScale;
  float comet = fract(idx / count - uTime * chaseSpeed);
  comet = smoothstep(0.7, 1.0, comet);
  float lit = clamp(smoothstep(0.03, 0.55, e) + comet * 0.9 + uOnset.x * 0.4, 0.0, 1.0);

  float dot = 1.0 - smoothstep(ledR - aaPx, ledR + aaPx, d);
  float glow = exp(-max(d - ledR, 0.0) / (ledR * 1.6)) * 0.6 * lit;

  float hue = fract(baseHue + idx / count * 0.5);
  vec3 on = hsl2rgb(vec3(hue, 0.95, 0.55));
  vec3 off = hsl2rgb(vec3(hue, 0.5, 0.1));
  vec3 hot = hsl2rgb(vec3(hue, 0.45, 0.92));
  vec3 col = mix(off, on, lit) + hot * comet * 0.5 * lit;
  return vec4(col * dot + on * glow, dot + glow);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float mid = uBands.y;
  float t = uTime;
  float aaPx = 1.0 / uResolution.y;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // PCB ring behind the LEDs.
  float r = length(p);
  float board = smoothstep(0.42, 0.415, r) * smoothstep(0.18, 0.185, r);
  vec3 boardCol = hsl2rgb(vec3(uColorHsl.x, 0.2, 0.07));
  rgb += boardCol * board;
  alpha += board * 0.9;

  vec4 outer = ringLeds(p, 0.36, max(12.0, uOuterLeds), 0.014, t * 0.02, 0.35 + bass * 0.3, uColorHsl.x, uIntensity * (1.0 + bass * 0.3));
  vec4 inner = ringLeds(p, 0.245, max(8.0, uInnerLeds), 0.012, -t * 0.05 - mid * 0.1, -(0.25 + mid * 0.5), uColorHsl.x + 0.5, uIntensity * (0.8 + mid * 0.6));
  rgb += outer.rgb + inner.rgb;
  alpha += outer.a + inner.a;

  // Centre lamp on the bass.
  float core = 1.0 - smoothstep(0.05 + bass * 0.03, 0.06 + bass * 0.03, r);
  float coreGlow = exp(-max(r - 0.05, 0.0) * 18.0) * (0.2 + bass * 0.8 + uOnset.x * 0.5);
  vec3 coreCol = hsl2rgb(vec3(uColorHsl.x, 0.5, 0.9));
  rgb += coreCol * (core * (0.4 + bass * 0.6) + coreGlow);
  alpha += core + coreGlow;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLedRing = {
  id: 'glLedRing',
  name_de: 'LED-Ring (GPU)',
  name_en: 'LED Ring (GPU)',
  frag,
  uniforms: () => ({ uOuterLeds: 60, uInnerLeds: 36 }),
  fallback: radialBars,
}
