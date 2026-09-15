/**
 * GPU preset: Laser Wall – a flat laser sheet from the top, seen edge-on as
 * it sweeps through fog, plus a second vertical sheet. The sheets are
 * modulated by the spectrum along their length, the bass drives the sweep,
 * onsets snap the sheet position, treble flickers.
 * @module visualizers/gl/presets/glLaserWall
 */

import { waveformHorizon } from '../../spectrum/waveformHorizon.js'

const frag = /* glsl */ `
uniform float uSheets;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float flick = 0.88 + 0.12 * sin(t * 42.0) * treb;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float fog = 0.5 + 0.5 * fbm(vec2(p.x * 2.5 + t * 0.15, p.y * 2.5 - t * 0.1));

  float sheets = clamp(uSheets, 1.0, 4.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    if (fi >= sheets) break;
    float k = fi / sheets;
    // Horizontal sheet: sweeps up and down, snapped by onsets.
    float snap = floor(t * 0.6 + uOnset.w * 2.0 + fi);
    float y0 = (hash12(vec2(snap, fi)) - 0.5) * 0.6;
    float y = y0 + sin(t * (0.7 + bass * 1.2) + fi * 2.0) * (0.12 + bass * 0.15);
    // Spectrum ripples the sheet along its length.
    float rx = abs(p.x / aspect) * 1.7;
    float ripple = ((spectrum(rx - 0.03) + spectrum(rx - 0.015) + spectrum(rx) + spectrum(rx + 0.015) + spectrum(rx + 0.03)) * 0.2 - 0.3) * 0.08 * uIntensity;
    float d = abs(p.y - (y + ripple)) / aaPx;
    float sheet = (laserGlow(d * 0.6) + exp(-d * 0.03) * 0.4) * fog * flick;
    // The sheet fades toward the far side like a beam fanning out.
    sheet *= 0.5 + 0.5 * exp(-abs(p.x) * 0.8);
    float hue = fract(uColorHsl.x + k * 0.4);
    vec3 col = hsl2rgb(vec3(hue, 0.95, 0.55));
    rgb += mix(col, vec3(1.0), 1.0 - smoothstep(0.5, 1.7, d)) * sheet * (0.6 + mid * 0.6);
    alpha += sheet * (0.6 + mid * 0.6);
  }

  // Vertical sheet sweeping left/right with the mids.
  float x = sin(t * (0.4 + mid * 0.9)) * aspect * 0.4 + uOnset.x * 0.1;
  float ry = abs(p.y) * 1.7;
  float ripV = ((spectrum(ry - 0.03) + spectrum(ry - 0.015) + spectrum(ry) + spectrum(ry + 0.015) + spectrum(ry + 0.03)) * 0.2 - 0.3) * 0.08 * uIntensity;
  float dv = abs(p.x - (x + ripV)) / aaPx;
  float vsheet = (laserGlow(dv * 0.6) + exp(-dv * 0.03) * 0.4) * fog * flick * (0.5 + 0.5 * exp(-abs(p.y) * 1.2));
  vec3 colV = hsl2rgb(vec3(fract(uColorHsl.x + 0.5), 0.95, 0.55));
  rgb += mix(colV, vec3(1.0), 1.0 - smoothstep(0.5, 1.7, dv)) * vsheet * 0.9;
  alpha += vsheet * 0.9;

  // Fog haze near the sheets.
  float haze = fog * (0.03 + bass * 0.08) * uIntensity;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.6, 0.6)) * haze;
  alpha += haze;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLaserWall = {
  id: 'glLaserWall',
  name_de: 'Laser-Wand (GPU)',
  name_en: 'Laser Wall (GPU)',
  frag,
  uniforms: () => ({ uSheets: 3 }),
  fallback: waveformHorizon,
}
