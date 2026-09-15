/**
 * GPU preset: Fireworks – classic peony shells. Rockets launch on every
 * onset (and on a slow cadence when quiet), rise with a sparkling trail and
 * burst into round balls of colour that fall with gravity. Bass sets the
 * burst size, treble adds glitter, the night sky carries a faint haze.
 * @module visualizers/gl/presets/glFireworksPeony
 */

import { pixelFireworks } from '../../particle/pixelFireworks.js'
import { createShellTracker, FIREWORKS_GLSL } from '../fireworks.js'

const frag = /* glsl */ `
${FIREWORKS_GLSL}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float treb = uBands.z;

  vec4 fw = fireworks(p, aspect, aaPx, 0.0, 0.4 + treb * 0.8, uColorHsl.x);
  vec3 rgb = fw.rgb;
  float alpha = fw.a;

  // Ground haze and a faint skyline glow.
  float haze = exp(-(p.y + 0.5) * 7.0) * (0.06 + uBands.x * 0.08) * uIntensity;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.5, 0.5)) * haze;
  alpha += haze;
  fragColor = outPremul(rgb, alpha);
}
`

export const glFireworksPeony = {
  id: 'glFireworksPeony',
  name_de: 'Feuerwerk (GPU)',
  name_en: 'Fireworks (GPU)',
  frag,
  uniforms: createShellTracker({ life: 3.6 }),
  fallback: pixelFireworks,
}
