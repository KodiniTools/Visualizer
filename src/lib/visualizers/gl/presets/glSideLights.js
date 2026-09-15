/**
 * GPU preset: Side Lights – lamp towers on the left and right edge shooting
 * beams across the stage. Left tower follows the bass and mids, right tower
 * mids and treble; on each onset the sides alternate, beams tilt with the
 * mids.
 * @module visualizers/gl/presets/glSideLights
 */

import { lightBeams } from '../../effects/lightBeams.js'

const frag = /* glsl */ `
uniform float uPerSide;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float mid = uBands.y;
  float per = clamp(uPerSide, 2.0, 6.0);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float fog = 0.5 + 0.5 * fbm(vec2(p.x * 1.6 - t * 0.12, p.y * 2.4 + t * 0.08));
  vec3 bodyCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.1));

  // Towers.
  float towerX = aspect * 0.47;
  float towers = (1.0 - smoothstep(0.012, 0.012 + 2.0 * aaPx, abs(abs(p.x) - towerX)));
  rgb += bodyCol * towers;
  alpha += towers * 0.9;

  // Alternating sides on onsets: a slow toggle driven by the onset stream.
  float toggle = 0.5 + 0.5 * sin(t * 2.5 + uOnset.w * 3.0);

  for (int side = 0; side < 2; side++) {
    float sgn = side == 0 ? 1.0 : -1.0;         // +1: lamps on the left shine right
    float sideMix = side == 0 ? toggle : 1.0 - toggle;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      if (fi >= per) break;
      float k = (fi + 0.5) / per;               // 0 bottom .. 1 top
      vec2 src = vec2(-sgn * towerX, (k - 0.5) * 0.8);
      float sx = side == 0 ? mix(0.02, 0.4, k) : mix(0.35, 0.85, k);
      float band = spectrum(sx) * uIntensity;
      float strobe = side == 0 ? uOnset.x : uOnset.z;
      float power = clamp(0.1 + band * 1.1 + strobe * 0.5, 0.0, 1.3) * (0.55 + 0.45 * sideMix);

      float tilt = sin(t * (0.5 + fi * 0.15) + fi * 1.1 + float(side) * 2.0) * (0.15 + mid * 0.45) - (k - 0.5) * 0.4;
      vec2 dir = normalize(vec2(sgn, tilt));
      float beam = spotBeam(p, src, dir, 0.16, 1.6, fog) * power;

      float hue = fract(uColorHsl.x + float(side) * 0.5 + k * 0.15);
      vec3 col = hsl2rgb(vec3(hue, 0.9, 0.55));
      vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.95));
      vec4 lamp = spotLamp(p, src, power, hot, bodyCol);
      rgb += col * beam * 0.9 + lamp.rgb;
      alpha += beam * 0.9 + lamp.a;
    }
  }

  fragColor = outPremul(rgb, alpha);
}
`

export const glSideLights = {
  id: 'glSideLights',
  name_de: 'Seiten-Scheinwerfer (GPU)',
  name_en: 'Side Lights (GPU)',
  frag,
  uniforms: () => ({ uPerSide: 4 }),
  fallback: lightBeams,
}
