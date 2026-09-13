/**
 * GPU preset: Pulse Rings – concentric rings expanding from a beating core;
 * the ring shapes are modulated by the spectrum around the circle, the core
 * beats with the bass. Successor of rippleEffect / circles / pulsingOrbs /
 * heartbeat.
 * @module visualizers/gl/presets/glRings
 */

import { rippleEffect } from '../../particle/rippleEffect.js'

const frag = /* glsl */ `
uniform float uRingCount;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float mid = uBands.y;
  float t = uTime;

  float r = length(p);
  float ang = atan(p.y, p.x) / TAU + 0.5;
  // Spectrum around the circle (mirrored, bass at the right).
  float spec = spectrum(abs(ang * 2.0 - 1.0) * 0.85);
  float aaPx = 1.0 / uResolution.y;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float count = clamp(uRingCount, 1.0, 10.0);
  float speed = 0.12 + bass * 0.12 + uOnset.x * 0.1;

  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float phase = fract(fi / count + t * speed);
    float radius = 0.06 + phase * 0.62;
    // Wobble by the spectrum and a slow rotation.
    float wob = spec * 0.07 * uIntensity + sin(ang * TAU * 6.0 + t * 1.5 + fi) * 0.01 * mid;
    float d = abs(r - (radius + wob));
    float life = 1.0 - phase;                       // fades while expanding
    float widthPx = 1.2 + life * 2.0 + bass * 1.5;
    float line = 1.0 - smoothstep(widthPx * 0.5 * aaPx, (widthPx * 0.5 + 1.2) * aaPx, d);
    float glow = exp(-d * (45.0 - bass * 20.0)) * 0.6 * life;
    float hue = fract(uColorHsl.x + phase * 0.25);
    vec3 col = hsl2rgb(vec3(hue, 0.85, 0.6));
    vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.9));
    float vis = life * (0.35 + 0.65 * life);
    rgb += (mix(col, hot, 0.5) * line * 1.1 + col * glow) * vis;
    alpha += (line + glow) * vis;
  }

  // Beating core.
  float coreR = 0.03 + bass * 0.045 + uOnset.x * 0.03;
  float core = 1.0 - smoothstep(coreR * 0.6, coreR + 0.01, r);
  float coreGlow = exp(-max(r - coreR, 0.0) * 22.0) * (0.25 + bass * 0.7);
  vec3 coreCol = hsl2rgb(vec3(uColorHsl.x, 0.75, 0.62));
  vec3 coreHot = hsl2rgb(vec3(uColorHsl.x, 0.4, 0.92));
  rgb += coreHot * core * (0.6 + bass * 0.5) + coreCol * coreGlow;
  alpha += core + coreGlow;

  rgb *= 0.6 + 0.4 * uIntensity;
  alpha *= 0.6 + 0.4 * uIntensity;
  fragColor = outPremul(rgb, alpha);
}
`

export const glRings = {
  id: 'glRings',
  name_de: 'Puls-Ringe (GPU)',
  name_en: 'Pulse Rings (GPU)',
  frag,
  uniforms: () => ({ uRingCount: 7 }),
  fallback: rippleEffect,
}
