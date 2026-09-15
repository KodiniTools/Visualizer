/**
 * GPU preset: LED Blinder – a 4x2 stage blinder with big warm lamps. Bass
 * and onsets fire the lamps with a halogen-style slow fade, the two rows
 * alternate on the mids, treble adds a cool white sparkle on the lenses.
 * @module visualizers/gl/presets/glLedBlinder
 */

import { pulsingOrbs } from '../../effects/pulsingOrbs.js'

const frag = /* glsl */ `
uniform float uLensSize;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;

  float cols = 4.0, rows = 2.0;
  float cell = min(aspect * 0.9 / cols, 0.9 / rows);
  vec2 wall = vec2(cols, rows) * cell;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float housing = 1.0 - smoothstep(0.0, 2.0 * aaPx, roundedBox(p, wall * 0.5 + cell * 0.05, cell * 0.08));
  vec3 housingCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.08));
  rgb += housingCol * housing;
  alpha += housing * 0.92;

  vec2 g = p / cell + vec2(cols, rows) * 0.5;
  vec2 id = floor(g);
  vec2 lp = (fract(g) - 0.5) * cell;
  if (g.x >= 0.0 && g.x < cols && g.y >= 0.0 && g.y < rows) {
    float idx = id.y * cols + id.x;
    // Halogen feel: slow rise, slower fall. Approximated with the onset and a
    // per-lamp phase so the eight lamps never fire in perfect unison.
    float phase = hash12(id + 3.0) * 0.4;
    float rowAlt = 0.5 + 0.5 * sin(t * (2.0 + mid * 4.0) + id.y * PI);
    float fire = clamp(bass * 0.9 + uOnset.x * 1.1 - phase * 0.3 + rowAlt * mid * 0.4, 0.0, 1.0);
    float lit = smoothstep(0.1, 0.9, fire) * 0.85 * uIntensity;

    // Warm lamps around the base hue, a cool white sparkle on treble.
    float hue = fract(uColorHsl.x + 0.02 * (idx - 3.5));
    vec3 warm = hsl2rgb(vec3(hue, 0.8, 0.6));
    vec3 dim = hsl2rgb(vec3(hue, 0.5, 0.1));
    vec3 hot = mix(hsl2rgb(vec3(hue, 0.5, 0.85)), vec3(1.0), treb * 0.3);
    float edgeMask = 1.0 - smoothstep(cell * 0.38, cell * 0.49, max(abs(lp.x), abs(lp.y)));
    vec4 lamp = ledLamp(lp, cell * uLensSize, aaPx, lit, warm, dim, hot, edgeMask);
    // Extra blinding bloom that spills into the whole cell when fully lit.
    float spill = smoothstep(0.6, 1.0, lit) * exp(-length(lp) / (cell * 0.5)) * 0.3;
    rgb += lamp.rgb + hot * spill;
    alpha += lamp.a + spill;
  }

  // Whole-frame flash on strong onsets, like a blinder washing the room.
  float wash = smoothstep(0.55, 1.0, uOnset.x) * 0.25 * uIntensity;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.6, 0.7)) * wash;
  alpha += wash;
  fragColor = outPremul(rgb, alpha);
}
`

export const glLedBlinder = {
  id: 'glLedBlinder',
  name_de: 'LED-Blinder (GPU)',
  name_en: 'LED Blinder (GPU)',
  frag,
  uniforms: () => ({ uLensSize: 0.4 }),
  fallback: pulsingOrbs,
}
