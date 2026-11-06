/**
 * GPU preset: Pendulum Circle – the pendulum wave bent into a ring and seen
 * from above. Every pendulum swings along its own spoke, each a little
 * faster than its neighbour, so the closed outline morphs through stars,
 * flowers and spirals and returns to a perfect circle once per cycle.
 *
 * Same clock as Pendelwelle (createPendulumClock). Bass sits at the top,
 * treble at the bottom (mirrored left/right), a loud band swings wider.
 *
 * @module visualizers/gl/presets/glPendulumCircle
 */

import { radialBars } from '../../spectrum/radialBars.js'
import { createPendulumClock } from './glPendulumWave.js'

const frag = /* glsl */ `
uniform float uPhaseT;      // seconds since the ring was last in step (wrapped to uCycle)
uniform float uKick;        // bass kick envelope 0–1
uniform float uCycle;       // seconds until all pendulums line up again
uniform float uBaseSwings;  // swings of pendulum 0 per cycle
uniform float uPendulums;   // pendulum count (max 48)

const float R0 = 0.28;      // rest radius (design units, short half side = 0.5)
const float SWING_R = 0.14;
const float HUB = 0.05;
const int TRAIL = 5;
const float TRAIL_DT = 0.06;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// 0 at the top (bass) … 1 at the bottom (treble), mirrored left/right.
float bandOf(float i, float n) { return 1.0 - abs(2.0 * i / n - 1.0); }

float swingAmp(float k) {
  float e = spectrum(0.03 + (1.0 - k) * 0.85);
  return clamp((0.25 + 0.65 * e) * (0.6 + 0.4 * uIntensity) + uKick * 0.2, 0.0, 1.0);
}

vec2 spoke(float i, float n) {
  float a = PI * 0.5 - TAU * i / n;
  return vec2(cos(a), sin(a));
}

vec2 bobPos(float i, float n, float amp, float T) {
  float w = TAU * (uBaseSwings + i) / uCycle;
  return spoke(i, n) * (R0 + amp * SWING_R * cos(w * T));
}

void main() {
  vec2 p = centeredFit(0.5);
  float px = 0.5 / (halfShortSide() * uResolution.y);
  float n = clamp(floor(uPendulums), 6.0, 48.0);

  // Nächster Pendel-Index über den Winkel (oben = 0, im Uhrzeigersinn)
  float ang = atan(p.x, p.y);
  float nearest = mod(floor(fract(ang / TAU) * n + 0.5), n);
  float idx[5];
  float amps[5];
  for (int j = 0; j < 5; j++) {
    float i = mod(nearest + float(j - 2), n);
    idx[j] = i;
    amps[j] = swingAmp(bandOf(i, n));
  }

  float kp = 1.0 - abs(2.0 * fract(ang / TAU) - 1.0);
  float hue = fract(uColorHsl.x + kp * 0.3);
  vec3 col = hsl2rgb(vec3(hue, 0.8, 0.56));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.92));

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float r = length(p);

  // Ruhekreis und Nabe
  float rest = (1.0 - smoothstep(px * 0.5, px * 1.5, abs(r - R0))) * 0.12;
  float hub = (1.0 - smoothstep(px * 0.8, px * 2.0, abs(r - HUB))) * (0.35 + 0.4 * uKick);
  rgb += hot * (rest + hub);
  alpha += rest + hub;

  // Speichen von der Nabe zu den Kugeln
  for (int j = 1; j <= 3; j++) {
    float i = idx[j];
    vec2 dir = spoke(i, n);
    vec2 bob = bobPos(i, n, amps[j], uPhaseT);
    float d = segDist(p, dir * HUB, bob);
    float th = (1.0 - smoothstep(px * 0.4, px * 1.4, d)) * (0.16 + 0.2 * uBands.w);
    rgb += hot * th;
    alpha += th;
  }

  // Echos und Umriss
  for (int s = TRAIL; s >= 0; s--) {
    float T = uPhaseT - float(s) * TRAIL_DT;
    float dMin = 1e3;
    for (int j = 0; j < 4; j++) {
      vec2 a = bobPos(idx[j], n, amps[j], T);
      vec2 b = bobPos(idx[j + 1], n, amps[j + 1], T);
      dMin = min(dMin, segDist(p, a, b));
    }
    float fade = 1.0 - float(s) / float(TRAIL + 1);
    float wpx = s == 0 ? 1.8 : 1.1;
    float line = 1.0 - smoothstep(px * wpx * 0.5, px * wpx * 1.6, dMin);
    float glow = exp(-dMin / (px * (6.0 + 6.0 * uBands.w))) * 0.3;
    float k = s == 0 ? 1.0 : fade * fade * 0.4;
    // Linie in der Bandfarbe (auch auf hellem Hintergrund sichtbar), Kern aufgehellt
    rgb += (mix(col, hot, 0.3) * line + col * glow) * k;
    alpha += (line + glow) * k;
  }

  // Kugeln
  float bobR = clamp(TAU * R0 / n * 0.18, 0.006, 0.022);
  for (int j = 1; j <= 3; j++) {
    float i = idx[j];
    float k = bandOf(i, n);
    float e = spectrum(0.03 + (1.0 - k) * 0.85);
    vec2 bob = bobPos(i, n, amps[j], uPhaseT);
    float R = bobR * (0.8 + 0.4 * e);
    float d = length(p - bob);
    float disc = 1.0 - smoothstep(R - px, R + px, d);
    vec2 hl = p - (bob + vec2(-0.35, 0.35) * R);
    float spec = exp(-dot(hl, hl) / (R * R * 0.08));
    float glow = exp(-max(d - R, 0.0) / (R * 1.6)) * (1.0 - disc) * (0.25 + 0.4 * e);
    vec3 bc = hsl2rgb(vec3(fract(uColorHsl.x + k * 0.3), 0.85, 0.55));
    rgb += (bc * (0.7 + 0.3 * e) + hot * spec * 0.8) * disc + bc * glow;
    alpha += disc + glow;
  }

  float k = 0.6 + 0.4 * uIntensity;
  fragColor = outPremul(rgb * k, alpha * k);
}
`

export const glPendulumCircle = {
  id: 'glPendulumCircle',
  edgeFade: 'radial',
  name_de: 'Pendelkreis (GPU)',
  name_en: 'Pendulum Circle (GPU)',
  frag,
  uniforms: createPendulumClock({ pendulums: 30, cycle: 45, baseSwings: 15 }),
  fallback: radialBars,
}
