/**
 * GPU preset: Pendulum Field – a grid of conical pendulums seen from above.
 * The swing frequencies grow along the two diagonals, so every bob traces its
 * own Lissajous figure and the field ripples with diagonal wave fronts,
 * checkerboards and vortices. A thin mesh
 * joins neighbouring bobs like a cloth. Once per cycle every bob is back in
 * step and the mesh is a straight grid again.
 *
 * Same clock as Pendelwelle (createPendulumClock). Each column belongs to one
 * frequency band (bass left, treble right): a loud band swings wider.
 *
 * @module visualizers/gl/presets/glPendulumField
 */

import { bars } from '../../spectrum/bars'
import { createPendulumClock } from './glPendulumWave.js'

const frag = /* glsl */ `
uniform float uPhaseT;      // seconds since the field was last in step (wrapped to uCycle)
uniform float uKick;        // bass kick envelope 0–1
uniform float uCycle;       // seconds until all pendulums line up again
uniform float uBaseSwings;  // swings of the first column / row per cycle
uniform float uPendulums;   // columns (max 32); rows follow the aspect ratio

const int TRAIL = 3;
const float TRAIL_DT = 0.05;
const float SWING = 0.5;    // swing radius in cells (neighbours may cross)

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float colAmp(float c, float cols) {
  float e = spectrum(0.03 + c / max(cols - 1.0, 1.0) * 0.85);
  return clamp((0.55 + 0.45 * e) * (0.7 + 0.3 * uIntensity) + uKick * 0.2, 0.0, 1.0);
}

// Bob of cell (c, r) at phase time T. The x frequency grows along one
// diagonal (c + r), the y frequency along the other (c - r), so neighbours
// drift apart in both directions and the mesh bends instead of only
// shifting rows/columns. Whole swing counts → at T = 0 (and every uCycle)
// all bobs sit at the same offset again.
vec2 bobPos(vec2 cell, vec2 origin, float size, float amp, float T) {
  float wx = TAU * (uBaseSwings + cell.x + cell.y) / uCycle;
  float wy = TAU * (uBaseSwings + cell.x - cell.y + 16.0) / uCycle;
  vec2 off = vec2(cos(wx * T), sin(wy * T)) * amp * SWING * size;
  return origin + (cell + 0.5) * size + off;
}

void main() {
  vec2 p = centered();
  float aspect = uResolution.x / uResolution.y;
  float px = 1.0 / uResolution.y;

  float cols = clamp(floor(uPendulums), 4.0, 32.0);
  float W = min(aspect * 0.88, 1.6);
  float size = W / cols;
  float rows = clamp(floor(0.86 / size), 3.0, 32.0);
  vec2 origin = vec2(-W * 0.5, -rows * size * 0.5);
  vec2 grid = vec2(cols, rows);

  vec2 here = floor((p - origin) / size);
  float bobR = size * 0.12;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 cell = here + vec2(float(dx), float(dy));
      if (any(lessThan(cell, vec2(0.0))) || any(greaterThan(cell, grid - 1.0))) continue;

      float amp = colAmp(cell.x, cols);
      float e = spectrum(0.03 + cell.x / (cols - 1.0) * 0.85);
      float hue = fract(uColorHsl.x + cell.x / cols * 0.25 + cell.y / rows * 0.12);
      vec3 col = hsl2rgb(vec3(hue, 0.8, 0.56));
      vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.92));
      vec2 bob = bobPos(cell, origin, size, amp, uPhaseT);

      // Netz zu rechtem und unterem Nachbarn
      float dMesh = 1e3;
      if (cell.x < cols - 1.0) {
        vec2 nb = cell + vec2(1.0, 0.0);
        dMesh = min(dMesh, segDist(p, bob, bobPos(nb, origin, size, colAmp(nb.x, cols), uPhaseT)));
      }
      if (cell.y < rows - 1.0) {
        vec2 nb = cell + vec2(0.0, 1.0);
        dMesh = min(dMesh, segDist(p, bob, bobPos(nb, origin, size, amp, uPhaseT)));
      }
      float mesh = (1.0 - smoothstep(px * 0.5, px * 1.6, dMesh)) * (0.3 + 0.3 * uBands.w);
      rgb += mix(col, hot, 0.3) * mesh;
      alpha += mesh;

      // Nachleuchtspur
      for (int s = 1; s <= TRAIL; s++) {
        float fs = float(s);
        vec2 pp = bobPos(cell, origin, size, amp, uPhaseT - fs * TRAIL_DT);
        float rr = bobR * (1.0 - fs * 0.18);
        float d = length(p - pp);
        float tr = (1.0 - smoothstep(rr - px, rr + px, d)) * (0.3 - fs * 0.07) * (0.5 + 0.5 * e);
        rgb += col * tr;
        alpha += tr;
      }

      // Kugel
      float R = bobR * (0.8 + 0.4 * e);
      float d = length(p - bob);
      float disc = 1.0 - smoothstep(R - px, R + px, d);
      vec2 hl = p - (bob + vec2(-0.35, 0.35) * R);
      float spec = exp(-dot(hl, hl) / (R * R * 0.08));
      float glow = exp(-max(d - R, 0.0) / (R * 1.5)) * (1.0 - disc) * (0.2 + 0.45 * e);
      rgb += (col * (0.7 + 0.3 * e) + hot * spec * 0.8) * disc + col * glow;
      alpha += disc + glow;
    }
  }

  float k = 0.6 + 0.4 * uIntensity;
  fragColor = outPremul(rgb * k, alpha * k);
}
`

export const glPendulumField = {
  id: 'glPendulumField',
  edgeFade: 'rect',
  name_de: 'Pendelfeld (GPU)',
  name_en: 'Pendulum Field (GPU)',
  frag,
  uniforms: createPendulumClock({ pendulums: 16, cycle: 40, baseSwings: 20 }),
  fallback: bars,
}
