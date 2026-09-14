/**
 * GPU preset: Neon Maze – a Truchet tiling of quarter-circle arcs forming
 * endless flowing curves, with light pulses travelling along them. Tiles flip
 * on onsets, each tile glows with its frequency band, bass widens the lines.
 * @module visualizers/gl/presets/glTruchet
 */

import { neonGrid } from '../../geometric/neonGrid.js'

const frag = /* glsl */ `
uniform float uTiles;

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  vec2 p = vec2(uv.x * aspect, uv.y) * uTiles + vec2(t * 0.15, t * 0.08);
  vec2 id = floor(p);
  vec2 f = fract(p);

  // Tile orientation: hashed, flipped by a slowly ticking clock that runs faster on onsets.
  float clock = floor(t * 0.25 + uOnset.w * 0.5);
  float flip = step(0.5, hash12(id + clock * 3.7));
  if (flip > 0.5) f.x = 1.0 - f.x;

  // Two quarter arcs per tile: around (0,0) and (1,1), radius 0.5.
  float d0 = abs(length(f) - 0.5);
  float d1 = abs(length(f - 1.0) - 0.5);
  float d = min(d0, d1);
  vec2 centre = d0 < d1 ? vec2(0.0) : vec2(1.0);
  vec2 rel = f - centre;
  float arcAng = atan(rel.y, rel.x);            // position along the arc

  float px = uTiles / uResolution.y;            // one pixel in tile units
  float width = 0.035 + bass * 0.03;
  float line = 1.0 - smoothstep(width, width + px * 1.5, d);
  float glow = exp(-d * 9.0) * 0.35;

  // Travelling pulses along the curves.
  float pulse = fract(arcAng / (PI * 0.5) * 0.5 + hash12(id) - t * (0.8 + treb * 0.8));
  pulse = smoothstep(0.75, 1.0, pulse);

  float band = spectrum(hash12(id * 1.3) * 0.9);
  float lit = 0.25 + smoothstep(0.05, 0.6, band * uIntensity) * 0.9;

  float hue = fract(uColorHsl.x + hash12(id * 2.1) * 0.12 + t * 0.01);
  vec3 col = hsl2rgb(vec3(hue, 0.85, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.95));

  vec3 rgb = col * (line * lit + glow * lit) + hot * pulse * line * 1.2;
  float alpha = (line + glow * 0.8) * lit + pulse * line;
  fragColor = outPremul(rgb, alpha);
}
`

export const glTruchet = {
  id: 'glTruchet',
  name_de: 'Neon-Labyrinth (GPU)',
  name_en: 'Neon Maze (GPU)',
  frag,
  uniforms: () => ({ uTiles: 7 }),
  fallback: neonGrid,
}
