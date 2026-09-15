/**
 * GPU preset: Laser Figures – a scanned Lissajous figure drawn by a laser,
 * with the phosphor-like glow of the trace. The x/y frequencies follow the
 * bass and mids, the figure rotates on onsets, treble adds a sparkling
 * second trace, the amplitude breathes with the volume.
 * @module visualizers/gl/presets/glLaserFigure
 */

import { retroOscilloscope } from '../../retro/retroOscilloscope.js'

const frag = /* glsl */ `
uniform float uSegments;

vec2 figure(float s, float fx, float fy, float ph, float amp) {
  return vec2(sin(s * fx + ph), sin(s * fy)) * amp;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float vol = uBands.w;

  // Frequencies morph continuously so the figure never jumps.
  float fx = 2.0 + floor(bass * 3.0 + 0.5) + sin(t * 0.13) * 0.4;
  float fy = 3.0 + floor(mid * 3.0 + 0.5) + cos(t * 0.11) * 0.4;
  float ph = t * 0.6 + uOnset.w * 1.5;
  float amp = 0.3 + vol * 0.15 * uIntensity;
  p = rot2(uOnset.w * 0.3 + t * 0.05) * p;

  float segs = clamp(uSegments, 32.0, 128.0);
  float dMin = 10.0;
  float sAtMin = 0.0;
  vec2 prev = figure(0.0, fx, fy, ph, amp);
  for (int i = 1; i <= 128; i++) {
    float fi = float(i);
    if (fi > segs) break;
    float s = fi / segs * TAU;
    vec2 cur = figure(s, fx, fy, ph, amp);
    vec2 ab = cur - prev;
    float h = clamp(dot(p - prev, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    float d = length(p - prev - ab * h);
    if (d < dMin) { dMin = d; sAtMin = s; }
    prev = cur;
  }

  float px = dMin / aaPx;
  float core = 1.0 - smoothstep(0.6, 1.9, px);
  float halo = exp(-px * 0.08) * 0.45;
  // Scan head: the bright spot travelling along the figure.
  float head = fract(sAtMin / TAU - t * 0.5);
  float headGlow = smoothstep(0.85, 1.0, head) * 0.8;
  float flick = 0.9 + 0.1 * sin(t * 50.0) * treb;

  float hue = fract(uColorHsl.x + sAtMin / TAU * 0.5 + t * 0.02);
  vec3 col = hsl2rgb(vec3(hue, 0.95, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.3, 0.95));
  vec3 rgb = (mix(col, hot, core) * (core + halo) + hot * headGlow * core) * flick;
  float alpha = (core + halo + headGlow * core) * flick;

  // Treble: a faint second trace, slightly detuned.
  vec2 p2 = rot2(0.2) * p * 1.05;
  float d2 = 10.0;
  vec2 prev2 = figure(0.0, fx + 1.0, fy, ph * 1.1, amp * 0.8);
  for (int i = 1; i <= 64; i++) {
    float s = float(i) / 64.0 * TAU;
    vec2 cur = figure(s, fx + 1.0, fy, ph * 1.1, amp * 0.8);
    vec2 ab = cur - prev2;
    float h = clamp(dot(p2 - prev2, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    d2 = min(d2, length(p2 - prev2 - ab * h));
    prev2 = cur;
  }
  float ghost = laserGlow(d2 / aaPx) * treb * 0.5;
  rgb += hsl2rgb(vec3(fract(hue + 0.5), 0.9, 0.6)) * ghost;
  alpha += ghost;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLaserFigure = {
  id: 'glLaserFigure',
  name_de: 'Laser-Figuren (GPU)',
  name_en: 'Laser Figures (GPU)',
  frag,
  uniforms: () => ({ uSegments: 96 }),
  fallback: retroOscilloscope,
}
