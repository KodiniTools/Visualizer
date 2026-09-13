/**
 * GPU preset: Bars – log-spaced spectrum bars with rounded caps, per-bar glow
 * and a mirrored mode. Replaces bars / mirroredBars quality-wise; pixel look
 * comes from the bar count.
 * @module visualizers/gl/presets/glBars
 */

import { bars } from '../../spectrum/bars.js'

const frag = /* glsl */ `
uniform float uBarCount;  // number of bars across the width
uniform float uMirror;    // 0 = from the bottom, 1 = mirrored around the centre
uniform float uHueSpread; // hue rotation across the spectrum (0–1 turns)

void main() {
  vec2 uv = vUv;
  float n = max(4.0, uBarCount);
  float fi = floor(uv.x * n);
  float cellX = fract(uv.x * n);
  float t = (fi + 0.5) / n;

  float v = spectrum(t) * uIntensity;
  float onsetKick = 1.0 + uOnset.x * 0.25 * smoothstep(0.35, 0.0, t);
  v = clamp(v * onsetKick, 0.0, 1.0);

  // Geometry in normalised units.
  float mirrored = step(0.5, uMirror);
  float y = mix(uv.y, abs(uv.y * 2.0 - 1.0), mirrored);
  float barH = v * 0.82 + 0.006;

  float gap = 0.22;
  float halfW = 0.5 - gap * 0.5;
  float dx = abs(cellX - 0.5);
  float aaX = n * 1.2 / uResolution.x;
  float bodyX = 1.0 - smoothstep(halfW - aaX, halfW + aaX, dx);

  // Rounded-top bar as a signed distance field in pixels (bottom corners far
  // below the canvas so only the cap is rounded).
  float cellPx = uResolution.x / n;
  float halfWpx = halfW * cellPx;
  float rPx = halfWpx * 0.9;
  float xPx = dx * cellPx;
  float yPx = y * uResolution.y;
  float barHpx = barH * uResolution.y;
  float big = 4000.0;
  vec2 c = vec2(0.0, (barHpx - big) * 0.5);
  vec2 hs = vec2(halfWpx, (barHpx + big) * 0.5) - rPx;
  vec2 q2 = abs(vec2(xPx, yPx) - c) - hs;
  float dist = length(max(q2, 0.0)) + min(max(q2.x, q2.y), 0.0) - rPx;
  float body = clamp(1.0 - smoothstep(-0.75, 0.75, dist), 0.0, 1.0);

  // Colour: base hue rotated across the spectrum, brighter towards the top.
  float hue = fract(uColorHsl.x + t * uHueSpread);
  float sat = max(uColorHsl.y, 0.55);
  float lum = clamp(uColorHsl.z, 0.4, 0.62);
  vec3 col = hsl2rgb(vec3(hue, sat, lum));
  float grad = mix(0.7, 1.25, clamp(y / max(barH, 0.001), 0.0, 1.0));
  vec3 topTint = hsl2rgb(vec3(hue, sat, 0.8));
  vec3 barRgb = mix(col, topTint, smoothstep(0.55, 1.0, y / max(barH, 0.001))) * grad;

  // Glow above the bar, stronger for loud bars.
  float dTop = max(y - barH, 0.0);
  float glow = exp(-dTop * (90.0 - 55.0 * v)) * (0.18 + 0.7 * v) * bodyX;
  // Soft halo around the whole bar column so neighbours blend a little.
  float halo = exp(-dTop * 22.0) * 0.12 * v * (1.0 - smoothstep(halfW, halfW + 0.9, dx));

  vec3 rgb = barRgb * body + col * glow + col * halo;
  float a = body + glow * 0.9 + halo;
  fragColor = outPremul(rgb, a);
}
`

export const glBars = {
  id: 'glBars',
  name_de: 'Balken (GPU)',
  name_en: 'Bars (GPU)',
  frag,
  uniforms: () => ({
    uBarCount: 64,
    uMirror: 0,
    uHueSpread: 0.33,
  }),
  fallback: bars,
}

/** Mirrored variant – same shader, different uniforms. */
export const glBarsMirrored = {
  id: 'glBarsMirrored',
  name_de: 'Balken gespiegelt (GPU)',
  name_en: 'Bars mirrored (GPU)',
  frag,
  uniforms: () => ({
    uBarCount: 72,
    uMirror: 1,
    uHueSpread: 0.33,
  }),
  fallback: bars,
}
