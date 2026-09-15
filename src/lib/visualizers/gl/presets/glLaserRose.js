/**
 * GPU preset: Laser Rose – a rhodonea (rose curve) drawn by the laser. The
 * petal count morphs with the bass, the mids ripple the petals, onsets turn
 * the rose, treble flickers, a second faint rose blooms inside.
 * @module visualizers/gl/presets/glLaserRose
 */

import { bloomingMandala } from '../../organic/bloomingMandala.js'
import { CURVE_GLSL } from '../laserFigures.js'

const frag = /* glsl */ `
uniform float uSegments;
float gK, gAmp, gRipple, gRot;

vec2 figure(float s) {
  float r = gAmp * (cos(gK * s) + gRipple * sin(s * 9.0 + uTime * 3.0));
  return rot2(gRot) * vec2(cos(s), sin(s)) * r;
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

  gK = 2.0 + bass * 3.0 + sin(t * 0.11) * 0.5;
  gAmp = 0.34 + vol * 0.08 * uIntensity;
  gRipple = mid * 0.06;
  gRot = t * 0.08 + uOnset.w * 0.5;
  float sMax = TAU * 3.0;
  vec2 dc = curveDistance(p, clamp(uSegments, 64.0, 200.0), sMax);
  vec4 tr = laserTrace(dc, sMax, aaPx, t, uColorHsl.x, 0.5, treb, 2.2 + vol, 0.4);
  vec3 rgb = tr.rgb;
  float alpha = tr.a;

  // Inner rose, counter-rotating and smaller.
  gK = gK + 1.0;
  gAmp *= 0.45;
  gRot = -gRot * 1.3;
  vec2 dc2 = curveDistance(p, 120.0, sMax);
  vec4 tr2 = laserTrace(dc2, sMax, aaPx, t, fract(uColorHsl.x + 0.5), 0.3, treb, 1.4, -0.5);
  rgb += tr2.rgb * 0.6;
  alpha += tr2.a * 0.6;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLaserRose = {
  id: 'glLaserRose',
  name_de: 'Laser-Rose (GPU)',
  name_en: 'Laser Rose (GPU)',
  frag,
  uniforms: () => ({ uSegments: 200 }),
  fallback: bloomingMandala,
}
