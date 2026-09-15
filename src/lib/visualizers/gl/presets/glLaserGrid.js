/**
 * GPU preset: Laser Grid – two laser heads in the top corners each fanning
 * beams downward; where the fans cross a lattice forms in the fog. Fan width
 * follows the bass, the fans sweep with the mids, onsets flip the colours.
 * @module visualizers/gl/presets/glLaserGrid
 */

import { neonGrid } from '../../geometric/neonGrid.js'

const frag = /* glsl */ `
uniform float uBeams;

vec4 fan(vec2 p, vec2 src, float baseAng, float width, float count, float hueOff, float t, float aaPx, float flick) {
  vec2 rel = p - src;
  float r = length(rel);
  float ang = atan(rel.x, -rel.y);            // 0 = straight down
  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float k = count > 1.0 ? fi / (count - 1.0) : 0.5;
    float a = baseAng + (k - 0.5) * width;
    float sx = abs(k * 2.0 - 1.0) * 0.85;
    float e = spectrum(sx) * uIntensity;
    float px = abs(ang - a) * r / aaPx;
    float beam = laserGlow(px * 0.8) * exp(-r * 0.55) * (0.3 + e * 1.0) * flick;
    float hue = fract(uColorHsl.x + hueOff + k * 0.3);
    vec3 col = hsl2rgb(vec3(hue, 0.95, 0.55));
    rgb += mix(col, vec3(1.0), 1.0 - smoothstep(0.5, 1.7, px)) * beam;
    alpha += beam;
  }
  return vec4(rgb, alpha);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float flick = 0.85 + 0.15 * sin(t * 45.0) * treb;

  float count = clamp(uBeams, 3.0, 12.0);
  float width = 0.9 + bass * 0.6;
  float sweep = sin(t * (0.5 + mid * 0.8)) * 0.35;
  float flip = step(0.5, fract(floor(t * 0.5 + uOnset.w * 1.5) * 0.5));

  vec2 srcL = vec2(-aspect * 0.46, 0.47);
  vec2 srcR = vec2(aspect * 0.46, 0.47);
  // Left head aims right (positive angle), right head aims left; they cross.
  vec4 left = fan(p, srcL, 0.65 + sweep, width, count, flip * 0.5, t, aaPx, flick);
  vec4 right = fan(p, srcR, -0.65 - sweep, width, count, 0.5 - flip * 0.5, t, aaPx, flick);

  vec3 rgb = left.rgb + right.rgb;
  float alpha = left.a + right.a;

  // Heads.
  vec3 bodyCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.1));
  vec3 hot = hsl2rgb(vec3(uColorHsl.x, 0.4, 0.95));
  vec4 lampL = spotLamp(p, srcL, 0.8 + bass * 0.4, hot, bodyCol);
  vec4 lampR = spotLamp(p, srcR, 0.8 + bass * 0.4, hot, bodyCol);
  rgb += lampL.rgb + lampR.rgb;
  alpha += lampL.a + lampR.a;

  // Fog where the fans overlap.
  float fog = fbm(vec2(p.x * 2.0 + t * 0.1, p.y * 2.0 - t * 0.2));
  float haze = smoothstep(0.3, 0.9, fog) * exp(-abs(p.x) * 2.0) * (0.04 + bass * 0.1) * uIntensity;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.6, 0.6)) * haze;
  alpha += haze;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLaserGrid = {
  id: 'glLaserGrid',
  name_de: 'Laser-Gitter (GPU)',
  name_en: 'Laser Grid (GPU)',
  frag,
  uniforms: () => ({ uBeams: 8 }),
  fallback: neonGrid,
}
