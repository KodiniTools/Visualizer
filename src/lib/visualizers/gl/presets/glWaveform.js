/**
 * GPU preset: Waveform – the real time-domain signal as a glowing line with
 * a soft envelope fill and two hue-shifted ghost traces. Successor of
 * waveform / classicWaveform / retroOscilloscope / waveformHorizon.
 * @module visualizers/gl/presets/glWaveform
 */

import { waveform } from '../../spectrum/waveform.js'

const frag = /* glsl */ `
uniform float uAmplitude;

float traceLine(vec2 uv, float amp, float phase, float widthPx) {
  float x = uv.x;
  float dxs = 1.0 / uResolution.x;
  float y0 = 0.5 + waveform(x + phase) * amp;
  float y1 = 0.5 + waveform(x + phase + dxs * 2.0) * amp;
  float slope = (y1 - y0) / (dxs * 2.0) * (uResolution.y / uResolution.x);
  float d = abs(uv.y - y0) / sqrt(1.0 + slope * slope);
  float dPx = d * uResolution.y;
  return 1.0 - smoothstep(widthPx * 0.5, widthPx * 0.5 + 1.2, dPx);
}

void main() {
  vec2 uv = vUv;
  float vol = uBands.w;
  float amp = uAmplitude * uIntensity * (0.8 + uOnset.w * 0.4);

  // Envelope fill (smoothed |wave|), fades with distance from centre.
  float env = envelope(uv.x) * amp;
  float dc = abs(uv.y - 0.5);
  float fill = (1.0 - smoothstep(env * 0.7, env * 1.1 + 0.004, dc)) * 0.16;

  float main = traceLine(uv, amp, 0.0, 2.6 + vol * 1.5);
  float g1 = traceLine(uv, amp * 0.92, 0.004, 1.4) * 0.5;
  float g2 = traceLine(uv, amp * 1.08, -0.004, 1.4) * 0.5;

  // Glow around the main line.
  float y0 = 0.5 + waveform(uv.x) * amp;
  float glow = exp(-abs(uv.y - y0) * (40.0 - vol * 15.0)) * (0.2 + vol * 0.5);

  float hue = uColorHsl.x;
  vec3 col = hsl2rgb(vec3(hue, max(uColorHsl.y, 0.6), clamp(uColorHsl.z, 0.45, 0.62)));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.92));
  vec3 c1 = hsl2rgb(vec3(fract(hue + 0.08), 0.85, 0.6));
  vec3 c2 = hsl2rgb(vec3(fract(hue - 0.08), 0.85, 0.6));

  // Centre guide line.
  float guide = (1.0 - smoothstep(0.5, 1.5, dc * uResolution.y)) * 0.12;

  vec3 rgb = hot * main + c1 * g1 + c2 * g2 + col * (glow + fill) + col * guide;
  float alpha = main + g1 + g2 + glow + fill + guide;
  fragColor = outPremul(rgb, alpha);
}
`

export const glWaveform = {
  id: 'glWaveform',
  name_de: 'Wellenform (GPU)',
  name_en: 'Waveform (GPU)',
  needsTimeData: true,
  frag,
  uniforms: () => ({ uAmplitude: 0.42 }),
  fallback: waveform,
}
