/**
 * GPU preset: Fractal Bloom – a kaleidoscopic iterated-function fractal
 * (fold, rotate, scale) whose fold distances breathe with the bass and whose
 * rotation follows the onsets. Orbit traps give glowing veins and petals.
 * @module visualizers/gl/presets/glFractal
 */

import { geometricKaleidoscope } from '../../geometric/geometricKaleidoscope.js'

const frag = /* glsl */ `
uniform float uIterations;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float t = uTime;

  float zoom = 2.1 - bass * 0.2;
  p = rot2(t * 0.04 + uOnset.w * 0.12) * p * zoom;

  float foldA = 0.62 + bass * 0.12 + sin(t * 0.21) * 0.05;
  float foldB = 0.34 + mid * 0.1 + cos(t * 0.17) * 0.04;
  float twist = 0.55 + sin(t * 0.09) * 0.25 + uOnset.x * 0.15;

  float trapArc = 10.0;
  float trapPetal = 10.0;
  float trapIter = 0.0;
  float scale = 1.0;
  float iters = clamp(uIterations, 3.0, 12.0);
  for (int i = 0; i < 12; i++) {
    if (float(i) >= iters) break;
    p = abs(p) - vec2(foldA, foldB);
    p = rot2(twist) * p;
    p *= 1.22;
    scale *= 1.22;
    // Distances measured in screen space (divide by the accumulated scale) so
    // every iteration contributes lines of similar thickness.
    float dp = length(p - vec2(0.35, 0.0)) / scale;
    float da = abs(length(p) - 0.55) / scale;
    if (i >= 2 && da < trapArc) trapArc = da;
    if (dp < trapPetal) { trapPetal = dp; trapIter = float(i); }
  }
  // One vein layer from the final fold only (no parallel bundles).
  float trapVein = abs(p.x) / scale;

  // Veins: thin bright lines where the orbit passed the fold axis.
  float veins = (1.0 - smoothstep(0.0, 0.003 + treb * 0.002, trapVein)) * 0.35;
  float veinGlow = exp(-trapVein * 60.0) * 0.15;
  float arcs = (1.0 - smoothstep(0.0, 0.0025, trapArc)) * 0.35 * (0.5 + mid);
  // Petals: soft glow around the second trap, coloured by iteration depth.
  float petals = exp(-trapPetal * (16.0 - bass * 6.0)) * 1.2 + exp(-trapPetal * 5.0) * 0.35;

  float r = length((vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0));
  float vignette = smoothstep(0.95, 0.3, r);

  float hueP = fract(uColorHsl.x + trapIter / iters * 0.16 + t * 0.01);
  vec3 petalCol = hsl2rgb(vec3(hueP, 0.85, 0.55));
  vec3 veinCol = hsl2rgb(vec3(fract(uColorHsl.x + 0.06), 0.55, 0.85));
  vec3 hot = hsl2rgb(vec3(uColorHsl.x, 0.3, 0.95));

  vec3 rgb = petalCol * petals + mix(veinCol, hot, treb) * (veins * 0.9 + veinGlow) + petalCol * arcs;
  rgb *= vignette * (0.55 + 0.45 * uIntensity);
  float alpha = (petals + veins + veinGlow + arcs) * vignette * (0.55 + 0.45 * uIntensity);
  fragColor = outPremul(rgb, alpha);
}
`

export const glFractal = {
  id: 'glFractal',
  name_de: 'Fraktal-Blüte (GPU)',
  name_en: 'Fractal Bloom (GPU)',
  frag,
  uniforms: () => ({ uIterations: 8 }),
  fallback: geometricKaleidoscope,
}
