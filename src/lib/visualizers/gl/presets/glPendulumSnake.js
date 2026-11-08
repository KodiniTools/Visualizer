/**
 * GPU preset: Pendulum Snake – the pendulum wave seen from above. The bobs
 * are joined into one glowing line, so the row reads as a snake that winds
 * through sine waves, double helices and noise before it straightens out
 * again. Fading echoes of earlier frames trail behind the line.
 *
 * Same clock as Pendelwelle (createPendulumClock): every pendulum belongs to
 * one frequency band (loud band = wider swing), bass hits kick the row and a
 * strong hit after a quiet passage puts it back in step.
 *
 * @module visualizers/gl/presets/glPendulumSnake
 */

import { soundWaves } from '../../spectrum/soundWaves'
import { createPendulumClock } from './glPendulumWave.js'

const frag = /* glsl */ `
uniform float uPhaseT;      // seconds since the row was last in step (wrapped to uCycle)
uniform float uKick;        // bass kick envelope 0–1
uniform float uCycle;       // seconds until all pendulums line up again
uniform float uBaseSwings;  // swings of pendulum 0 per cycle
uniform float uPendulums;   // pendulum count (max 48)

const int TRAIL = 6;
const float TRAIL_DT = 0.07;
const float SWING_Y = 0.34;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float swingAmp(float k) {
  float e = spectrum(0.03 + k * 0.85);
  return clamp((0.25 + 0.65 * e) * (0.6 + 0.4 * uIntensity) + uKick * 0.2, 0.0, 1.0);
}

// Bob position across the row (seen from above) at phase time T.
float bobY(float i, float amp, float T) {
  float w = TAU * (uBaseSwings + i) / uCycle;
  return amp * SWING_Y * cos(w * T);
}

void main() {
  vec2 p = centered();
  float aspect = uResolution.x / uResolution.y;
  float px = 1.0 / uResolution.y;
  float n = clamp(floor(uPendulums), 4.0, 48.0);

  float W = min(aspect * 0.86, 1.5);
  float spacing = W / (n - 1.0);
  float x0 = -W * 0.5;
  float bobR = clamp(spacing * 0.22, 0.006, 0.022);

  float nearest = clamp(floor((p.x - x0) / spacing + 0.5), 0.0, n - 1.0);
  float idx[5];
  float amps[5];
  for (int j = 0; j < 5; j++) {
    float i = nearest + float(j - 2);
    idx[j] = i;
    amps[j] = swingAmp(clamp(i, 0.0, n - 1.0) / (n - 1.0));
  }

  float kx = clamp((p.x - x0) / W, 0.0, 1.0);
  float hue = fract(uColorHsl.x + kx * 0.35);
  vec3 col = hsl2rgb(vec3(hue, 0.8, 0.56));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.92));

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Ruhelage
  float axis = (1.0 - smoothstep(px * 0.5, px * 1.5, abs(p.y))) * step(abs(p.x), W * 0.5) * 0.14;
  rgb += hot * axis;
  alpha += axis;

  // Echos früherer Bilder, dann die Linie selbst
  for (int s = TRAIL; s >= 0; s--) {
    float T = uPhaseT - float(s) * TRAIL_DT;
    float dMin = 1e3;
    for (int j = 0; j < 4; j++) {
      float ia = idx[j];
      float ib = idx[j + 1];
      if (ia < 0.0 || ib > n - 1.0) continue;
      vec2 a = vec2(x0 + ia * spacing, bobY(ia, amps[j], T));
      vec2 b = vec2(x0 + ib * spacing, bobY(ib, amps[j + 1], T));
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

  // Kugeln mit Glanzpunkt
  for (int j = 1; j <= 3; j++) {
    float i = idx[j];
    if (i < 0.0 || i > n - 1.0) continue;
    float k = i / (n - 1.0);
    float e = spectrum(0.03 + k * 0.85);
    vec2 bob = vec2(x0 + i * spacing, bobY(i, amps[j], uPhaseT));
    float R = bobR * (0.8 + 0.4 * e);
    float d = length(p - bob);
    float disc = 1.0 - smoothstep(R - px, R + px, d);
    vec2 hl = p - (bob + vec2(-0.35, 0.35) * R);
    float spec = exp(-dot(hl, hl) / (R * R * 0.08));
    float glow = exp(-max(d - R, 0.0) / (R * 1.6)) * (1.0 - disc) * (0.25 + 0.4 * e);
    vec3 bc = hsl2rgb(vec3(fract(uColorHsl.x + k * 0.35), 0.85, 0.55));
    rgb += (bc * (0.7 + 0.3 * e) + hot * spec * 0.8) * disc + bc * glow;
    alpha += disc + glow;
  }

  float k = 0.6 + 0.4 * uIntensity;
  fragColor = outPremul(rgb * k, alpha * k);
}
`

export const glPendulumSnake = {
  id: 'glPendulumSnake',
  edgeFade: 'rect',
  name_de: 'Pendelschlange (GPU)',
  name_en: 'Pendulum Snake (GPU)',
  frag,
  uniforms: createPendulumClock({ pendulums: 32, cycle: 40, baseSwings: 20 }),
  fallback: soundWaves,
}
