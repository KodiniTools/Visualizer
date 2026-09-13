/**
 * GPU preset: Spectrogram – the last 128 spectra scroll from right (now) to
 * left (past), frequency on the vertical axis, colour ramp built from the
 * base colour. The one visualizer that shows the music itself.
 * @module visualizers/gl/presets/glSpectrogram
 */

import { bars } from '../../spectrum/bars.js'

const frag = /* glsl */ `
uniform float uContrast;

void main() {
  vec2 uv = vUv;
  float age = 1.0 - uv.x;              // right edge = newest
  float freq = uv.y * 0.95;            // bottom = bass, top = treble
  float v = (history(freq - 0.006, age) + history(freq, age) + history(freq + 0.006, age)) / 3.0;
  v = pow(clamp(v * uContrast * uIntensity, 0.0, 1.0), 0.8);

  // Colour ramp: deep shade → base colour → hot highlight.
  float hue = uColorHsl.x;
  vec3 deep = hsl2rgb(vec3(fract(hue - 0.08), 0.8, 0.22));
  vec3 base = hsl2rgb(vec3(hue, max(uColorHsl.y, 0.6), 0.55));
  vec3 hot = hsl2rgb(vec3(fract(hue + 0.08), 0.6, 0.9));
  vec3 col = mix(deep, base, smoothstep(0.05, 0.5, v));
  col = mix(col, hot, smoothstep(0.55, 1.0, v));

  // Subtle frequency guide lines.
  float guide = (1.0 - smoothstep(0.5, 1.5, abs(fract(uv.y * 8.0) - 0.5) * uResolution.y / 8.0)) * 0.06;

  // "Now" cursor with a glow, plus a live spectrum bar at the right edge.
  float cursor = exp(-(1.0 - uv.x) * uResolution.x * 0.06) * 0.7;
  float live = spectrum(freq) * (1.0 - smoothstep(0.0, 0.012, 1.0 - uv.x));

  vec3 rgb = col * v + base * guide + hot * (cursor * 0.4 + live * 0.6);
  float alpha = smoothstep(0.02, 0.35, v) + guide + cursor * 0.4 + live * 0.6;
  fragColor = outPremul(rgb, alpha);
}
`

export const glSpectrogram = {
  id: 'glSpectrogram',
  name_de: 'Spektrogramm (GPU)',
  name_en: 'Spectrogram (GPU)',
  frag,
  uniforms: () => ({ uContrast: 1.25 }),
  fallback: bars,
}
