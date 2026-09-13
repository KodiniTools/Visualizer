/**
 * GPU preset: Aurora – layered glowing ribbons that follow the spectrum, with
 * a bass haze at the bottom and treble sparkles. Successor of fluidWaves /
 * texturedWave / liquidCrystals style effects.
 * @module visualizers/gl/presets/glAurora
 */

import { fluidWaves } from '../../organic/fluidWaves.js'

const frag = /* glsl */ `
uniform float uRibbons;   // number of ribbons (max 6)
uniform float uHueSpread; // hue offset between ribbons

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float count = clamp(uRibbons, 1.0, 6.0);

  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float k = fi / max(count - 1.0, 1.0);

    // Spectrum along x (log-mapped, smoothed), offset per ribbon.
    // Small per-ribbon offset (clamped, never wrapped) so ribbons differ without seams.
    float sx = clamp(mix(0.03, 0.9, uv.x) + fi * 0.012, 0.0, 1.0);
    // 5-tap box blur along the spectrum so single noisy bins do not jag the ribbon.
    float spec = (spectrum(sx - 0.03) + spectrum(sx - 0.015) + spectrum(sx) + spectrum(sx + 0.015) +
                  spectrum(sx + 0.03)) * 0.2;

    float base = 0.5 + (k - 0.5) * 0.55;
    float wave = fbm(vec2(uv.x * 2.2 * aspect + fi * 3.1, t * 0.22 + fi * 0.7)) * 2.0 - 1.0;
    float y = base
      + wave * 0.16
      + sin(uv.x * 5.0 * aspect + t * 1.1 + fi * 1.3) * 0.045 * (0.3 + mid)
      + spec * 0.17 * uIntensity * (0.6 + 0.4 * sin(fi * 1.7 + t * 0.8));

    float d = abs(uv.y - y);
    float width = 0.010 + 0.018 * bass + 0.012 * spec;
    float line = exp(-(d * d) / (width * width));
    float halo = exp(-d * 20.0) * 0.16 * (0.35 + spec);

    float hue = fract(uColorHsl.x + k * uHueSpread + t * 0.015);
    vec3 col = hsl2rgb(vec3(hue, 0.85, 0.6));
    vec3 hot = hsl2rgb(vec3(hue, 0.5, 0.9));

    rgb += mix(col, hot, line * line) * (line + halo) * (0.75 + 0.25 * uIntensity);
    alpha += line + halo * 0.8;
  }

  // Bass haze rising from the floor.
  float hazeN = fbm(vec2(uv.x * 3.0 * aspect, t * 0.3));
  float haze = smoothstep(0.38, 0.0, uv.y) * (bass * 0.3 + uOnset.x * 0.15) * uIntensity * (0.5 + 0.5 * hazeN);
  vec3 hazeCol = hsl2rgb(vec3(uColorHsl.x, 0.7, 0.45));
  rgb += hazeCol * haze;
  alpha += haze;

  // Treble sparkles.
  vec2 cells = vec2(110.0 * aspect, 110.0);
  vec2 cell = floor(uv * cells);
  vec2 cf = fract(uv * cells) - 0.5;
  float h = hash12(cell);
  float twinkle = 0.5 + 0.5 * sin(t * 7.0 + h * 60.0);
  float dot = 1.0 - smoothstep(0.0, 0.32, length(cf));
  float star = smoothstep(0.975, 1.0, h) * dot * twinkle * treb * 1.6;
  rgb += vec3(1.0) * star;
  alpha += star;

  fragColor = outPremul(rgb, alpha);
}
`

export const glAurora = {
  id: 'glAurora',
  name_de: 'Aurora (GPU)',
  name_en: 'Aurora (GPU)',
  frag,
  uniforms: () => ({
    uRibbons: 5,
    uHueSpread: 0.28,
  }),
  fallback: fluidWaves,
}
