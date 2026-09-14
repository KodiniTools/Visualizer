/**
 * GPU preset: Warp Stars – hyperspace star streaks racing outward from the
 * centre. Streak length and speed follow the bass, onsets punch the jump,
 * treble adds sparkle. Procedural in polar cells like the particle storm,
 * but with elongated streaks instead of dots.
 * @module visualizers/gl/presets/glWarp
 */

import { cosmicNebula } from '../../particle/cosmicNebula.js'

const frag = /* glsl */ `
uniform float uDensity;

vec3 warpLayer(vec2 p, float layer, float density, float speed, float len, float t) {
  float r = length(p);
  float ang = atan(p.y, p.x) / TAU + 0.5;
  float lr = log(max(r, 0.02));
  float flow = lr - t * speed;

  vec2 cellSize = vec2(1.0 / density, 0.2);
  vec2 cc = vec2(ang, flow) / cellSize;
  vec2 cellId = floor(cc);
  vec2 cf = fract(cc);

  vec3 acc = vec3(0.0);
  // Streaks trail behind (towards the centre = smaller flow), so look at the
  // cells ahead of this pixel along the radial axis.
  for (int dy = -1; dy <= 3; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 off = vec2(float(dx), float(dy));
      vec2 id = cellId + off;
      id.x = mod(id.x, density);
      float h1 = hash12(id + layer * 19.3);
      float h2 = hash12(id * 1.9 + layer * 7.1 + 3.0);
      float h3 = hash12(id * 2.7 + layer * 2.3 + 11.0);
      if (h3 < 0.62) continue;                     // sparse
      vec2 head = off + vec2(h1, h2);              // streak head in cell units
      vec2 d = cf - head;                          // pixel relative to head
      // Convert to screen-ish units: angle → arc length, flow → radial.
      float dxs = d.x * cellSize.x * r * TAU;
      float dys = d.y * cellSize.y * r;
      float streakLen = len * (0.5 + h3) * r;
      // Distance to the segment from the head backwards (dys in [-streakLen, 0]).
      float along = clamp(dys, -streakLen, 0.0);
      float dist = length(vec2(dxs, dys - along));
      float w = 0.0018 + 0.0016 * h3;
      float core = exp(-dist * dist / (w * w));
      float fadeTail = 1.0 + along / max(streakLen, 0.001);   // 1 at head → 0 at tail
      float glow = exp(-dist / (w * 3.0)) * 0.18;
      float hue = fract(uColorHsl.x + (h2 - 0.5) * 0.15);
      vec3 col = hsl2rgb(vec3(hue, 0.7, 0.65));
      vec3 hot = hsl2rgb(vec3(hue, 0.3, 0.95));
      acc += (hot * core * 0.85 + col * glow) * fadeTail * smoothstep(0.04, 0.35, r);
    }
  }
  return acc;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  float speed = 0.35 + bass * 1.4 + uOnset.x * 1.6;
  float len = 0.25 + bass * 0.9 + uOnset.x * 0.8;

  vec3 rgb = vec3(0.0);
  rgb += warpLayer(p, 0.0, uDensity, speed, len, t);
  rgb += warpLayer(p * 1.6, 1.0, uDensity * 0.8, speed * 0.8, len * 0.8, t) * 0.45;
  rgb += warpLayer(p * 0.7, 2.0, uDensity * 1.2, speed * 1.2, len * 1.2, t) * 0.6;
  rgb *= 0.6 + 0.4 * uIntensity;

  // Bright centre where the streaks converge.
  float r = length(p);
  float core = exp(-r * r * 60.0) * (0.25 + bass * 0.7 + uOnset.x * 0.5);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.4, 0.9)) * core;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.7, 0.5)) * exp(-r * 5.0) * 0.15 * (0.4 + treb);

  float alpha = max(rgb.r, max(rgb.g, rgb.b));
  fragColor = outPremul(rgb, alpha);
}
`

export const glWarp = {
  id: 'glWarp',
  name_de: 'Warp-Sterne (GPU)',
  name_en: 'Warp Stars (GPU)',
  frag,
  uniforms: () => ({ uDensity: 32 }),
  fallback: cosmicNebula,
}
