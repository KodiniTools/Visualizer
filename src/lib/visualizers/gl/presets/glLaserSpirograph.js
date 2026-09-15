/**
 * GPU preset: Laser Spirograph – a hypotrochoid drawn by the laser. The
 * inner-wheel ratio morphs with the mids, the pen offset with the bass, the
 * figure spins on onsets, treble flickers the trace.
 * @module visualizers/gl/presets/glLaserSpirograph
 */

import { geometricKaleidoscope } from '../../geometric/geometricKaleidoscope.js'
import { CURVE_GLSL } from '../laserFigures.js'

const frag = /* glsl */ `
uniform float uSegments;
float gR, gr, gd, gRot;

vec2 figure(float s) {
  float k = (gR - gr) / gr;
  vec2 q = vec2((gR - gr) * cos(s) + gd * cos(k * s), (gR - gr) * sin(s) - gd * sin(k * s));
  return rot2(gRot) * q;
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

  gR = 0.36 + vol * 0.06 * uIntensity;
  gr = gR * (0.28 + mid * 0.22 + sin(t * 0.07) * 0.04);
  gd = gr * (0.5 + bass * 0.8);
  gRot = t * 0.1 + uOnset.w * 0.6;

  float sMax = TAU * 6.0;
  vec2 dc = curveDistance(p, clamp(uSegments, 64.0, 200.0), sMax);
  vec4 tr = laserTrace(dc, sMax, aaPx, t, uColorHsl.x, 0.6, treb, 2.4 + vol, 0.35);
  fragColor = outPremul(tr.rgb, tr.a);
}
`

export const glLaserSpirograph = {
  id: 'glLaserSpirograph',
  name_de: 'Laser-Spirograph (GPU)',
  name_en: 'Laser Spirograph (GPU)',
  frag,
  uniforms: () => ({ uSegments: 200 }),
  fallback: geometricKaleidoscope,
}
