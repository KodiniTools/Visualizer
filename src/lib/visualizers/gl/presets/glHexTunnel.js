/**
 * GPU preset: Honeycomb Tunnel – flight through a tunnel tiled with hexagonal
 * cells. Cells light up with their frequency band, edges glow with the treble,
 * speed follows the bass. Successor of hexagonGrid in a tunnel setting.
 * @module visualizers/gl/presets/glHexTunnel
 */

import { hexagonGrid } from '../../geometric/hexagonGrid.js'

const frag = /* glsl */ `
uniform float uColumns;   // hex cells around the tunnel (even number keeps the seam clean)

// Hex grid helpers (pointy-top, unit spacing along x).
const vec2 HEX = vec2(1.0, 1.7320508);
vec4 hexCoords(vec2 uv) {
  vec2 a = mod(uv, HEX) - HEX * 0.5;
  vec2 b = mod(uv - HEX * 0.5, HEX) - HEX * 0.5;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  vec2 id = uv - gv;
  return vec4(gv, id);
}
float hexDist(vec2 p) {
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  float r = length(p);
  float ang = atan(p.y, p.x) / TAU + 0.5;
  float depth = 0.28 / max(r, 0.01);
  float speed = 0.9 + bass * 1.8 + uOnset.x * 1.2;
  float z = depth + t * speed;

  float cols = max(4.0, floor(uColumns * 0.5) * 2.0);
  vec2 uv = vec2(ang * cols, z * 0.9);
  vec4 hc = hexCoords(uv);
  vec2 gv = hc.xy;
  vec2 id = hc.zw;
  // Wrap the cell id in angle so cells across the seam share a hash.
  id.x = mod(id.x, cols);

  float h = hash12(id * 1.37);
  float band = spectrum(h * 0.9);
  float pulse = 0.5 + 0.5 * sin(t * 3.0 + h * TAU);
  float lit = smoothstep(0.05, 0.6, band * uIntensity) * (0.6 + 0.4 * pulse);
  float flash = step(0.9, hash12(id + floor(t * 4.0))) * uOnset.w;

  float d = hexDist(gv);                          // 0 centre .. 0.5 edge
  float edge = 1.0 - smoothstep(0.42, 0.5, d);    // inside cell
  float rim = smoothstep(0.36, 0.46, d) * edge;   // glowing rim
  float fill = smoothstep(0.5, 0.0, d) * 0.7;

  float fog = smoothstep(0.02, 0.3, r) * smoothstep(1.25, 0.6, r);

  float hue = fract(uColorHsl.x + h * 0.15 + z * 0.005);
  vec3 col = hsl2rgb(vec3(hue, 0.8, 0.5));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.95));
  vec3 dim = hsl2rgb(vec3(hue, 0.7, 0.2));

  vec3 rgb = (mix(dim, col, lit) * fill + hot * rim * (0.35 + treb * 0.9 + lit * 0.4) + hot * flash * edge) * fog;
  float alpha = (fill * (0.3 + lit * 0.7) + rim * (0.35 + treb * 0.9) + flash * edge) * fog;
  fragColor = outPremul(rgb, alpha);
}
`

export const glHexTunnel = {
  id: 'glHexTunnel',
  name_de: 'Waben-Tunnel (GPU)',
  name_en: 'Honeycomb Tunnel (GPU)',
  frag,
  uniforms: () => ({ uColumns: 14 }),
  fallback: hexagonGrid,
}
