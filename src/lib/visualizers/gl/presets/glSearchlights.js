/**
 * GPU preset: Searchlights – three moving heads on the floor sweeping long
 * beams across the sky, crossing each other. Sweep speed follows the mids,
 * onsets snap the heads to a new position, the bass widens and brightens the
 * beams.
 * @module visualizers/gl/presets/glSearchlights
 */

import { lightBeams } from '../../effects/lightBeams.js'

const frag = /* glsl */ `
uniform float uHeads;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float heads = clamp(uHeads, 1.0, 5.0);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float fog = 0.6 + 0.4 * fbm(vec2(p.x * 1.4 + t * 0.08, p.y * 1.4 - t * 0.06));
  vec3 bodyCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.1));

  // Floor line.
  float floorY = -0.46;
  float floorLine = 1.0 - smoothstep(0.0, 2.0 * aaPx, abs(p.y - floorY) - 0.004);
  rgb += bodyCol * floorLine;
  alpha += floorLine * 0.8;

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (fi >= heads) break;
    float k = heads > 1.0 ? fi / (heads - 1.0) : 0.5;
    vec2 src = vec2((k - 0.5) * aspect * 0.7, floorY + 0.03);
    float sx = mix(0.05, 0.6, k);
    float band = spectrum(sx) * uIntensity;
    float power = clamp(0.35 + band * 0.8 + bass * 0.4 + uOnset.w * 0.4, 0.0, 1.4);

    // Sweep: slow sine with the mids, snapped by onsets to a hashed angle.
    float snap = floor(t * 0.5 + uOnset.w * 2.0);
    float target = (hash12(vec2(fi, snap)) - 0.5) * 1.6;
    float angle = sin(t * (0.35 + mid * 0.6) + fi * 2.1) * 0.7 + target * 0.5;
    vec2 dir = normalize(vec2(sin(angle), cos(angle)));
    float beam = spotBeam(p, src, dir, 0.05 + bass * 0.04, 2.2, fog) * power;

    float hue = fract(uColorHsl.x + fi * 0.18);
    vec3 col = hsl2rgb(vec3(hue, 0.7, 0.62));
    vec3 hot = hsl2rgb(vec3(hue, 0.3, 0.95));
    vec4 lamp = spotLamp(p, src, power, hot, bodyCol);
    rgb += col * beam + lamp.rgb;
    alpha += beam + lamp.a;
  }

  // Haze near the floor.
  float haze = exp(-(p.y - floorY) * 6.0) * bass * 0.2 * uIntensity * step(floorY, p.y);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.6, 0.55)) * haze;
  alpha += haze;

  fragColor = outPremul(rgb, alpha);
}
`

export const glSearchlights = {
  id: 'glSearchlights',
  name_de: 'Suchscheinwerfer (GPU)',
  name_en: 'Searchlights (GPU)',
  frag,
  uniforms: () => ({ uHeads: 3 }),
  fallback: lightBeams,
}
