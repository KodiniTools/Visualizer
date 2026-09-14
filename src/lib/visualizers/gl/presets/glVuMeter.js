/**
 * GPU preset: LED Level Meter – vertical chains of LED segments, one chain
 * per band, with the classic green → yellow → red ramp rotated around the
 * base colour, peak-hold segments and a soft bloom on the lit part.
 * @module visualizers/gl/presets/glVuMeter
 */

import { bars } from '../../spectrum/bars.js'

const frag = /* glsl */ `
uniform float uChains;
uniform float uSegments;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;

  float chains = max(2.0, uChains);
  float segs = max(6.0, uSegments);
  float height = 0.84;
  float segH = height / segs;
  float chainW = min(segH * 2.2, aspect * 0.9 / chains);
  float totalW = chainW * chains;

  vec2 lp = p + vec2(totalW, height) * 0.5;      // 0..total
  bool inside = lp.x >= 0.0 && lp.x < totalW && lp.y >= 0.0 && lp.y < height;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Backplate.
  vec2 q = abs(p) - vec2(totalW, height) * 0.5 - vec2(chainW * 0.3, segH * 0.8);
  float plate = 1.0 - smoothstep(0.0, 2.0 * aaPx, length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - segH);
  vec3 plateCol = hsl2rgb(vec3(uColorHsl.x, 0.2, 0.08));
  rgb += plateCol * plate;
  alpha += plate * 0.9;

  if (inside) {
    float ci = floor(lp.x / chainW);
    float si = floor(lp.y / segH);
    vec2 cf = vec2(fract(lp.x / chainW), fract(lp.y / segH)) - 0.5;
    float sx = (ci + 0.5) / chains * 0.9;
    float level = spectrum(sx) * uIntensity * (1.0 + uOnset.x * 0.2 * smoothstep(0.3, 0.0, sx));
    float litSegs = level * segs;

    float peak = 0.0;
    for (int i = 0; i < 8; i++) peak = max(peak, history(sx, float(i) * 0.035));
    float peakSeg = floor(peak * uIntensity * segs);

    float on = step(si + 0.5, litSegs);
    float isPeak = (abs(si - peakSeg) < 0.5 && peakSeg > litSegs) ? 1.0 : 0.0;

    // Segment shape: rounded bar with gaps.
    vec2 hsz = vec2(0.36, 0.3);
    vec2 dq = abs(cf) - hsz + 0.08;
    float sd = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - 0.08;
    float seg = 1.0 - smoothstep(0.0, aaPx / segH * 1.5, sd);
    float glow = exp(-max(sd, 0.0) * 9.0) * 0.45;

    // Ramp: cool at the bottom, hot at the top (rotated around the base hue).
    float k = si / segs;
    float hue = fract(uColorHsl.x + k * 0.36);
    vec3 onCol = hsl2rgb(vec3(hue, 0.95, mix(0.5, 0.58, k)));
    vec3 offCol = hsl2rgb(vec3(hue, 0.5, 0.1));
    vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.92));

    float lit = max(on, isPeak);
    vec3 segCol = mix(offCol, onCol, lit) + hot * isPeak * 0.6 + hot * on * 0.2 * (1.0 - smoothstep(-0.1, 0.0, sd));
    rgb += segCol * seg + onCol * glow * lit;
    alpha += seg + glow * lit;
  }

  fragColor = outPremul(rgb, alpha);
}
`

export const glVuMeter = {
  id: 'glVuMeter',
  name_de: 'LED-Pegelmeter (GPU)',
  name_en: 'LED Level Meter (GPU)',
  frag,
  uniforms: () => ({ uChains: 10, uSegments: 24 }),
  fallback: bars,
}
