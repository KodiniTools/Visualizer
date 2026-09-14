/**
 * GPU preset: Flower of Life – the sacred-geometry lattice of overlapping
 * circles. The lattice breathes with the bass, rings light up from the centre
 * outward with the spectrum, the whole figure slowly rotates and pulses.
 * @module visualizers/gl/presets/glFlowerOfLife
 */

import { bloomingMandala } from '../../organic/bloomingMandala.js'

const frag = /* glsl */ `
uniform float uRadius;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  float R = uRadius * (1.0 + bass * 0.06 + uOnset.x * 0.04);
  p = rot2(t * 0.05 + uOnset.w * 0.1) * p;

  // Hex lattice with spacing R (the classic construction).
  vec2 basisA = vec2(R, 0.0);
  vec2 basisB = vec2(R * 0.5, R * 0.8660254);
  mat2 inv = inverse(mat2(basisA, basisB));
  vec2 lat = inv * p;
  vec2 base = floor(lat);

  float aaPx = 1.0 / uResolution.y;
  float lineW = 1.3 * aaPx + treb * 1.5 * aaPx;
  float lines = 0.0;
  float glow = 0.0;
  float rMax = 0.46;

  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 cell = base + vec2(float(i), float(j));
      vec2 c = cell.x * basisA + cell.y * basisB;
      float cd = length(c);
      if (cd > rMax + 0.001) continue;             // only circles inside the outer ring
      float d = abs(length(p - c) - R);
      // Ring index from the centre → frequency band.
      float ringIdx = floor(cd / R + 0.5);
      float band = spectrum(clamp(ringIdx / 4.0, 0.0, 1.0) * 0.9);
      float lit = 0.35 + smoothstep(0.05, 0.6, band * uIntensity) * 0.9;
      lines += (1.0 - smoothstep(lineW, lineW + 1.2 * aaPx, d)) * lit;
      glow += exp(-d * 60.0) * 0.25 * lit;
    }
  }
  lines = min(lines, 1.0);

  // Outer double ring bounding the figure.
  float r = length(p);
  float outer = 1.0 - smoothstep(lineW, lineW + 1.2 * aaPx, abs(r - rMax));
  outer += (1.0 - smoothstep(lineW, lineW + 1.2 * aaPx, abs(r - rMax - 0.02))) * 0.7;
  float inside = smoothstep(rMax + 0.03, rMax - 0.02, r);
  lines *= inside;
  glow *= inside;

  // Centre pulse.
  float core = exp(-r * r / (R * R * 0.4)) * (0.15 + bass * 0.5);

  float hue = fract(uColorHsl.x + r * 0.15 + t * 0.01);
  vec3 col = hsl2rgb(vec3(hue, 0.8, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.95));

  vec3 rgb = hot * lines * 0.9 + col * glow + hot * outer * 0.8 + col * core;
  float alpha = lines * 0.9 + glow + outer * 0.8 + core;
  fragColor = outPremul(rgb, alpha);
}
`

export const glFlowerOfLife = {
  id: 'glFlowerOfLife',
  name_de: 'Blume des Lebens (GPU)',
  name_en: 'Flower of Life (GPU)',
  frag,
  uniforms: () => ({ uRadius: 0.115 }),
  fallback: bloomingMandala,
}
