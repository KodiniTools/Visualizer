/**
 * GPU preset: Radial Bars – spectrum bars around a pulsing ring, with per-bar
 * glow and a bass-driven core. Successor of radialBars / orbitingLight.
 * @module visualizers/gl/presets/glRadialBars
 */

import { radialBars } from '../../spectrum/radialBars.js'

const frag = /* glsl */ `
uniform float uBarCount;
uniform float uInnerRadius;
uniform float uHueSpread;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float t = uTime;
  float n = max(8.0, uBarCount);

  float r = length(p);
  float ang = atan(p.y, p.x) - t * 0.08 - uOnset.w * 0.2;
  float a01 = fract(ang / TAU + 0.5);
  // Mirror the spectrum so bass sits at the top and bottom.
  float specX = abs(a01 * 2.0 - 1.0);
  float fi = floor(specX * n);
  float cellF = fract(specX * n);
  float sx = (fi + 0.5) / n;

  float v = spectrum(sx) * uIntensity * (1.0 + uOnset.x * 0.25 * smoothstep(0.3, 0.0, sx));
  v = clamp(v, 0.0, 1.0);

  float r0 = uInnerRadius * (1.0 + bass * 0.12 + uOnset.x * 0.08);
  float len = 0.02 + v * 0.34;
  float r1 = r0 + len;

  // Bar body in polar space.
  float arcPx = r * TAU / n * uResolution.y;      // px per angular cell at this radius
  float gapFrac = 0.28;
  float dx = abs(cellF - 0.5);
  float aaX = 1.2 / max(arcPx, 1.0);
  float bodyX = 1.0 - smoothstep(0.5 - gapFrac * 0.5 - aaX, 0.5 - gapFrac * 0.5 + aaX, dx);
  float aaY = 1.2 / uResolution.y;
  float bodyY = smoothstep(r0 - aaY, r0 + aaY, r) * (1.0 - smoothstep(r1 - aaY, r1 + aaY, r));
  float body = bodyX * bodyY;

  float hue = fract(uColorHsl.x + sx * uHueSpread);
  float sat = max(uColorHsl.y, 0.55);
  vec3 col = hsl2rgb(vec3(hue, sat, clamp(uColorHsl.z, 0.4, 0.62)));
  vec3 tip = hsl2rgb(vec3(hue, sat, 0.82));
  float along = clamp((r - r0) / max(len, 0.001), 0.0, 1.0);
  vec3 barRgb = mix(col, tip, smoothstep(0.5, 1.0, along)) * mix(0.75, 1.2, along);

  // Glow beyond the tip and a faint halo around the column.
  float dTip = max(r - r1, 0.0);
  float glow = exp(-dTip * (70.0 - 40.0 * v)) * (0.15 + 0.6 * v) * bodyX * step(r0, r);
  float halo = exp(-dTip * 18.0) * 0.1 * v * step(r0, r);

  // Inner ring + core.
  float ringW = 0.006 + bass * 0.004;
  float ring = 1.0 - smoothstep(ringW, ringW + aaY * 2.0, abs(r - r0 * 0.96));
  float core = exp(-r * r / (r0 * r0 * 0.35)) * (0.1 + bass * 0.7 + uOnset.x * 0.4);

  vec3 rgb = barRgb * body + col * (glow + halo) + tip * ring * 0.8 + tip * core;
  float alpha = body + glow * 0.9 + halo + ring * 0.8 + core;
  fragColor = outPremul(rgb, alpha);
}
`

export const glRadialBars = {
  id: 'glRadialBars',
  name_de: 'Radiale Balken (GPU)',
  name_en: 'Radial Bars (GPU)',
  frag,
  uniforms: () => ({ uBarCount: 48, uInnerRadius: 0.2, uHueSpread: 0.33 }),
  fallback: radialBars,
}
