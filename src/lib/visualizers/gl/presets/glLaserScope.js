/**
 * GPU preset: Laser Oscilloscope – the real waveform wrapped around a circle
 * and drawn by the laser, like a circular oscilloscope. Bass sets the
 * radius, the waveform's own amplitude shapes the ring, treble flickers, the
 * ring rotates slowly and a second ring shows the envelope.
 * @module visualizers/gl/presets/glLaserScope
 */

import { retroOscilloscope } from '../../retro/retroOscilloscope.js'
import { CURVE_GLSL } from '../laserFigures.js'

const frag = /* glsl */ `
float gR, gAmp, gRot, gMode;

vec2 figure(float s) {
  // The buffer is not periodic: draw it over one half of the circle and
  // mirror it over the other, which closes the ring symmetrically.
  float x = s < PI ? s / PI : 2.0 - s / PI;
  float v = gMode < 0.5 ? waveform(x) : (envelope(x) * 2.0 - 1.0);
  float r = gR + v * gAmp;
  return rot2(gRot) * vec2(cos(s), sin(s)) * r;
}

${CURVE_GLSL}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float treb = uBands.z;
  float vol = uBands.w;

  // Waveform ring.
  gMode = 0.0;
  gR = 0.28 + bass * 0.05;
  gAmp = 0.12 * uIntensity * (0.7 + uOnset.w * 0.5);
  gRot = t * 0.1;
  vec2 dc = curveDistance(p, 200.0, TAU);
  vec4 tr = laserTrace(dc, TAU, aaPx, t, uColorHsl.x, 0.35, treb, 2.4 + vol, 0.5);
  vec3 rgb = tr.rgb;
  float alpha = tr.a;

  // Envelope ring, wider and fainter.
  gMode = 1.0;
  gR = 0.4 + bass * 0.04;
  gAmp = 0.05 * uIntensity;
  gRot = -t * 0.05;
  vec2 dc2 = curveDistance(p, 120.0, TAU);
  vec4 tr2 = laserTrace(dc2, TAU, aaPx, t, fract(uColorHsl.x + 0.5), 0.2, treb, 1.4, -0.3);
  rgb += tr2.rgb * 0.5;
  alpha += tr2.a * 0.5;

  // Centre pulse.
  float core = exp(-dot(p, p) * 200.0) * (0.15 + vol * 0.5);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.4, 0.9)) * core;
  alpha += core;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLaserScope = {
  id: 'glLaserScope',
  name_de: 'Laser-Oszilloskop (GPU)',
  name_en: 'Laser Oscilloscope (GPU)',
  needsTimeData: true,
  frag,
  fallback: retroOscilloscope,
}
