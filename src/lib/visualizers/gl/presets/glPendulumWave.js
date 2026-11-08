/**
 * GPU preset: Pendulum Wave – a row of glowing pendulums. Each pendulum has a
 * slightly shorter period than its left neighbour, so the row drifts through
 * travelling waves, double helices and moments where all bobs line up again.
 * Every pendulum belongs to one frequency band: a loud band swings wider and
 * glows brighter. Bass hits kick the whole row, and a strong hit after a
 * quiet passage puts all pendulums back in step.
 *
 * The pendulums swing towards / away from the viewer (camera slightly above),
 * so a bob closer to the viewer is drawn lower, larger and brighter. Because
 * the x position of every pendulum is fixed, each pixel only has to look at
 * its nearest pendulums.
 *
 * @module visualizers/gl/presets/glPendulumWave
 */

import { vibratingStrings } from '../../spectrum/vibratingStrings'

/** Seconds after which all pendulums are in step again. */
export const PENDULUM_CYCLE = 48
/** Swings of the first (slowest) pendulum per cycle; pendulum i swings BASE + i times. */
export const PENDULUM_BASE_SWINGS = 24

/**
 * Per-preset state for the pendulum clock: phase time (wrapped to one cycle,
 * so float precision never degrades), the kick envelope and the quiet timer
 * used for re-synchronisation.
 *
 * The other pendulum presets (Pendelschlange, Pendelkreis, Pendelfeld) reuse
 * this clock with their own pendulum count, cycle and base swings.
 *
 * @param {{quietLevel?: number, quietTime?: number, resyncOnset?: number, kickDecay?: number, pendulums?: number, cycle?: number, baseSwings?: number}} [opts]
 * @returns {(ctx: {onset?: object, dt?: number, bands?: ArrayLike<number>}) => {uPhaseT: number, uKick: number, uCycle: number, uBaseSwings: number, uPendulums: number}}
 */
export function createPendulumClock(opts = {}) {
  const quietLevel = opts.quietLevel ?? 0.08
  const quietTime = opts.quietTime ?? 1.5
  const resyncOnset = opts.resyncOnset ?? 0.5
  const kickDecay = opts.kickDecay ?? 4
  const pendulums = opts.pendulums ?? 28
  const cycle = opts.cycle > 0 ? opts.cycle : PENDULUM_CYCLE
  const baseSwings = opts.baseSwings ?? PENDULUM_BASE_SWINGS

  let phase = 0
  let kick = 0
  let quiet = 0

  return ({ onset, dt, bands } = {}) => {
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 1 / 60
    const vol = Number(bands?.[3]) || 0
    const all = Number(onset?.all) || 0
    const bass = Number(onset?.bass) || 0

    // Ein kräftiger Schlag nach einer ruhigen Stelle bringt alle in Gleichtakt.
    if (quiet >= quietTime && all >= resyncOnset) {
      phase = 0
      quiet = 0
    } else {
      phase = (phase + step) % cycle
      quiet = vol < quietLevel ? quiet + step : 0
    }

    kick = Math.max(kick * Math.exp(-step * kickDecay), Math.min(1, bass))

    return {
      uPhaseT: phase,
      uKick: kick,
      uCycle: cycle,
      uBaseSwings: baseSwings,
      uPendulums: pendulums,
    }
  }
}

