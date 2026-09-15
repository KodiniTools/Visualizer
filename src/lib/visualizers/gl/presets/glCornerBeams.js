/**
 * GPU preset: Corner Beams – four spotlights in the corners aiming at the
 * centre, beams crossing in fog. Bottom corners follow the bass, top corners
 * the treble, the mids swing the beams, onsets flash the pair diagonally.
 * @module visualizers/gl/presets/glCornerBeams
 */

import { lightBeams } from '../../effects/lightBeams.js'

const frag = /* glsl */ `
uniform float uSpread;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float fog = 0.5 + 0.5 * fbm(vec2(p.x * 1.8 + t * 0.12, p.y * 1.8 - t * 0.1));
  vec3 bodyCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.1));

  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 corner = vec2(fi < 2.0 ? -1.0 : 1.0, mod(fi, 2.0) == 0.0 ? -1.0 : 1.0);
    vec2 src = corner * vec2(aspect * 0.47, 0.46);
    float isBottom = corner.y < 0.0 ? 1.0 : 0.0;
    float level = mix(treb, bass, isBottom);
    float sx = mix(0.7, 0.05, isBottom) + fi * 0.03;
    float band = spectrum(sx) * uIntensity;
    float strobe = mix(uOnset.z, uOnset.x, isBottom);
    float power = clamp(0.15 + band * 1.0 + level * 0.5 + strobe * 0.6, 0.0, 1.4);

    // Aim at the centre, swinging with the mids, each corner on its own phase.
    float swing = sin(t * (0.6 + fi * 0.17) + fi * 1.9) * (0.25 + mid * 0.5);
    vec2 toCentre = normalize(-src);
    vec2 dir = normalize(toCentre + vec2(-toCentre.y, toCentre.x) * swing);
    float beam = spotBeam(p, src, dir, uSpread, 1.4, fog) * power;

    float hue = fract(uColorHsl.x + fi * 0.25);
    vec3 col = hsl2rgb(vec3(hue, 0.9, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.95));
    vec4 lamp = spotLamp(p, src, power, hot, bodyCol);
    rgb += col * beam * 0.9 + lamp.rgb;
    alpha += beam * 0.9 + lamp.a;
  }

  // Where beams cross in the middle the fog lights up.
  float centre = exp(-dot(p, p) * 6.0) * (0.08 + bass * 0.25 + uOnset.w * 0.2) * uIntensity * fog;
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.5, 0.7)) * centre;
  alpha += centre;

  fragColor = outPremul(rgb, alpha);
}
`

export const glCornerBeams = {
  id: 'glCornerBeams',
  name_de: 'Eck-Scheinwerfer (GPU)',
  name_en: 'Corner Beams (GPU)',
  frag,
  uniforms: () => ({ uSpread: 0.22 }),
  fallback: lightBeams,
}
