/**
 * GPU preset: LED Wall 5x5 – twenty-five lamps. Rows are bands from bass
 * (bottom) to treble (top), columns are sub-bands, and every onset sends a
 * ripple of light outward from the centre lamp.
 * @module visualizers/gl/presets/glLedWall5
 */

import { arcadeBlocks } from '../../retro/arcadeBlocks.js'

const frag = /* glsl */ `
uniform float uLensSize;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float n = 5.0;
  float wall = min(aspect, 1.0) * 0.92;
  float cell = wall / n;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float housing = 1.0 - smoothstep(0.0, 2.0 * aaPx, roundedBox(p, vec2(wall * 0.5 + cell * 0.05), cell * 0.1));
  vec3 housingCol = hsl2rgb(vec3(uColorHsl.x, 0.25, 0.09));
  rgb += housingCol * housing;
  alpha += housing * 0.9;

  vec2 g = p / cell + n * 0.5;
  vec2 id = floor(g);
  vec2 lp = (fract(g) - 0.5) * cell;
  if (g.x >= 0.0 && g.x < n && g.y >= 0.0 && g.y < n) {
    float row = id.y;                                   // 0 bass .. 4 treble
    float col = id.x;
    float sx = mix(0.02, 0.86, row / (n - 1.0)) + (col - 2.0) * 0.03;
    float e = (spectrum(sx - 0.015) + spectrum(sx) + spectrum(sx + 0.015)) / 3.0 * uIntensity;
    // Onset ripple: a ring expanding from the centre lamp.
    float dist = length(id - 2.0);
    float ripple = exp(-abs(dist - fract(t * 1.6) * 4.0) * 1.2) * uOnset.w * 0.8;
    float lit = clamp(smoothstep(0.04, 0.5, e) + ripple, 0.0, 1.0);

    float hue = fract(uColorHsl.x + (row * n + col) / 25.0);
    vec3 ledCol = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 ledDim = hsl2rgb(vec3(hue, 0.7, 0.13));
    vec3 ledHot = hsl2rgb(vec3(hue, 0.45, 0.93));
    float edgeMask = 1.0 - smoothstep(cell * 0.38, cell * 0.49, max(abs(lp.x), abs(lp.y)));
    vec4 lamp = ledLamp(lp, cell * uLensSize, aaPx, lit, ledCol, ledDim, ledHot, edgeMask);
    rgb += lamp.rgb;
    alpha += lamp.a;
  }

  float outerD = roundedBox(p, vec2(wall * 0.5 + cell * 0.05), cell * 0.1);
  float wallGlow = exp(-max(outerD, 0.0) * 25.0) * uBands.w * 0.25 * step(0.0, outerD);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.7, 0.5)) * wallGlow;
  alpha += wallGlow;
  fragColor = outPremul(rgb, alpha);
}
`

export const glLedWall5 = {
  id: 'glLedWall5',
  name_de: 'LED-Wand 5x5 (GPU)',
  name_en: 'LED Wall 5x5 (GPU)',
  frag,
  uniforms: () => ({ uLensSize: 0.36 }),
  fallback: arcadeBlocks,
}
