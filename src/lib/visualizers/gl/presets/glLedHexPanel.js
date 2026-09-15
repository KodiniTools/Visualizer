/**
 * GPU preset: LED Hex Panel – seven hexagonal light tiles (one centre, six
 * around). The centre tile is the bass, the ring tiles take the bands from
 * mids to treble; colour flows around the ring, onsets pulse the centre.
 * @module visualizers/gl/presets/glLedHexPanel
 */

import { hexagonGrid } from '../../geometric/hexagonGrid.js'

const frag = /* glsl */ `
uniform float uTileSize;

float hexDist(vec2 p) {
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}

vec4 tile(vec2 lp, float size, float aaPx, float lit, vec3 col, vec3 dim, vec3 hot, float t, float seed) {
  float d = hexDist(lp);
  float body = 1.0 - smoothstep(size - aaPx, size + aaPx, d);
  float rim = smoothstep(size * 0.82, size * 0.94, d) * body;
  // Soft diffuser gradient across the tile so it reads as a lit panel.
  float diff = 1.0 - smoothstep(0.0, size, d) * 0.35;
  float flicker = 0.9 + 0.1 * sin(t * 4.0 + seed * 7.0);
  vec3 face = mix(dim, col, lit) * diff * flicker + hot * lit * 0.25 * (1.0 - smoothstep(0.0, size * 0.5, d));
  float glow = exp(-max(d - size, 0.0) / (size * 0.4)) * lit * 0.6 * step(size, d);
  return vec4(face * body + hot * rim * (0.3 + lit * 0.5) + col * glow, body + glow);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float size = uTileSize;
  // Pointy-top hexes: neighbours sit at 0°, 60°, …, two apothems apart (+ gap).
  float spacing = size * 2.0 * 1.1;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Backplate.
  float plate = 1.0 - smoothstep(spacing + size + 0.02, spacing + size + 0.02 + 2.0 * aaPx, length(p));
  vec3 plateCol = hsl2rgb(vec3(uColorHsl.x, 0.2, 0.07));
  rgb += plateCol * plate;
  alpha += plate * 0.9;

  // Centre tile: bass.
  float eC = (spectrum(0.02) + spectrum(0.05) + spectrum(0.08)) / 3.0 * uIntensity;
  float litC = clamp(smoothstep(0.04, 0.5, eC) + uOnset.x * 0.6, 0.0, 1.0);
  vec3 cC = hsl2rgb(vec3(uColorHsl.x, 0.9, 0.55));
  vec4 centre = tile(p, size * (1.0 + bass * 0.04), aaPx, litC, cC, hsl2rgb(vec3(uColorHsl.x, 0.6, 0.12)), hsl2rgb(vec3(uColorHsl.x, 0.4, 0.95)), t, 0.0);
  rgb += centre.rgb; alpha += centre.a;

  // Six ring tiles: mids → treble around the ring, colour flowing with time.
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float a = fi / 6.0 * TAU;
    vec2 c = vec2(cos(a), sin(a)) * spacing;
    vec2 lp = p - c;
    if (hexDist(lp) > size * 1.6) continue;
    float sx = mix(0.25, 0.85, fi / 5.0);
    float e = (spectrum(sx - 0.02) + spectrum(sx) + spectrum(sx + 0.02)) / 3.0 * uIntensity;
    float flow = 0.5 + 0.5 * sin(t * 1.2 - fi * 1.05);
    float lit = clamp(smoothstep(0.04, 0.5, e) + flow * 0.15 + uOnset.w * 0.25, 0.0, 1.0);
    float hue = fract(uColorHsl.x + fi / 6.0 * 0.6 + t * 0.02);
    vec4 tl = tile(lp, size, aaPx, lit, hsl2rgb(vec3(hue, 0.9, 0.55)), hsl2rgb(vec3(hue, 0.6, 0.12)), hsl2rgb(vec3(hue, 0.4, 0.95)), t, fi + 1.0);
    rgb += tl.rgb; alpha += tl.a;
  }

  fragColor = outPremul(rgb, alpha);
}
`

export const glLedHexPanel = {
  id: 'glLedHexPanel',
  name_de: 'LED-Hexpanel (GPU)',
  name_en: 'LED Hex Panel (GPU)',
  frag,
  uniforms: () => ({ uTileSize: 0.13 }),
  fallback: hexagonGrid,
}
