/**
 * GPU preset: Cymatics – Chladni standing-wave patterns. The mode numbers
 * follow the bass / mid / treble levels, so the figure morphs continuously
 * with the music; nodal lines glow like sand on a vibrating plate.
 * @module visualizers/gl/presets/glCymatics
 */

import { geometricKaleidoscope } from '../../geometric/geometricKaleidoscope.js'

const frag = /* glsl */ `
uniform float uScale;

float chladni(vec2 p, float n, float m) {
  return cos(n * PI * p.x) * cos(m * PI * p.y) - cos(m * PI * p.x) * cos(n * PI * p.y);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) * uScale;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float t = uTime;

  p = rot2(t * 0.05 + uOnset.w * 0.15) * p;

  // Continuous mode numbers → the figure morphs instead of jumping.
  float n = 1.5 + bass * 4.5 + sin(t * 0.17) * 0.6;
  float m = 2.5 + mid * 5.0 + cos(t * 0.13) * 0.6;
  float n2 = 3.0 + treb * 6.0;
  float m2 = 1.0 + bass * 3.0;

  float f = chladni(p, n, m) + 0.55 * chladni(p * 1.3, n2, m2) * (0.4 + treb);
  float nodal = 1.0 - smoothstep(0.0, 0.16 + bass * 0.08, abs(f));   // sand collects on the nodes
  float sandGrain = 0.7 + 0.3 * hash12(floor(vUv * uResolution * 0.5));
  float lines = nodal * nodal * sandGrain;
  float glow = exp(-abs(f) * 3.5) * 0.35 * (0.4 + bass);
  // Antinodes shimmer faintly with the treble.
  float anti = smoothstep(0.7, 1.0, abs(f)) * treb * 0.25;

  float r = length(p) / uScale;
  // Die Platte endet an der kurzen Canvas-Kante (statt bei r = 0.8, was im
  // Querformat oben/unten abgeschnitten wuerde); Liniendichte bleibt gleich.
  float edge = halfShortSide();
  float vignette = smoothstep(edge, edge * 0.44, r);

  float hue = fract(uColorHsl.x + f * 0.05);
  vec3 col = hsl2rgb(vec3(hue, 0.75, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.92));

  vec3 rgb = (hot * lines + col * glow + col * anti) * vignette * (0.6 + 0.4 * uIntensity);
  float alpha = (lines + glow + anti) * vignette * (0.6 + 0.4 * uIntensity);
  fragColor = outPremul(rgb, alpha);
}
`

export const glCymatics = {
  id: 'glCymatics',
  name_de: 'Cymatics (GPU)',
  name_en: 'Cymatics (GPU)',
  frag,
  uniforms: () => ({ uScale: 1.6 }),
  fallback: geometricKaleidoscope,
}
