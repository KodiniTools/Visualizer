/**
 * GPU preset: Tree Rings – the song grows like a tree trunk. The newest
 * spectrum sits in the centre, older spectra move outwards and fade. The
 * angle is the frequency (bass at the top, treble at the bottom, mirrored
 * left/right), brightness and ring width follow the energy, so loud passages
 * leave thick, bright rings and quiet ones thin, faint rings.
 * @module visualizers/gl/presets/glTreeRings
 */

import { circles } from '../../geometric/circles.js'

const frag = /* glsl */ `
uniform float uRings;   // visible ring boundaries across the radius

void main() {
  // Radius 0.5 = halbe kurze Canvas-Kante → die Scheibe bleibt ganz sichtbar.
  vec2 p = centeredFit(0.5);
  float r = length(p);
  float t = uTime;
  float bass = uBands.x;

  const float CORE = 0.045;
  const float EDGE = 0.5;
  float age = clamp((r - CORE) / (EDGE - CORE), 0.0, 1.0);

  // 0 oben, ±0.5 unten; ältere Ringe sind leicht verdreht → langsame Spirale.
  float a = atan(p.x, p.y) / TAU;
  float aRot = a + t * 0.012 + age * 0.09;
  float f = abs(fract(aRot + 0.5) - 0.5) * 2.0;   // 0 = Bass (oben) … 1 = Höhen (unten)

  float e = history(f * 0.85, age);

  // Holzmaserung: Ringe wellen sich leicht, energiereiche Stellen beulen aus.
  float wob = (vnoisePeriodicX(vec2(fract(aRot) * 14.0, age * 5.0 + 3.1), 14.0) - 0.5) * 0.018;
  float rr = (age + wob + e * 0.012) * uRings;
  float cell = fract(rr);
  float dist = min(cell, 1.0 - cell);              // Abstand zur Ringgrenze (in Ring-Einheiten)
  float lineW = 0.05 + e * 0.28;
  float aa = fwidth(rr) * 1.2 + 1e-4;
  float line = 1.0 - smoothstep(lineW, lineW + aa, dist);

  // Ältere Ringe verblassen, bleiben aber als Maserung erkennbar.
  float fade = mix(1.0, 0.32, age);
  float fill = e * 0.55 * fade;
  float ring = line * (0.25 + e * 0.9) * fade;

  float hue = fract(uColorHsl.x + f * 0.18 + age * 0.08);
  vec3 col = hsl2rgb(vec3(hue, 0.72, 0.52));
  vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.9));

  // Kern: atmet mit dem Bass, blitzt bei jedem Beat.
  float core = exp(-r * 26.0) * (0.35 + bass * 0.8 + uOnset.w * 0.9);
  float pulse = exp(-abs(r - CORE - uOnset.w * 0.035) * 140.0) * uOnset.w;

  float inside = step(CORE, r);
  float vignette = smoothstep(EDGE, EDGE * 0.93, r);
  float k = 0.6 + 0.4 * uIntensity;

  vec3 rgb = (col * fill * inside + hot * ring * inside + hot * core + col * pulse) * vignette * k;
  float alpha = (fill * inside + ring * inside + core + pulse) * vignette * k;
  fragColor = outPremul(rgb, alpha);
}
`

export const glTreeRings = {
  id: 'glTreeRings',
  edgeFade: 'radial',
  name_de: 'Jahresringe (GPU)',
  name_en: 'Tree Rings (GPU)',
  frag,
  uniforms: () => ({ uRings: 24 }),
  fallback: circles,
}
