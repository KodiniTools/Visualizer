/**
 * GPU preset: Grand Finale – everything at once: shells of all kinds fire
 * fast, strong onsets add a whole-sky flash, the bass rumbles a haze at the
 * ground, treble fills the air with glitter, and smoke gathers over time.
 * @module visualizers/gl/presets/glFireworksFinale
 */

import { pixelFireworks } from '../../particle/pixelFireworks.js'
import { createShellTracker, FIREWORKS_GLSL } from '../fireworks.js'

const frag = /* glsl */ `
${FIREWORKS_GLSL}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float treb = uBands.z;

  vec4 fw = fireworks(p, aspect, aaPx, -1.0, 0.5 + treb * 0.8, uColorHsl.x);
  vec3 rgb = fw.rgb;
  float alpha = fw.a;

  // Glitter in the air on treble.
  vec2 cell = floor(p * 70.0);
  float h = fwHash(cell.x * 3.1 + cell.y * 7.7);
  float tw = 0.5 + 0.5 * sin(t * 9.0 + h * 50.0);
  float glitter = step(0.96, h) * tw * treb * 0.9 * (1.0 - smoothstep(0.0, 0.3, length(fract(p * 70.0) - 0.5)));
  rgb += vec3(1.0) * glitter;
  alpha += glitter;

  // Whole-sky flash on strong onsets.
  float flash = smoothstep(0.6, 1.0, uOnset.w) * 0.35 * uIntensity;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.4, 0.8)) * flash;
  alpha += flash;

  // Smoke and ground haze.
  float smoke = fbm(vec2(p.x * 1.5 + t * 0.04, p.y * 1.5 - t * 0.05)) * 0.08 * smoothstep(-0.5, 0.2, p.y) * uIntensity;
  float haze = exp(-(p.y + 0.5) * 6.0) * (0.08 + bass * 0.15) * uIntensity;
  rgb += vec3(0.55, 0.55, 0.65) * smoke + hsl2rgb(vec3(uColorHsl.x, 0.5, 0.5)) * haze;
  alpha += smoke + haze;
  fragColor = outPremul(rgb, alpha);
}
`

export const glFireworksFinale = {
  id: 'glFireworksFinale',
  name_de: 'Feuerwerk Finale (GPU)',
  name_en: 'Grand Finale (GPU)',
  frag,
  uniforms: createShellTracker({
    life: 3.0,
    autoInterval: 0.6,
    onsetThreshold: 0.3,
    cooldown: 0.06,
    minY: 0.0,
    maxY: 0.42,
  }),
  fallback: pixelFireworks,
}