const frag = /* glsl */ `
uniform float uPhaseT;      // seconds since the row was last in step (wrapped to uCycle)
uniform float uKick;        // bass kick envelope 0–1
uniform float uCycle;       // seconds until all pendulums line up again
uniform float uBaseSwings;  // swings of pendulum 0 per cycle
uniform float uPendulums;   // pendulum count (max 40)

const float PIVOT_Y = 0.40;
const float LEN = 0.42;
const int TRAIL = 5;
const float TRAIL_DT = 0.035;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Swing angle of pendulum i at phase time T (amplitude in radians).
float swing(float i, float amp, float T) {
  float w = TAU * (uBaseSwings + i) / uCycle;
  return amp * cos(w * T);
}

// Screen position (y) and depth scale of a bob for swing angle th.
vec2 bobPose(float th) {
  float z = LEN * sin(th);                         // towards the viewer
  float y = PIVOT_Y - LEN + LEN * (1.0 - cos(th)) * 0.8 - z * 0.55;
  return vec2(y, 1.0 + z * 0.9);
}

void main() {
  vec2 p = centered();
  float aspect = uResolution.x / uResolution.y;
  float px = 1.0 / uResolution.y;
  float n = clamp(floor(uPendulums), 4.0, 40.0);

  float W = min(aspect * 0.86, 1.5);
  float spacing = W / (n - 1.0);
  float x0 = -W * 0.5;
  float bobR = clamp(spacing * 0.3, 0.007, 0.03);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Aufhängung
  float barD = abs(p.y - PIVOT_Y);
  float barX = step(abs(p.x), W * 0.5 + spacing * 0.6);
  float bar = (1.0 - smoothstep(px * 1.0, px * 2.5, barD)) * barX;
  vec3 barCol = hsl2rgb(vec3(uColorHsl.x, 0.35, 0.75));
  rgb += barCol * bar * 0.7;
  alpha += bar * 0.7;

  float nearest = floor((p.x - x0) / spacing + 0.5);
  for (int j = -1; j <= 1; j++) {
    float i = nearest + float(j);
    if (i < 0.0 || i > n - 1.0) continue;
    float k = i / (n - 1.0);
    float x = x0 + i * spacing;

    float e = spectrum(0.03 + k * 0.85);
    float amp = clamp((0.18 + 0.72 * e) * (0.6 + 0.4 * uIntensity) + uKick * 0.25, 0.0, 1.0) * 0.9;

    float hue = fract(uColorHsl.x + k * 0.3);
    vec3 col = hsl2rgb(vec3(hue, 0.8, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.92));
    float glowK = 0.45 + 0.55 * e;

    vec2 pose = bobPose(swing(i, amp, uPhaseT));
    vec2 bob = vec2(x, pose.x);
    float R = bobR * pose.y;

    // Faden
    float dThread = segDist(p, vec2(x, PIVOT_Y), bob);
    float thread = (1.0 - smoothstep(px * 0.5, px * 1.6, dThread)) * (0.22 + 0.25 * uBands.w);
    rgb += hot * thread * 0.6;
    alpha += thread * 0.6;

    // Nachleuchtspur: frühere Positionen, analytisch aus der Phasenzeit
    for (int s = 1; s <= TRAIL; s++) {
      float fs = float(s);
      vec2 pp = bobPose(swing(i, amp, uPhaseT - fs * TRAIL_DT));
      float d = length(p - vec2(x, pp.x));
      float rr = bobR * pp.y * (1.0 - fs * 0.12);
      float tr = (1.0 - smoothstep(rr - px, rr + px, d)) * (0.32 - fs * 0.05) * glowK;
      rgb += col * tr;
      alpha += tr;
    }

    // Kugel mit Glanzpunkt und Glow
    float d = length(p - bob);
    float disc = 1.0 - smoothstep(R - px, R + px, d);
    vec2 hl = p - (bob + vec2(-0.35, 0.35) * R);
    float spec = exp(-dot(hl, hl) / (R * R * 0.08));
    float shade = 0.55 + 0.45 * (pose.y - 0.6);
    float glow = exp(-max(d - R, 0.0) / (R * 1.4)) * (1.0 - disc) * 0.35 * glowK;

    rgb += (col * shade * glowK + hot * spec * 0.8) * disc + col * glow;
    alpha += disc + glow;
  }

  float k = 0.6 + 0.4 * uIntensity;
  fragColor = outPremul(rgb * k, alpha * k);
}
`

export const glPendulumWave = {
  id: 'glPendulumWave',
  edgeFade: 'rect',
  name_de: 'Pendelwelle (GPU)',
  name_en: 'Pendulum Wave (GPU)',
  frag,
  uniforms: createPendulumClock(),
  fallback: vibratingStrings,
}
