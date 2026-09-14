/**
 * GPU preset: LED Strips – six horizontal LED strips, one band each. Comets
 * race along every strip at the speed of its band, onsets launch a bright
 * head, the strip's base glow follows its level. Bass at the bottom.
 * @module visualizers/gl/presets/glLedStrips
 */

import { mirroredBars } from '../../spectrum/mirroredBars.js'

const frag = /* glsl */ `
uniform float uStrips;
uniform float uLedsPerStrip;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;

  float strips = max(2.0, uStrips);
  float leds = max(8.0, uLedsPerStrip);
  float width = aspect * 0.9;
  float stripGap = 0.8 / strips;
  float ledW = width / leds;
  float ledH = min(stripGap * 0.42, ledW * 0.9);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  float yy = p.y + 0.4;                         // 0..0.8
  float si = floor(yy / stripGap);
  float sf = (fract(yy / stripGap) - 0.5) * stripGap;
  bool inside = si >= 0.0 && si < strips && abs(p.x) < width * 0.5;

  if (inside) {
    float k = si / (strips - 1.0);              // 0 bottom (bass) .. 1 top (treble)
    float sx = k * 0.9;
    float level = spectrum(sx) * uIntensity;
    float onsetK = k < 0.34 ? uOnset.x : (k < 0.67 ? uOnset.y : uOnset.z);

    float xx = p.x + width * 0.5;               // 0..width
    float li = floor(xx / ledW);
    vec2 cf = vec2((fract(xx / ledW) - 0.5) * ledW, sf);

    // Strip rail.
    float rail = 1.0 - smoothstep(ledH * 0.75, ledH * 0.75 + 2.0 * aaPx, abs(sf));
    vec3 railCol = hsl2rgb(vec3(uColorHsl.x, 0.2, 0.08));
    rgb += railCol * rail;
    alpha += rail * 0.9;

    // LED body.
    vec2 hsz = vec2(ledW * 0.36, ledH * 0.45);
    vec2 dq = abs(cf) - hsz + 0.003;
    float sd = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - 0.003;
    float led = 1.0 - smoothstep(0.0, 1.5 * aaPx, sd);

    // Comets: two heads per strip travelling at the band's speed.
    float speed = 0.25 + level * 0.9 + k * 0.15;
    float pos = li / leds;
    float c1 = fract(pos - t * speed);
    float c2 = fract(pos - t * speed * 0.6 + 0.5);
    float comet = max(smoothstep(0.75, 1.0, c1), smoothstep(0.8, 1.0, c2) * 0.7);
    // Level fill from the centre outward.
    float fill = step(abs(pos - 0.5) * 2.0, level * 0.9);
    float lit = clamp(comet + fill * 0.5 + onsetK * 0.5, 0.0, 1.0);

    float hue = fract(uColorHsl.x + k * 0.5 + pos * 0.08);
    vec3 on = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 off = hsl2rgb(vec3(hue, 0.5, 0.1));
    vec3 hot = hsl2rgb(vec3(hue, 0.45, 0.92));
    vec3 ledCol = mix(off, on, lit) + hot * comet * 0.6;
    float glow = exp(-length(cf) / (ledH * 1.1)) * 0.55 * lit * (1.0 - led);

    rgb += ledCol * led + on * glow;
    alpha += led + glow;
  }

  // Bass haze along the bottom strip.
  float haze = exp(-(p.y + 0.5) * 9.0) * bass * 0.2 * uIntensity;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.7, 0.5)) * haze;
  alpha += haze;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLedStrips = {
  id: 'glLedStrips',
  name_de: 'LED-Streifen (GPU)',
  name_en: 'LED Strips (GPU)',
  frag,
  uniforms: () => ({ uStrips: 6, uLedsPerStrip: 40 }),
  fallback: mirroredBars,
}
