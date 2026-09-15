/**
 * GPU preset: Ring Fireworks – ring and chrysanthemum shells: every burst is
 * a clean expanding ring of sparks, followed by a second inner ring in a
 * shifted hue; the mids tilt the rings, treble sparkles along them.
 * @module visualizers/gl/presets/glFireworksRings
 */

import { pixelFireworks } from '../../particle/pixelFireworks.js'
import { createShellTracker, FIREWORKS_GLSL } from '../fireworks.js'

const frag = /* glsl */ `
${FIREWORKS_GLSL}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float mid = uBands.y;
  float treb = uBands.z;

  // Outer rings, then a delayed inner ring in the complementary hue: run the
  // burst twice with a lag and a smaller size.
  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 sa = uShellA[i];
    vec4 sb = uShellB[i];
    if (sb.z < 0.5) continue;
    vec2 launch = vec2(sa.x * aspect, -0.5);
    vec2 c = vec2(sa.x * aspect, sa.y);
    float hue = fract(uColorHsl.x + sb.x * 0.6);
    // Tilt the ring with the mids (squash vertically around the centre).
    vec2 q = c + (p - c) * vec2(1.0, 1.0 + mid * 0.5);
    if (sa.w < RISE) {
      vec4 r = rocket(p, launch, c, sa.w / RISE, sa.z, aaPx, hsl2rgb(vec3(hue, 0.8, 0.6)));
      rgb += r.rgb; alpha += r.a;
    } else {
      float age = sa.w - RISE;
      vec4 b1 = burst(q, c, age, sa.z, sb.y, hue, 2.0, aaPx, 0.3 + treb * 0.8);
      vec4 b2 = age > 0.35 ? burst(q, c, age - 0.35, sa.z + 5.0, sb.y * 0.55, fract(hue + 0.5), 2.0, aaPx, 0.3 + treb * 0.8) : vec4(0.0);
      rgb += b1.rgb + b2.rgb * 0.9;
      alpha += b1.a + b2.a * 0.9;
    }
  }

  float haze = exp(-(p.y + 0.5) * 7.0) * (0.05 + uBands.x * 0.06) * uIntensity;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.5, 0.5)) * haze;
  alpha += haze;
  fragColor = outPremul(rgb, alpha);
}
`

export const glFireworksRings = {
  id: 'glFireworksRings',
  name_de: 'Feuerwerk Ringe (GPU)',
  name_en: 'Ring Fireworks (GPU)',
  frag,
  uniforms: createShellTracker({ life: 3.8, autoInterval: 1.8 }),
  fallback: pixelFireworks,
}
