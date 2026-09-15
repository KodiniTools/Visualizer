/**
 * GPU preset: LED Sunstrip – ten lamps in a horizontal bar. Lamps fill from
 * the centre outward with the level, a chase runs along the bar at the speed
 * of the mids, onsets flash the outer lamps.
 * @module visualizers/gl/presets/glLedSunstrip
 */

import { mirroredBars } from '../../spectrum/mirroredBars.js'

const frag = /* glsl */ `
uniform float uLamps;
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
  float mid = uBands.y;
  float vol = uBands.w;

  float n = max(4.0, uLamps);
  float cell = aspect * 0.92 / n;
  vec2 bar = vec2(n * cell, cell);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float housing = 1.0 - smoothstep(0.0, 2.0 * aaPx, roundedBox(p, bar * 0.5 + cell * 0.06, cell * 0.12));
  vec3 housingCol = hsl2rgb(vec3(uColorHsl.x, 0.2, 0.08));
  rgb += housingCol * housing;
  alpha += housing * 0.92;

  float gx = p.x / cell + n * 0.5;
  float idx = floor(gx);
  vec2 lp = vec2((fract(gx) - 0.5) * cell, p.y);
  if (gx >= 0.0 && gx < n && abs(p.y) < cell * 0.5) {
    float k = abs((idx + 0.5) / n * 2.0 - 1.0);         // 0 centre .. 1 edge
    float sx = k * 0.85;
    float e = (spectrum(sx - 0.01) + spectrum(sx) + spectrum(sx + 0.01)) / 3.0 * uIntensity;
    float fill = step(k, vol * 1.3 * uIntensity);
    float chase = smoothstep(0.75, 1.0, fract((idx + 0.5) / n - t * (0.3 + mid * 0.6)));
    float lit = clamp(smoothstep(0.04, 0.5, e) * 0.7 + fill * 0.5 + chase * 0.8 + uOnset.z * k * 0.6, 0.0, 1.0);

    float hue = fract(uColorHsl.x + k * 0.35);
    vec3 ledCol = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 ledDim = hsl2rgb(vec3(hue, 0.7, 0.13));
    vec3 ledHot = hsl2rgb(vec3(hue, 0.45, 0.93));
    float edgeMask = 1.0 - smoothstep(cell * 0.38, cell * 0.49, max(abs(lp.x), abs(lp.y)));
    vec4 lamp = ledLamp(lp, cell * uLensSize, aaPx, lit, ledCol, ledDim, ledHot, edgeMask);
    rgb += lamp.rgb;
    alpha += lamp.a;
  }

  // Light spill above and below the bar.
  float spill = exp(-max(abs(p.y) - cell * 0.5, 0.0) * 14.0) * vol * 0.3 * step(cell * 0.5, abs(p.y)) * step(abs(p.x), bar.x * 0.5);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.7, 0.55)) * spill;
  alpha += spill;
  fragColor = outPremul(rgb, alpha);
}
`

export const glLedSunstrip = {
  id: 'glLedSunstrip',
  name_de: 'LED-Sunstrip (GPU)',
  name_en: 'LED Sunstrip (GPU)',
  frag,
  uniforms: () => ({ uLamps: 10, uLensSize: 0.38 }),
  fallback: mirroredBars,
}
