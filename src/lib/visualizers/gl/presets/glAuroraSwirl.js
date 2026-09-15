/**
 * GPU preset: Aurora Swirl – a substorm: the curtain twists into a spiral
 * that turns slowly across the sky, pulsating patches flare on onsets, the
 * bass tightens the spiral, treble sparkles inside.
 * @module visualizers/gl/presets/glAuroraSwirl
 */

import { spiralGalaxy } from '../../organic/spiralGalaxy.js'
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
  float st = stars(p, 45.0, t) * 0.7;
  rgb += vec3(0.9, 0.95, 1.0) * st;
  alpha += st;

  // Spiral coordinates: the curtain runs along a log spiral.
  float r = length(p);
  float ang = atan(p.y, p.x);
  float twist = 2.2 + bass * 1.2;
  float spiralPhase = ang + log(max(r, 0.02)) * twist - t * 0.25 * (1.0 + mid * 0.5);
  float arm = fract(spiralPhase / TAU);
  // Distance across the arm → curtain "y"; along the arm → curtain "x".
  float across = (arm - 0.5) * 0.45;
  // Periodic along the arm (no seam at the atan wrap): unit-circle coords of the phase.
  float along = cos(spiralPhase) * 1.6 + sin(spiralPhase) * 0.9 + r * 2.5;
  float height = 0.3 + mid * 0.2 + uOnset.w * 0.12;
  float dens = auroraDensity(along, across + 0.1, t, 0.3, height, treb * 0.6);
  dens *= smoothstep(0.06, 0.25, r) * smoothstep(1.1, 0.5, r);
  // Pulsating patches flaring on onsets.
  float bright = fbm(vec2(p.x * 2.0 + t * 0.2, p.y * 2.0 - t * 0.15));
  dens *= 0.6 + bright * 0.8 + uOnset.w * smoothstep(0.5, 0.9, bright) * 1.5;
  float spec = spectrum(clamp(r * 1.4, 0.0, 1.0) * 0.9) * uIntensity;
  dens *= 0.6 + spec * 0.9;

  vec3 col = auroraColour(across + 0.1, uColorHsl.x, fract(uColorHsl.x + 0.3), dens);
  rgb += col * dens * 1.8;
  alpha += dens * 1.3;

  // Sparkles inside the bright parts on treble.
  float spark = stars(p * 2.3 + 7.0, 60.0, t * 4.0) * treb * dens * 2.0;
  rgb += vec3(1.0) * spark;
  alpha += spark;

  fragColor = outPremul(rgb, alpha);
}
`

export const glAuroraSwirl = {
  id: 'glAuroraSwirl',
  name_de: 'Nordlicht-Wirbel (GPU)',
  name_en: 'Aurora Swirl (GPU)',
  frag,
  fallback: spiralGalaxy,
}
