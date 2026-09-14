/**
 * GPU preset: LED Matrix – a dot-matrix display running a column equalizer
 * with peak-hold dots. Each column is a log-spaced band, colour shifts with
 * the height, unlit dots stay faintly visible like a real panel.
 * @module visualizers/gl/presets/glLedMatrix
 */

import { pixelSpectrum } from '../../retro/pixelSpectrum.js'

const frag = /* glsl */ `
uniform float uCols;
uniform float uRows;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float bass = uBands.x;

  float cols = max(8.0, uCols);
  float rows = max(4.0, uRows);
  // Panel fills the width with square cells.
  float cell = min(aspect * 0.94 / cols, 0.94 / rows);
  vec2 panel = vec2(cols, rows) * cell;
  vec2 lp = p + panel * 0.5;               // 0..panel
  bool inside = lp.x >= 0.0 && lp.x < panel.x && lp.y >= 0.0 && lp.y < panel.y;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Housing.
  vec2 q = abs(p) - panel * 0.5 - cell * 0.35;
  float housing = 1.0 - smoothstep(0.0, 2.0 * aaPx, length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - cell * 0.3);
  vec3 housingCol = hsl2rgb(vec3(uColorHsl.x, 0.2, 0.08));
  rgb += housingCol * housing;
  alpha += housing * 0.9;

  if (inside) {
    vec2 g = lp / cell;
    vec2 id = floor(g);
    vec2 cf = fract(g) - 0.5;
    float col = id.x;
    float row = id.y;
    float sx = (col + 0.5) / cols * 0.9;
    float level = spectrum(sx) * uIntensity * (1.0 + uOnset.x * 0.2 * smoothstep(0.3, 0.0, sx));
    float litRows = level * rows;

    // Peak hold: max of the recent history (~0.4 s).
    float peak = 0.0;
    for (int i = 0; i < 6; i++) peak = max(peak, history(sx, float(i) * 0.04));
    float peakRow = floor(peak * uIntensity * rows);

    float onDot = step(row + 0.5, litRows);
    float isPeak = (abs(row - peakRow) < 0.5 && peakRow > litRows) ? 1.0 : 0.0;
    float d = length(cf);
    float dot = 1.0 - smoothstep(0.32, 0.32 + aaPx / cell * 1.5, d);
    float glow = exp(-max(d - 0.32, 0.0) * 10.0) * 0.5;

    float hue = fract(uColorHsl.x + row / rows * 0.33);
    vec3 on = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.5, 0.9));
    vec3 off = hsl2rgb(vec3(hue, 0.5, 0.11));

    float lit = max(onDot, isPeak);
    vec3 dotCol = mix(off, on, lit) + hot * isPeak * 0.6 + hot * onDot * (0.15 + bass * 0.25) * smoothstep(0.32, 0.0, d);
    rgb += dotCol * dot + on * glow * lit;
    alpha += dot + glow * lit;
  }

  fragColor = outPremul(rgb, alpha);
}
`

export const glLedMatrix = {
  id: 'glLedMatrix',
  name_de: 'LED-Matrix (GPU)',
  name_en: 'LED Matrix (GPU)',
  frag,
  uniforms: () => ({ uCols: 32, uRows: 16 }),
  fallback: pixelSpectrum,
}
