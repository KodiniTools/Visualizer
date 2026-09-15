/**
 * GPU preset: Laser Harmonograph – the damped-pendulum drawing machine: two
 * decaying sines per axis trace a slowly tightening figure. Frequencies
 * follow bass and mids, damping the treble, onsets restart the swing.
 * @module visualizers/gl/presets/glLaserHarmonograph
 */

import { retroOscilloscope } from '../../retro/retroOscilloscope.js'
import { CURVE_GLSL } from '../laserFigures.js'

const frag = /* glsl */ `
uniform float uSegments;
float gF1, gF2, gF3, gF4, gP, gDamp, gAmp;

vec2 figure(float s) {
  float e1 = exp(-gDamp * s);
  float e2 = exp(-gDamp * 0.7 * s);
  float x = gAmp * (sin(gF1 * s + gP) * e1 + 0.35 * sin(gF2 * s) * e2);
  float y = gAmp * (sin(gF3 * s) * e1 + 0.35 * sin(gF4 * s + gP * 0.5) * e2);
  return vec2(x, y);
}

${CURVE_GLSL}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float vol = uBands.w;

  // Near-integer ratios give the classic harmonograph look; bands detune them.
  gF1 = 2.0 + bass * 0.4;
  gF2 = 3.0 + mid * 0.5;
  gF3 = 2.0 + mid * 0.3 + 0.02;
  gF4 = 3.0 + bass * 0.4 + 0.03;
  gP = t * 0.3 + uOnset.w * 1.2;
  gDamp = 0.035 + treb * 0.04;
  gAmp = 0.34 + vol * 0.06 * uIntensity;

  float sMax = 16.0;
  vec2 dc = curveDistance(p, clamp(uSegments, 100.0, 200.0), sMax);
  vec4 tr = laserTrace(dc, sMax, aaPx, t, uColorHsl.x, 0.7, treb, 1.8 + vol * 0.8, 0.25);
  fragColor = outPremul(tr.rgb, tr.a);
}
`

export const glLaserHarmonograph = {
  id: 'glLaserHarmonograph',
  name_de: 'Laser-Harmonograph (GPU)',
  name_en: 'Laser Harmonograph (GPU)',
  frag,
  uniforms: () => ({ uSegments: 200 }),
  fallback: retroOscilloscope,
}
