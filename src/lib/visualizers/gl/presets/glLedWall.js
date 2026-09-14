/**
 * GPU preset: LED Wall – a 3x3 panel of round LED lenses in nine colours.
 * Top row reacts to treble, middle row to mids, bottom row to bass; within a
 * row each lamp gets its own sub-band so the three never blink in unison.
 * Lit lamps bloom outside their lens, onsets flash the matching row.
 * @module visualizers/gl/presets/glLedWall
 */

import { arcadeBlocks } from '../../retro/arcadeBlocks.js'

const frag = /* glsl */ `
uniform float uLensSize;   // lens radius as a fraction of the cell

// Sub-band centres (smoothed log spectrum x) per row: bass, mids, treble.
float bandFor(float row, float col) {
  float sx;
  if (row < 0.5)      sx = 0.02 + col * 0.06;   // bass:   0.02 / 0.08 / 0.14
  else if (row < 1.5) sx = 0.24 + col * 0.10;   // mids:   0.24 / 0.34 / 0.44
  else                sx = 0.56 + col * 0.14;   // treble: 0.56 / 0.70 / 0.84
  float e = (spectrum(sx - 0.02) + spectrum(sx) + spectrum(sx + 0.02)) / 3.0;
  return e;
}

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;

  // Square wall, fitted to the shorter side.
  float wall = min(aspect, 1.0) * 0.9;
  float cell = wall / 3.0;
  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Housing.
  float housing = 1.0 - smoothstep(0.0, 2.0 * aaPx, roundedBox(p, vec2(wall * 0.5 + cell * 0.06), cell * 0.12));
  vec3 housingCol = hsl2rgb(vec3(uColorHsl.x, 0.25, 0.09));
  rgb += housingCol * housing;
  alpha += housing * 0.88;

  // Which cell.
  vec2 g = p / cell + 1.5;                  // 0..3 across the wall
  vec2 cellId = floor(g);
  vec2 lp = (fract(g) - 0.5) * cell;        // local coords, centred
  bool inside = g.x >= 0.0 && g.x < 3.0 && g.y >= 0.0 && g.y < 3.0;

  if (inside) {
    float row = cellId.y;                   // 0 bottom (bass) .. 2 top (treble)
    float col = cellId.x;
    float idx = row * 3.0 + col;

    float e = bandFor(row, col) * uIntensity;
    // Row-wise onset flash.
    float onsetRow = row < 0.5 ? uOnset.x : (row < 1.5 ? uOnset.y : uOnset.z);
    float lit = smoothstep(0.04, 0.55, e) + onsetRow * 0.35;
    lit = clamp(lit, 0.0, 1.0);

    float hue = fract(uColorHsl.x + idx / 9.0);
    vec3 ledCol = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 ledDim = hsl2rgb(vec3(hue, 0.7, 0.13));
    vec3 ledHot = hsl2rgb(vec3(hue, 0.45, 0.93));

    float R = cell * uLensSize;
    float d = length(lp);
    float lens = 1.0 - smoothstep(R - aaPx, R + aaPx, d);
    // Lens shading: brighter centre, darker edge, plus a small specular dot.
    float shade = 1.0 - smoothstep(0.0, R, d) * 0.55;
    float core = exp(-d * d / (R * R * 0.18)) * lit;
    vec2 specPos = lp - vec2(-R * 0.4, R * 0.4);
    float specular = exp(-dot(specPos, specPos) / (R * R * 0.012)) * 0.45;
    // Bezel ring around the lens.
    float bezel = (1.0 - smoothstep(0.0, 1.5 * aaPx, abs(d - R - 1.5 * aaPx))) * 0.6;
    // Bloom outside the lens when lit.
    // Bloom fades out before the cell edge so neighbouring cells stay separate.
    float edgeMask = 1.0 - smoothstep(cell * 0.38, cell * 0.49, max(abs(lp.x), abs(lp.y)));
    float bloom = exp(-max(d - R, 0.0) / (R * 0.35)) * lit * 0.75 * step(R, d) * edgeMask;

    vec3 lensCol = mix(ledDim, ledCol, lit) * shade + ledHot * core * 0.9 + vec3(1.0) * specular * (0.3 + lit * 0.5);
    rgb += lensCol * lens + ledCol * bloom + housingCol * 2.0 * bezel;
    alpha += lens + bloom + bezel * 0.5;
  }

  // Faint outer glow of the whole wall driven by the volume.
  float outerD = roundedBox(p, vec2(wall * 0.5 + cell * 0.06), cell * 0.12);
  float wallGlow = exp(-max(outerD, 0.0) * 25.0) * uBands.w * 0.25 * step(0.0, outerD);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.7, 0.5)) * wallGlow;
  alpha += wallGlow;

  // Subtle time-based shimmer so the housing never looks static.
  rgb += housingCol * housing * 0.08 * sin(t * 0.5);

  fragColor = outPremul(rgb, alpha);
}
`

export const glLedWall = {
  id: 'glLedWall',
  name_de: 'LED-Wand (GPU)',
  name_en: 'LED Wall (GPU)',
  frag,
  uniforms: () => ({ uLensSize: 0.36 }),
  fallback: arcadeBlocks,
}
