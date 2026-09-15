/**
 * GPU preset: Aurora Corona – looking straight up: rays converge on the
 * zenith, the curtain wraps around the viewer as a ring, breathing with the
 * bass, spinning slowly with the mids, treble flickers the rays.
 * @module visualizers/gl/presets/glAuroraCorona
 */

import { lightBeams } from '../../effects/lightBeams.js'
import { AURORA_GLSL } from '../aurora.js'

const frag = /* glsl */ `
${AURORA_GLSL}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float st = stars(p, 50.0, t) * 0.7;
  rgb += vec3(0.9, 0.95, 1.0) * st;
  alpha += st;

  // Polar unwrap: the curtain's "x" runs around the circle, its "y" is the
  // distance inward from the ring towards the zenith.
  float r = length(p);
  float ang = atan(p.y, p.x) / TAU + 0.5 + t * 0.01 * (1.0 + mid);
  float ringR = 0.5 + bass * 0.05;
  float y = ringR - r;                                   // upward = inward
  // Two overlapping curtains with different seeds, periodic in angle via cos/sin.
  vec2 cyl = vec2(cos(ang * TAU), sin(ang * TAU));
  float x1 = cyl.x * 2.0 + cyl.y * 1.3;
  float x2 = cyl.y * 2.2 - cyl.x * 1.1 + 9.0;
  float spec = spectrum(abs(ang * 2.0 - 1.0) * 0.85) * uIntensity;
  float height = 0.35 + bass * 0.2 + spec * 0.25;
  float d1 = auroraDensity(x1, y, t, 0.5 + mid * 0.6, height, treb * 0.6);
  float d2 = auroraDensity(x2, y - 0.05, t * 1.2, 0.5 + mid * 0.6, height * 0.8, treb * 0.6);
  float dens = (d1 + d2 * 0.7) * (0.6 + spec * 0.8) * smoothstep(0.0, 0.08, r);
  dens *= 0.9 + 0.1 * sin(t * 25.0 + ang * 200.0) * treb;

  vec3 col = auroraColour(y, uColorHsl.x, fract(uColorHsl.x + 0.3), dens);
  rgb += col * dens * 1.1;
  alpha += dens * 0.95;

  // Zenith glow.
  float zen = exp(-r * r * 30.0) * (0.1 + bass * 0.3) * uIntensity;
  rgb += hsl2rgb(vec3(fract(uColorHsl.x + 0.3), 0.6, 0.6)) * zen;
  alpha += zen;

  fragColor = outPremul(rgb, alpha);
}
`

export const glAuroraCorona = {
  id: 'glAuroraCorona',
  name_de: 'Nordlicht-Korona (GPU)',
  name_en: 'Aurora Corona (GPU)',
  frag,
  fallback: lightBeams,
}
