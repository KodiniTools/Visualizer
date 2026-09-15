/**
 * GPU preset: Laser Tunnel – the classic cone seen head-on: concentric laser
 * rings and rotating spokes, rings expanding with the bass, spokes counted by
 * the mids, onsets reverse the spin, treble flickers. Fog glows between.
 * @module visualizers/gl/presets/glLaserTunnel
 */

import { vortexPortal } from '../../effects/vortexPortal.js'

const frag = /* glsl */ `
uniform float uSpokes;
uniform float uRings;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;

  float r = length(p);
  float ang = atan(p.y, p.x);
  float spin = t * 0.35 * (1.0 + mid) + uOnset.w * 0.8;
  float flick = 0.85 + 0.15 * sin(t * 40.0) * treb;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float fog = 0.6 + 0.4 * fbm(vec2(ang * 1.5 + t * 0.1, r * 3.0 - t * 0.3));

  // Rings: expanding with time, breathing with the bass.
  float rings = clamp(uRings, 2.0, 10.0);
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    if (fi >= rings) break;
    float phase = fract(fi / rings + t * 0.12);
    float rr = 0.04 + phase * 0.6 * (1.0 + bass * 0.2);
    float sx = fract(fi / rings) * 0.9;
    float e = spectrum(sx) * uIntensity;
    float px = abs(r - rr) / aaPx;
    float life = smoothstep(0.0, 0.1, phase) * (1.0 - smoothstep(0.75, 1.0, phase));
    float line = laserGlow(px * 0.7) * life * (0.35 + e * 1.1) * flick;
    float hue = fract(uColorHsl.x + phase * 0.5);
    vec3 col = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.95));
    rgb += mix(col, hot, 1.0 - smoothstep(0.5, 1.7, px)) * line;
    alpha += line;
  }

  // Spokes: rotating radial beams, lit by the spectrum around the circle.
  float spokes = clamp(uSpokes, 4.0, 24.0);
  float a01 = fract((ang + spin) / TAU);
  float si = floor(a01 * spokes);
  float sf = (fract(a01 * spokes) - 0.5) / spokes * TAU;   // angular offset
  float spx = abs(sf) * r / aaPx;
  float sx2 = abs(fract(si / spokes) * 2.0 - 1.0) * 0.85;
  float e2 = spectrum(sx2) * uIntensity;
  float spoke = laserGlow(spx * 0.8) * smoothstep(0.02, 0.12, r) * exp(-r * 1.2) * (0.2 + e2 * 1.1) * flick;
  float hueS = fract(uColorHsl.x + si / spokes * 0.6 + 0.5);
  vec3 colS = hsl2rgb(vec3(hueS, 0.95, 0.55));
  rgb += mix(colS, vec3(1.0), 1.0 - smoothstep(0.5, 1.7, spx)) * spoke * 0.9;
  alpha += spoke * 0.9;

  // Fog haze inside the cone.
  float haze = exp(-r * 3.0) * fog * (0.06 + bass * 0.15) * uIntensity;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.6, 0.6)) * haze;
  alpha += haze;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLaserTunnel = {
  id: 'glLaserTunnel',
  name_de: 'Laser-Tunnel (GPU)',
  name_en: 'Laser Tunnel (GPU)',
  frag,
  uniforms: () => ({ uSpokes: 12, uRings: 7 }),
  fallback: vortexPortal,
}
