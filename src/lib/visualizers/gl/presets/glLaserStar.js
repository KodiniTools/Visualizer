/**
 * GPU preset: Laser Star – star polygons drawn by the laser: the outer star
 * grows points with the mids, spikes on onsets, a nested inner star
 * counter-rotates; bass pumps the size, treble flickers the trace.
 * @module visualizers/gl/presets/glLaserStar
 */

import { neonGrid } from '../../geometric/neonGrid.js'
import { CURVE_GLSL } from '../laserFigures.js'

const frag = /* glsl */ `
float gN, gM, gR, gSpike, gRot;

vec2 vertex(float i) {
  float a = i * gM / gN * TAU + gRot;
  float r = gR * (1.0 + gSpike * step(0.5, fract(i * 0.5)));
  return vec2(cos(a), sin(a)) * r;
}

// s runs over the star's vertices: integer part = vertex index.
vec2 figure(float s) {
  float i = floor(s);
  return mix(vertex(i), vertex(i + 1.0), fract(s));
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

  // Outer star {n/2}, n from the mids (odd numbers keep it a single stroke).
  gN = 5.0 + 2.0 * floor(mid * 2.5);
  gM = 2.0;
  gR = 0.33 + bass * 0.06 * uIntensity;
  gSpike = uOnset.w * 0.25;
  gRot = t * 0.15;
  // One segment per star edge: segs == sMax so the samples land on the vertices.
  vec2 dc = curveDistance(p, gN, gN);
  vec4 tr = laserTrace(dc, gN, aaPx, t, uColorHsl.x, 0.4, treb, 2.4, 0.6);
  vec3 rgb = tr.rgb;
  float alpha = tr.a;

  // Inner star, counter-rotating, complementary hue.
  gN = 7.0;
  gM = 3.0;
  gR = 0.16 + mid * 0.05;
  gSpike = uOnset.x * 0.3;
  gRot = -t * 0.3;
  vec2 dc2 = curveDistance(p, 7.0, 7.0);
  vec4 tr2 = laserTrace(dc2, 7.0, aaPx, t, fract(uColorHsl.x + 0.5), 0.3, treb, 1.8, -0.8);
  rgb += tr2.rgb * 0.8;
  alpha += tr2.a * 0.8;

  // Centre dot.
  float dot = exp(-dot(p, p) * 3000.0) * (0.4 + bass);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.3, 0.95)) * dot;
  alpha += dot;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLaserStar = {
  id: 'glLaserStar',
  name_de: 'Laser-Stern (GPU)',
  name_en: 'Laser Star (GPU)',
  frag,
  fallback: neonGrid,
}
