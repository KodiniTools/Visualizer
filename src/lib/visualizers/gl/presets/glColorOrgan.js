/**
 * GPU preset: Colour Organ – the 70s light organ: three big translucent
 * panels for bass, mids and treble, each glowing with its band, with a
 * frosted-plexiglass look, spill onto the wall and a fourth strobe panel on
 * onsets.
 * @module visualizers/gl/presets/glColorOrgan
 */

import { pulsingOrbs } from '../../effects/pulsingOrbs.js'

const frag = /* glsl */ `
uniform float uPanels;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float panels = clamp(uPanels, 3.0, 4.0);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  float width = aspect * 0.9;
  float cell = width / panels;
  vec2 size = vec2(cell * 0.42, 0.34);

  // Cabinet.
  float cab = 1.0 - smoothstep(0.0, 2.0 * aaPx, roundedBox(p, vec2(width * 0.5 + cell * 0.04, size.y + 0.05), 0.03));
  vec3 cabCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.08));
  rgb += cabCol * cab;
  alpha += cab * 0.92;

  float frost = 0.85 + 0.15 * fbm(p * 14.0 + t * 0.05);

  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    if (fi >= panels) break;
    vec2 c = vec2((fi + 0.5) / panels * width - width * 0.5, 0.0);
    vec2 lp = p - c;
    float d = roundedBox(lp, size, 0.02);
    if (d > 0.25) continue;

    float level;
    float hueOff;
    if (fi < 0.5) { level = uBands.x * 0.8 + spectrum(0.05) * 0.6; hueOff = 0.0; }
    else if (fi < 1.5) { level = uBands.y * 0.8 + spectrum(0.35) * 0.6; hueOff = 0.33; }
    else if (fi < 2.5) { level = uBands.z * 0.8 + spectrum(0.7) * 0.6; hueOff = 0.66; }
    else { level = uOnset.w * 1.2; hueOff = 0.5; }
    level = clamp(level * uIntensity, 0.0, 1.0);

    float panel = 1.0 - smoothstep(0.0, 1.5 * aaPx, d);
    float bezel = (1.0 - smoothstep(0.0, 2.0 * aaPx, abs(d) - 1.5 * aaPx)) * 0.5;
    // Lamp behind frosted plexi: hot centre, soft falloff, frost texture.
    float lamp = exp(-dot(lp / size, lp / size) * 1.6) * level;
    float hue = fract(uColorHsl.x + hueOff);
    vec3 dim = hsl2rgb(vec3(hue, 0.6, 0.12));
    vec3 col = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.45, 0.92));
    vec3 face = mix(dim, col, level * 0.7 + lamp * 0.3) * frost + hot * lamp * 0.8;
    float spill = exp(-max(d, 0.0) * 12.0) * level * 0.5 * step(0.0, d);
    rgb += face * panel + col * spill + cabCol * 3.0 * bezel;
    alpha += panel + spill + bezel * 0.5;
  }

  fragColor = outPremul(rgb, alpha);
}
`

export const glColorOrgan = {
  id: 'glColorOrgan',
  name_de: 'Lichtorgel (GPU)',
  name_en: 'Colour Organ (GPU)',
  frag,
  uniforms: () => ({ uPanels: 4 }),
  fallback: pulsingOrbs,
}
