/**
 * GPU preset: Ferrofluid – a glossy black drop of magnetic liquid. Spikes
 * grow from its rim, one per frequency band: bass at the top, treble at the
 * bottom, mirrored left/right.
 * Bass sets the drop size, a bass hit pulls it in and shoots the spikes out,
 * treble makes the highlights shimmer. The drop stays dark, so it also reads
 * on a light background.
 * @module visualizers/gl/presets/glFerrofluid
 */

import { radialBars } from '../../spectrum/radialBars'

const frag = /* glsl */ `
uniform float uSpikes;   // spikes around the rim

// Drop surface: x = height (0 outside … 1 in the centre), y = signed radial
// distance to the outline (< 0 inside). The dome only depends on the smooth
// base radius, the spikes only add near the rim → no streaks in the body.
vec2 drop(vec2 p) {
  float r = length(p);
  // Winkel ab oben, links/rechts gespiegelt: Bass oben, Höhen unten.
  float u = atan(p.x, p.y) / TAU + 0.5;          // 0/1 unten, 0.5 oben
  float n = uSpikes;
  float s = u * n;
  float c = (floor(s) + 0.5) / n;                 // Mitte des Stachels
  float local = fract(s) - 0.5;
  float f = abs(c * 2.0 - 1.0);                   // 0 = Bass … 1 = Höhen
  float h = spectrum(0.03 + f * 0.7);

  float R = 0.16 + uBands.x * 0.045 - uOnset.x * 0.03
          + (vnoisePeriodicX(vec2(u * 9.0, uTime * 0.6), 9.0) - 0.5) * 0.02;
  float prof = pow(max(0.0, 1.0 - abs(local) * 2.0), 3.0);   // spitzer Kegel
  float len = pow(h, 1.3) * 0.2 * (0.6 + 0.4 * uIntensity) * (1.0 + uOnset.x * 0.5);
  float spike = len * prof;
  // Spitzen enden vor der kurzen Canvas-Kante (0.5), sonst würden sie abgeschnitten.
  float outline = min(R + spike, 0.45);

  float q = r / max(R, 1e-3);
  float dome = sqrt(max(0.0, 1.0 - q * q));
  float base = R * 0.8;
  float spikeH = 0.45 * prof * clamp(1.0 - (r - base) / max(outline - base, 1e-4), 0.0, 1.0);
  return vec2(max(dome, spikeH * step(base, r)), r - outline);
}

void main() {
  vec2 p = centeredFit(0.5);
  float px = 0.5 / (halfShortSide() * uResolution.y);   // ein Pixel in p-Einheiten
  float treb = uBands.z;

  vec2 d0 = drop(p);
  float zx = drop(p + vec2(px * 1.5, 0.0)).x;
  float zy = drop(p + vec2(0.0, px * 1.5)).x;
  vec2 g = vec2(zx - d0.x, zy - d0.x) / (px * 1.5);
  vec3 n = normalize(vec3(-g * 0.045, 1.0));

  // Kantenglättung über den radialen Abstand zur Kontur.
  float body = 1.0 - smoothstep(-px, px, d0.y);

  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L1 = normalize(vec3(-0.45, 0.6, 0.65));
  vec3 L2 = normalize(vec3(0.6, -0.35, 0.7));
  float spec1 = pow(max(dot(reflect(-L1, n), V), 0.0), 48.0);
  float spec2 = pow(max(dot(reflect(-L2, n), V), 0.0), 20.0);
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);
  float shimmer = 0.75 + treb * 0.7 + 0.15 * sin(uTime * 23.0 + p.x * 40.0) * treb;

  float hue = uColorHsl.x;
  vec3 col = hsl2rgb(vec3(hue, 0.8, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.25, 0.95));
  vec3 ink = vec3(0.012, 0.012, 0.016);

  vec3 surface = ink + hot * spec1 * shimmer + col * spec2 * 0.55 + col * fres * 0.7;

  // Leuchten um den Tropfen (nur außerhalb).
  float r = length(p);
  float halo = exp(-max(r - 0.16, 0.0) * 11.0) * (0.06 + uBands.x * 0.3 + uOnset.x * 0.25) * (1.0 - body);
  float vignette = smoothstep(0.5, 0.46, r);

  vec3 rgb = (surface * body + col * halo) * vignette;
  float alpha = (body + halo) * vignette;
  fragColor = outPremul(rgb, alpha);
}
`

export const glFerrofluid = {
  id: 'glFerrofluid',
  edgeFade: 'radial',
  name_de: 'Ferrofluid (GPU)',
  name_en: 'Ferrofluid (GPU)',
  frag,
  uniforms: () => ({ uSpikes: 36 }),
  fallback: radialBars,
}
