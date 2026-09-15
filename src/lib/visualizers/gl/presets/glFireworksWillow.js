/**
 * GPU preset: Willow Fireworks – golden willow shells: bursts whose sparks
 * hang in long drooping trails and sink slowly. Fewer, larger shells, warm
 * hues around the base colour, the bass makes them bloom wider.
 * @module visualizers/gl/presets/glFireworksWillow
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

  vec4 fw = fireworks(p, aspect, aaPx, 1.0, 0.2 + treb * 0.5, fract(uColorHsl.x + 0.08));
  vec3 rgb = fw.rgb * vec3(1.05, 1.0, 0.9);
  float alpha = fw.a;

  // Smoke haze lingering where the shells burst.
  float smoke = fbm(vec2(p.x * 2.0 + uTime * 0.05, p.y * 2.0 - uTime * 0.03)) * 0.06 * smoothstep(-0.3, 0.3, p.y) * uIntensity;
  rgb += vec3(0.6, 0.6, 0.7) * smoke;
  alpha += smoke;
  fragColor = outPremul(rgb, alpha);
}
`

export const glFireworksWillow = {
  id: 'glFireworksWillow',
  name_de: 'Feuerwerk Weiden (GPU)',
  name_en: 'Willow Fireworks (GPU)',
  frag,
  uniforms: createShellTracker({ life: 4.8, autoInterval: 2.2, minY: 0.15, maxY: 0.34 }),
  fallback: pixelFireworks,
}
