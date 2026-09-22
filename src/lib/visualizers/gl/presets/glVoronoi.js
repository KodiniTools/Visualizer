/**
 * GPU preset: Crystal Cells – a Voronoi field whose edges glow with the
 * treble, whose cells light up by frequency band and whose cores pulse with
 * the bass; onsets make random cells flash. Successor of liquidCrystals /
 * shardMosaic / cellGrowth.
 * @module visualizers/gl/presets/glVoronoi
 */

import { liquidCrystals } from '../../effects/liquidCrystals.js'

const frag = /* glsl */ `
uniform float uCells;

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  vec2 p = vec2(uv.x * aspect, uv.y) * uCells;
  vec2 ip = floor(p);
  vec2 fp = fract(p);

  float f1 = 8.0;
  float f2 = 8.0;
  vec2 bestId = vec2(0.0);
  vec2 bestPt = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 off = vec2(float(x), float(y));
      vec2 id = ip + off;
      vec2 h = vec2(hash12(id), hash12(id + 7.3));
      vec2 pt = off + 0.5 + 0.38 * sin(t * (0.4 + h.x * 0.5) + h * TAU);
      float d = length(pt - fp);
      if (d < f1) { f2 = f1; f1 = d; bestId = id; bestPt = pt; }
      else if (d < f2) { f2 = d; }
    }
  }

  float edge = f2 - f1;                            // 0 on the cell border
  float hId = hash12(bestId * 1.9);
  float band = spectrum(hId * 0.9);
  float flash = step(0.82, hash12(bestId + floor(t * 6.0))) * uOnset.w;

  // Cell body brightness from its band, breathing with the bass.
  float body = (0.12 + band * 0.9 + flash * 0.8) * uIntensity;
  body *= 0.85 + 0.15 * sin(t * 2.0 + hId * TAU);
  // Cores pulse with bass.
  float core = exp(-f1 * f1 * (14.0 - bass * 8.0)) * (0.2 + bass * 0.9);
  // Glowing borders.
  float border = (1.0 - smoothstep(0.0, 0.05 + treb * 0.04, edge)) * (0.4 + treb * 1.2);
  float borderGlow = exp(-edge * 10.0) * 0.25 * (0.3 + treb);

  float hue = fract(uColorHsl.x + (hId - 0.5) * 0.22);
  vec3 col = hsl2rgb(vec3(hue, 0.8, 0.5));
  vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.92));

  vec3 rgb = col * body * 0.4 + hot * core + hot * border * 0.9 + col * borderGlow;
  float alpha = body * 0.4 + core + border + borderGlow;
  fragColor = outPremul(rgb, alpha);
}
`

export const glVoronoi = {
  id: 'glVoronoi',
  edgeFade: 'rect',
  name_de: 'Kristallzellen (GPU)',
  name_en: 'Crystal Cells (GPU)',
  frag,
  uniforms: () => ({ uCells: 7.0 }),
  fallback: liquidCrystals,
}
