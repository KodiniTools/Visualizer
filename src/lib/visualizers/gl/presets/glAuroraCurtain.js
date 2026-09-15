/**
 * GPU preset: Northern Lights Curtain – the classic aurora curtain: a bright
 * lower edge with vertical rays fading upward, folds that wander with the
 * mids, height that grows with the bass, treble shimmer in the rays, over a
 * starry sky and a dark ridge.
 * @module visualizers/gl/presets/glAuroraCurtain
 */

import { fluidWaves } from '../../organic/fluidWaves.js'
import { AURORA_GLSL } from '../aurora.js'

const frag = /* glsl */ `
${AURORA_GLSL}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Sky: stars.
  float st = stars(p, 40.0, t) * 0.8;
  rgb += vec3(0.9, 0.95, 1.0) * st;
  alpha += st;

  // Curtain.
  float baseY = -0.15;
  float height = 0.45 + bass * 0.35 + uOnset.x * 0.15;
  float dens = auroraDensity(p.x, p.y - baseY, t, 0.6 + mid * 0.8, height, treb * 0.6);
  // Spectrum along x adds local brightness like a real curtain flickering.
  float spec = (spectrum(abs(p.x / aspect) * 1.6 - 0.02) + spectrum(abs(p.x / aspect) * 1.6) + spectrum(abs(p.x / aspect) * 1.6 + 0.02)) / 3.0;
  dens *= 0.7 + spec * 0.8 * uIntensity;
  float shimmer = 0.9 + 0.1 * sin(t * 25.0 + p.x * 80.0) * treb;
  dens *= shimmer;

  vec3 col = auroraColour(p.y - baseY, uColorHsl.x, fract(uColorHsl.x + 0.28), dens);
  rgb += col * dens * 1.1;
  alpha += dens * 0.95;

  // Ridge silhouette (dark, opaque) at the bottom.
  float ridge = mountains(p.x, -0.4, 0.14);
  float ground = 1.0 - smoothstep(ridge, ridge + 0.004, p.y);
  rgb = mix(rgb, vec3(0.02, 0.025, 0.04), ground);
  alpha = mix(alpha, 1.0, ground);

  fragColor = outPremul(rgb, alpha);
}
`

export const glAuroraCurtain = {
  id: 'glAuroraCurtain',
  name_de: 'Nordlicht-Vorhang (GPU)',
  name_en: 'Northern Lights Curtain (GPU)',
  frag,
  fallback: fluidWaves,
}
