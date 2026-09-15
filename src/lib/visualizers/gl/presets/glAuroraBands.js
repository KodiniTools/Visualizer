/**
 * GPU preset: Northern Lights Bands – several aurora bands stacked across the
 * sky, each drifting on its own, each tied to a band of the spectrum, over a
 * mountain range with a faint snow glow. Bass swells the lowest band,
 * treble sparkles the highest.
 * @module visualizers/gl/presets/glAuroraBands
 */

import { fluidWaves } from '../../organic/fluidWaves.js'
import { AURORA_GLSL } from '../aurora.js'

const frag = /* glsl */ `
${AURORA_GLSL}
uniform float uBands3;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float st = stars(p, 45.0, t) * 0.7;
  rgb += vec3(0.9, 0.95, 1.0) * st;
  alpha += st;

  float count = clamp(uBands3, 2.0, 5.0);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float k = fi / (count - 1.0);
    float sx = k * 0.85;
    float level = spectrum(sx) * uIntensity;
    // Each band: its own base line, waving with a different phase.
    float baseY = -0.25 + k * 0.5 + sin(p.x * 1.3 + t * 0.3 + fi * 2.0) * 0.05 * (0.5 + mid);
    float height = 0.14 + level * 0.25 + (fi == 0.0 ? bass * 0.15 : 0.0);
    float dens = auroraDensity(p.x + fi * 3.0, p.y - baseY, t * (0.8 + fi * 0.15), 0.4 + mid * 0.5, height, treb * 0.4);
    dens *= 0.5 + level * 1.0;
    float hue = fract(uColorHsl.x + k * 0.22);
    vec3 col = auroraColour(p.y - baseY, hue, fract(hue + 0.25), dens);
    rgb += col * dens * 0.9;
    alpha += dens * 0.8;
  }
  // Highest band sparkles on treble.
  float spark = stars(p * 1.7 + 5.0, 60.0, t * 3.0) * treb * 0.5 * smoothstep(0.0, 0.4, p.y);
  rgb += vec3(1.0) * spark;
  alpha += spark;

  // Mountains with a faint snow glow catching the aurora.
  float ridge = mountains(p.x, -0.38, 0.2);
  float ground = 1.0 - smoothstep(ridge, ridge + 0.004, p.y);
  float snow = smoothstep(ridge - 0.06, ridge, p.y) * ground * 0.12;
  rgb = mix(rgb, vec3(0.02, 0.03, 0.05) + hsl2rgb(vec3(uColorHsl.x, 0.5, 0.5)) * snow, ground);
  alpha = mix(alpha, 1.0, ground);

  fragColor = outPremul(rgb, alpha);
}
`

export const glAuroraBands = {
  id: 'glAuroraBands',
  name_de: 'Nordlicht-Bänder (GPU)',
  name_en: 'Northern Lights Bands (GPU)',
  frag,
  uniforms: () => ({ uBands3: 3 }),
  fallback: fluidWaves,
}
