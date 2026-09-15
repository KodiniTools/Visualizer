/**
 * GPU preset: Northern Lights Lake – the curtain over a still lake: the sky
 * half shows the aurora and stars, the lower half mirrors them with ripples
 * that grow with the bass; the mids move the folds, treble shimmers.
 * @module visualizers/gl/presets/glAuroraLake
 */

import { fluidWaves } from '../../organic/fluidWaves.js'
import { AURORA_GLSL } from '../aurora.js'

const frag = /* glsl */ `
${AURORA_GLSL}

vec4 sky(vec2 p, float t, float bass, float mid, float treb, float aspect) {
  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float st = stars(p, 40.0, t) * 0.8;
  rgb += vec3(0.9, 0.95, 1.0) * st;
  alpha += st;
  float baseY = 0.02;
  float height = 0.4 + bass * 0.3 + uOnset.x * 0.12;
  float dens = auroraDensity(p.x, p.y - baseY, t, 0.6 + mid * 0.7, height, treb * 0.5);
  float spec = spectrum(abs(p.x / aspect) * 1.6) * uIntensity;
  dens *= 0.7 + spec * 0.8;
  vec3 col = auroraColour(p.y - baseY, uColorHsl.x, fract(uColorHsl.x + 0.28), dens);
  rgb += col * dens * 1.1;
  alpha += dens * 0.95;
  // Far shore silhouette.
  float ridge = mountains(p.x, -0.02, 0.1);
  float ground = 1.0 - smoothstep(ridge, ridge + 0.004, p.y);
  rgb = mix(rgb, vec3(0.015, 0.02, 0.03), ground);
  alpha = mix(alpha, 1.0, ground);
  return vec4(rgb, alpha);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float waterline = -0.08;

  vec4 res;
  if (p.y >= waterline) {
    res = sky(p, t, bass, mid, treb, aspect);
  } else {
    // Mirror with ripples; ripple amplitude grows with the bass and with depth.
    float depth = waterline - p.y;
    float rip = sin(p.x * 40.0 + t * 2.0) * 0.004 + (fbm(vec2(p.x * 8.0, depth * 12.0 - t * 0.8)) - 0.5) * 0.02 * (0.4 + bass);
    vec2 m = vec2(p.x + rip * 2.0, waterline + depth + rip);
    res = sky(m, t, bass, mid, treb, aspect);
    // Water darkens the reflection and adds a blue tint and streaks.
    float streak = 0.85 + 0.15 * sin(depth * 120.0 + t * 3.0);
    res.rgb = res.rgb * 0.55 * streak + vec3(0.01, 0.02, 0.04);
    res.a = max(res.a * 0.7, 0.9);
  }
  // Water edge glint.
  float edge = exp(-abs(p.y - waterline) * 300.0) * 0.4;
  res.rgb += hsl2rgb(vec3(uColorHsl.x, 0.4, 0.7)) * edge;
  res.a += edge;

  fragColor = outPremul(res.rgb, res.a);
}
`

export const glAuroraLake = {
  id: 'glAuroraLake',
  name_de: 'Nordlicht-Spiegelung (GPU)',
  name_en: 'Northern Lights Lake (GPU)',
  frag,
  fallback: fluidWaves,
}
