/**
 * GPU preset: Matrix Rain – columns of falling glyph cells with bright heads
 * and fading tails; column speed and brightness follow the spectrum, the
 * bass adds a burst of extra drops. Successor of digitalRain / matrixRain.
 * @module visualizers/gl/presets/glRain
 */

import { matrixRain } from '../../tech/matrixRain.js'

const frag = /* glsl */ `
uniform float uColumns;

// Pseudo-glyph: a 3x5 bit pattern from a hash, so cells look like characters.
float glyph(vec2 f, float seed) {
  vec2 g = floor(f * vec2(3.0, 5.0));
  float bit = hash12(g + seed * 17.0);
  float on = step(0.45, bit);
  // Keep a 1px-ish margin inside the cell.
  vec2 inner = step(vec2(0.08), f) * step(f, vec2(0.92));
  return on * inner.x * inner.y;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  float cols = max(8.0, uColumns);
  float rows = cols / aspect * 1.6;
  float cx = floor(uv.x * cols);
  float h1 = hash12(vec2(cx, 1.0));
  float h2 = hash12(vec2(cx, 2.0));
  float spec = spectrum(fract(h2 * 0.9));

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Two drops per column with different offsets.
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float hs = hash12(vec2(cx, 3.0 + fk));
    float speed = (0.25 + hs * 0.5) * (0.8 + spec * 1.2 + bass * 0.6 + uOnset.x * 0.8);
    float head = fract(h1 + fk * 0.5 - t * speed);          // 1 → 0 (falling)
    float tail = 0.18 + hs * 0.25 + spec * 0.2;
    float cy = floor(uv.y * rows);
    float rowY = (cy + 0.5) / rows;
    // Cells above the head within tail length.
    float inTail = (rowY >= head && rowY <= head + tail) ? 1.0 : 0.0;
    float fade = 1.0 - (rowY - head) / tail;
    fade = clamp(fade, 0.0, 1.0);
    fade = fade * fade;
    float isHead = (abs(rowY - head) < 0.5 / rows) ? 1.0 : 0.0;

    vec2 cellF = fract(uv * vec2(cols, rows));
    float glyphSeed = cy * 3.1 + cx * 7.7 + floor(t * (3.0 + treb * 12.0) + h2 * 10.0);
    float g = glyph(cellF, glyphSeed);

    float hue = fract(uColorHsl.x + hs * 0.06);
    vec3 col = hsl2rgb(vec3(hue, 0.85, 0.5));
    vec3 hot = hsl2rgb(vec3(hue, 0.3, 0.92));

    float bright = inTail * fade * (0.5 + spec * 0.8);
    rgb += mix(col, hot, isHead) * g * (bright + isHead * 1.2);
    alpha += g * (bright + isHead);
  }

  rgb *= 0.6 + 0.4 * uIntensity;
  alpha *= 0.6 + 0.4 * uIntensity;
  fragColor = outPremul(rgb, alpha);
}
`

export const glRain = {
  id: 'glRain',
  edgeFade: 'rect',
  name_de: 'Matrix-Regen (GPU)',
  name_en: 'Matrix Rain (GPU)',
  frag,
  uniforms: () => ({ uColumns: 56 }),
  fallback: matrixRain,
}
