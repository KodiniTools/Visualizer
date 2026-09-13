/**
 * GPU preset: Particle Storm – thousands of procedural particles streaming
 * outward from the centre; speed, size and brightness follow the bass, the
 * onset detector kicks bursts. Successor of particleStorm / cosmicNebula /
 * pixelFireworks.
 *
 * Particles live in polar "cells" so every pixel only inspects a 3x3
 * neighbourhood – no per-particle buffers, no transform feedback.
 * @module visualizers/gl/presets/glParticles
 */

import { particleStorm } from '../../particle/particleStorm.js'

const frag = /* glsl */ `
uniform float uLayers;   // depth layers (max 4)
uniform float uDensity;  // angular cells per layer

vec3 layerParticles(vec2 p, float layer, float density, float bass, float onset, float t) {
  float r = length(p);
  float ang = atan(p.y, p.x) / TAU + 0.5;   // 0..1
  // Log radius so particles keep a constant apparent speed as they fly out.
  float depth = log(max(r, 0.02)) * 0.9;
  float speed = (0.25 + 0.5 * layer / 3.0) * (0.5 + bass * 1.4 + onset * 1.5);
  float flow = depth - t * speed;

  vec2 cellSize = vec2(1.0 / density, 0.16);
  vec2 cellCoord = vec2(ang, flow) / cellSize;
  vec2 cellId = floor(cellCoord);
  vec2 cellF = fract(cellCoord);

  vec3 acc = vec3(0.0);
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 off = vec2(float(dx), float(dy));
      vec2 id = cellId + off;
      // Wrap angle cells.
      id.x = mod(id.x, density);
      float h1 = hash12(id + layer * 37.1);
      float h2 = hash12(id * 1.7 + layer * 11.3 + 5.0);
      float h3 = hash12(id * 2.3 + layer * 3.7 + 9.0);
      vec2 pPos = off + vec2(h1, h2);            // particle position in cell units
      vec2 d = (cellF - pPos) * cellSize;        // back to (angle, depth) units
      d.x *= r * TAU;                            // angle → arc length at this radius
      d.y *= 1.0 / 0.9 * r;                      // depth → radial length
      float dist = length(d);
      float size = (0.004 + 0.012 * h3) * (0.6 + r * 0.8) * (0.7 + bass * 0.9 + onset * 0.6);
      float core = smoothstep(size, size * 0.25, dist);
      float glow = exp(-dist / (size * 2.5)) * 0.35;
      float twinkle = 0.6 + 0.4 * sin(t * (3.0 + h3 * 6.0) + h1 * 20.0);
      float hue = fract(uColorHsl.x + (h3 - 0.5) * 0.25 + layer * 0.03);
      vec3 col = hsl2rgb(vec3(hue, 0.8, 0.62));
      vec3 hot = hsl2rgb(vec3(hue, 0.45, 0.9));
      acc += (mix(col, hot, core) * (core + glow)) * twinkle * smoothstep(0.04, 0.45, r);
    }
  }
  return acc;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float onset = uOnset.x;
  float t = uTime;

  vec3 rgb = vec3(0.0);
  float layers = clamp(uLayers, 1.0, 4.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    if (fi >= layers) break;
    float fade = 1.0 - fi * 0.18;
    rgb += layerParticles(p * (1.0 + fi * 0.35), fi, uDensity, bass, onset, t) * fade;
  }
  rgb *= 0.55 + 0.45 * uIntensity;

  // Bass core glow.
  float r = length(p);
  float core = exp(-r * r * 30.0) * (0.15 + bass * 0.6 + onset * 0.4) * uIntensity;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.6, 0.75)) * core;

  float alpha = max(rgb.r, max(rgb.g, rgb.b));
  fragColor = outPremul(rgb, alpha);
}
`

export const glParticles = {
  id: 'glParticles',
  name_de: 'Partikelsturm (GPU)',
  name_en: 'Particle Storm (GPU)',
  frag,
  uniforms: () => ({ uLayers: 3, uDensity: 48 }),
  fallback: particleStorm,
}
