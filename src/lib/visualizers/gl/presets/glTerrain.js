/**
 * GPU preset: Audio Landscape – a perspective ridge landscape built from the
 * spectrum history. Each ridge is one past spectrum, rolling towards the
 * viewer; bass raises the mountains, treble sharpens the edges.
 * @module visualizers/gl/presets/glTerrain
 */

import { bars3D } from '../../spectrum/bars3D.js'

const frag = /* glsl */ `
uniform float uRidges;    // number of ridges drawn (max 64)
uniform float uHorizon;   // horizon height in uv

float ridgeY(float x, float z, float age, float amp) {
  // Screen x → world x at this depth, mirrored spectrum across the width.
  float wx = abs(x - 0.5) * z * 1.15;
  float f = clamp(wx, 0.0, 1.0) * 0.9;
  float h = (history(f - 0.02, age) + history(f, age) + history(f + 0.02, age)) / 3.0;
  float ground = uHorizon - 0.55 / z;
  return ground + h * amp / z;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  float bass = uBands.x;
  float treb = uBands.z;

  float count = clamp(uRidges, 4.0, 64.0);
  float amp = (0.3 + bass * 0.3 + uOnset.x * 0.2) * uIntensity;
  float hue = uColorHsl.x;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float occluded = 0.0;

  // Near → far: a nearer ridge hides everything behind it that lies below it.
  for (int i = 0; i < 64; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float k = fi / (count - 1.0);           // 0 near .. 1 far
    float z = mix(1.0, 6.0, k * k * 0.6 + k * 0.4);
    float age = k;
    float y = ridgeY(uv.x, z, age, amp);

    if (occluded > 0.5) break;

    float dPx = (uv.y - y) * uResolution.y;
    float width = mix(2.2, 0.9, k);
    float line = 1.0 - smoothstep(width * 0.5, width * 0.5 + 1.2, abs(dPx));
    float glow = exp(-abs(dPx) / (4.0 + treb * 6.0)) * 0.25;
    float depthFade = pow(1.0 - k, 1.6) * 0.9 + 0.05;
    float hf = clamp(abs(uv.x - 0.5) * z * 1.15, 0.0, 1.0) * 0.9;
    float h = (history(hf - 0.02, age) + history(hf, age) + history(hf + 0.02, age)) / 3.0;

    vec3 col = hsl2rgb(vec3(fract(hue + k * 0.18 + h * 0.08), 0.85, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.92));
    rgb += (mix(col, hot, line * h) * line + col * glow) * depthFade;
    alpha += (line + glow) * depthFade;

    // Below this ridge: translucent fill, and farther ridges are hidden.
    if (dPx < 0.0) {
      float fill = 0.10 * depthFade * smoothstep(-40.0, 0.0, dPx);
      rgb += col * fill;
      alpha += fill;
      occluded = 1.0;
    }
  }

  // Horizon haze.
  float haze = exp(-abs(uv.y - uHorizon + 0.02) * 25.0) * 0.25;
  rgb += hsl2rgb(vec3(hue, 0.7, 0.6)) * haze;
  alpha += haze;

  fragColor = outPremul(rgb, alpha);
}
`

export const glTerrain = {
  id: 'glTerrain',
  name_de: 'Audio-Landschaft (GPU)',
  name_en: 'Audio Landscape (GPU)',
  frag,
  uniforms: () => ({ uRidges: 36, uHorizon: 0.66 }),
  fallback: bars3D,
}
