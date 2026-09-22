/**
 * GPU preset: Centrifugal Rings – every frame's spectrum is born as a ring
 * in the centre and travels outward, so beats become thick pulsing waves and
 * treble becomes fine spikes along the ring. Uses the spectrum history:
 * radius = age. Unlike the Pulse Rings preset the rings are shaped by the
 * music at their birth and thicken with their own energy.
 * @module visualizers/gl/presets/glShockwaves
 */

import { rippleEffect } from '../../particle/rippleEffect.js'

const frag = /* glsl */ `
uniform float uRingCount;   // rings visible between centre and edge
uniform float uMaxRadius;   // radius at which the oldest ring fades out

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  float r = length(p);
  float ang01 = fract(atan(p.y, p.x) / TAU + 0.5 + t * 0.01);
  // Mirrored spectrum around the circle: bass left/right, treble top/bottom.
  float freq = abs(ang01 * 2.0 - 1.0) * 0.85;

  float maxR = uMaxRadius;
  float age = r / maxR;                       // 0 = newest ring (centre) .. 1 = oldest
  float n = max(4.0, uRingCount);
  float ri = age * n;
  float idx = floor(ri);
  float f = ri - idx - 0.5;                   // -0.5 .. 0.5 inside the ring cell
  float ringAge = (idx + 0.5) / n;

  // Energy of this ring at this angle (its spectrum when it was born) and its
  // overall loudness (for thickness and glow).
  float e = (history(freq - 0.02, ringAge) + history(freq, ringAge) + history(freq + 0.02, ringAge)) / 3.0;
  float loud = (history(0.04, ringAge) + history(0.15, ringAge) + history(0.35, ringAge)) / 3.0;
  e = smoothstep(0.05, 0.6, e * uIntensity);       // exaggerate contrast between quiet and loud
  loud = smoothstep(0.05, 0.6, loud * uIntensity);

  // Ring body: thickness pulses with its energy, radius wobbles with treble spikes.
  float wobble = (history(freq * 1.2 + 0.4, ringAge) - 0.3) * 0.16 * treb;
  float pulse = sin(t * 5.0 + idx * 1.7) * 0.12 * loud;      // each ring breathes with its loudness
  float fw = f + wobble + pulse;
  float thick = 0.04 + e * 0.62 + loud * 0.12;
  float aa = n / uResolution.y * 1.4;         // one pixel in cell units
  float ring = 1.0 - smoothstep(thick * 0.5, thick * 0.5 + aa, abs(fw));
  float glow = exp(-abs(fw) * 7.0) * (0.06 + loud * 0.7);

  float fade = 1.0 - smoothstep(0.55, 1.0, age);
  fade *= smoothstep(0.0, 0.06, age);         // keep the very centre for the core
  float brightness = (ring * (0.12 + e * 1.0) + glow) * fade;

  float hue = fract(uColorHsl.x + ringAge * 0.28 + e * 0.08);
  vec3 col = hsl2rgb(vec3(hue, 0.85, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.92));
  vec3 rgb = mix(col, hot, clamp(e * 1.2 - 0.55, 0.0, 0.8) * ring) * brightness;

  // Newest ring flashes on onsets; beating core.
  float birth = exp(-age * age * 120.0) * (0.3 + uOnset.w * 1.2);
  float coreR = 0.018 + bass * 0.03;
  float core = 1.0 - smoothstep(coreR * 0.5, coreR + 0.01, r);
  float coreGlow = exp(-max(r - coreR, 0.0) * 28.0) * (0.2 + bass * 0.7);
  vec3 coreCol = hsl2rgb(vec3(uColorHsl.x, 0.5, 0.9));
  rgb += coreCol * (core * 0.8 + coreGlow * 0.7 + birth * 0.5);

  float alpha = brightness + core * 0.8 + coreGlow * 0.7 + birth * 0.5;
  fragColor = outPremul(rgb, alpha);
}
`

export const glShockwaves = {
  id: 'glShockwaves',
  edgeFade: 'radial',
  name_de: 'Zentrifugale Ringe (GPU)',
  name_en: 'Centrifugal Rings (GPU)',
  frag,
  uniforms: () => ({ uRingCount: 22, uMaxRadius: 0.78 }),
  fallback: rippleEffect,
}
