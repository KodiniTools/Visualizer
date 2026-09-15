/**
 * GPU preset: Fountains – ground fireworks: several fountains along the
 * bottom spraying sparks upward. Spray height follows each fountain's band,
 * the bass widens the jets, onsets throw a burst of extra sparks, treble
 * crackles. Procedural sparks in a moving grid, no shell tracker needed.
 * @module visualizers/gl/presets/glFireworksFountain
 */

import { audioFire } from '../../particle/audioFire.js'

const frag = /* glsl */ `
uniform float uFountains;

vec4 fountain(vec2 p, vec2 base, float height, float width, float hue, float seed, float aaPx, float t, float crackle) {
  vec2 rel = p - base;
  if (rel.y < -0.02 || abs(rel.x) > width * 1.5 + 0.1 || rel.y > height + 0.15) return vec4(0.0);
  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  // Sparks rise in columns: each column is a stream with its own tilt.
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float tilt = (fk - 1.0) * width * 0.9;
    // Parametric spark: launched at time t0, follows a parabola.
    for (int i = 0; i < 22; i++) {
      float fi = float(i);
      float h1 = fwHash(seed + fi * 3.7 + fk * 11.0);
      float h2 = fwHash(seed + fi * 5.3 + fk * 13.0 + 1.0);
      float period = 0.9 + h1 * 0.5;
      float phase = fract(t / period + h2);
      float age = phase * period;
      float vx = tilt * (0.6 + h2 * 0.8) + (h1 - 0.5) * width * 0.6;
      float vy = height * (1.6 + h1 * 0.6);
      vec2 pos = vec2(vx * age, vy * age - 0.5 * 1.9 * age * age * height);
      if (pos.y < -0.01) continue;
      vec2 prev = vec2(vx * (age - 0.04), vy * (age - 0.04) - 0.5 * 1.9 * (age - 0.04) * (age - 0.04) * height);
      vec2 ab = pos - prev;
      float hh = clamp(dot(rel - prev, ab) / max(dot(ab, ab), 1e-7), 0.0, 1.0);
      float d = length(rel - prev - ab * hh) / aaPx;
      float life = 1.0 - phase;
      float bright = ((1.0 - smoothstep(0.5, 1.6, d)) + exp(-d * 0.3) * 0.35) * life * (0.6 + h2 * 0.6);
      float spark = step(0.9, fwHash(fi * 7.0 + floor(t * 25.0) + seed)) * crackle;
      vec3 col = hsl2rgb(vec3(fract(hue + h1 * 0.06 + phase * 0.05), 0.85, 0.6));
      vec3 hot = vec3(1.0, 0.95, 0.85);
      rgb += mix(col, hot, min(bright, 1.0) * 0.5 + spark) * bright;
      alpha += bright;
    }
  }
  // Glowing core at the nozzle.
  float core = exp(-dot(rel - vec2(0.0, 0.01), rel - vec2(0.0, 0.01)) * 2500.0) * 1.2;
  rgb += vec3(1.0, 0.95, 0.85) * core;
  alpha += core;
  return vec4(rgb, alpha);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float treb = uBands.z;
  float n = clamp(uFountains, 1.0, 6.0);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = (fi + 0.5) / n;
    vec2 base = vec2((k - 0.5) * aspect * 0.85, -0.47);
    float sx = abs(k * 2.0 - 1.0) * 0.85;
    float band = spectrum(sx) * uIntensity;
    float height = 0.25 + band * 0.55 + uOnset.w * 0.15;
    float width = 0.06 + bass * 0.05;
    float hue = fract(uColorHsl.x + k * 0.4);
    vec4 f = fountain(p, base, height, width, hue, fi * 17.0, aaPx, t, treb);
    rgb += f.rgb;
    alpha += f.a;
  }

  // Ground glow.
  float ground = exp(-(p.y + 0.47) * 12.0) * (0.15 + bass * 0.25) * uIntensity * step(-0.5, p.y);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.7, 0.5)) * ground;
  alpha += ground;
  fragColor = outPremul(rgb, alpha);
}
`

export const glFireworksFountain = {
  id: 'glFireworksFountain',
  name_de: 'Feuerwerk Fontänen (GPU)',
  name_en: 'Fountain Fireworks (GPU)',
  frag: frag.replace(
    'uniform float uFountains;',
    'uniform float uFountains;\nfloat fwHash(float n) { return fract(sin(n * 12.9898 + 78.233) * 43758.5453); }',
  ),
  uniforms: () => ({ uFountains: 4 }),
  fallback: audioFire,
}
