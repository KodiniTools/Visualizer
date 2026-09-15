/**
 * GPU preset: Laser Fan – a laser head at the bottom centre fanning thin
 * beams upward. The fan opens with the bass, rotates on onsets, each beam is
 * a band, treble flickers the beams, fog lights them up.
 * @module visualizers/gl/presets/glLaserFan
 */

import { lightBeams } from '../../effects/lightBeams.js'

const frag = /* glsl */ `
uniform float uBeams;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float treb = uBands.z;
  float beams = clamp(uBeams, 3.0, 16.0);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  vec2 src = vec2(0.0, -0.47);
  float fog = 0.5 + 0.5 * fbm(vec2(p.x * 2.0 + t * 0.1, p.y * 2.0 - t * 0.2));

  vec2 rel = p - src;
  float r = length(rel);
  float ang = atan(rel.x, rel.y);               // 0 = straight up
  float fan = (0.35 + bass * 0.55 + uOnset.x * 0.3) * uIntensity;
  float rot = sin(t * 0.4) * 0.2 + uOnset.w * 0.35;

  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    if (fi >= beams) break;
    float k = beams > 1.0 ? fi / (beams - 1.0) : 0.5;
    float a = (k - 0.5) * 2.0 * fan + rot;
    float sx = abs(k * 2.0 - 1.0) * 0.85;
    float band = spectrum(sx) * uIntensity;
    float flick = 0.85 + 0.15 * sin(t * 30.0 + fi * 3.0) * treb;
    float power = clamp(0.2 + band * 1.2, 0.0, 1.3) * flick;

    // Thin beam: angular distance in px at this radius.
    float dAng = abs(ang - a);
    float px = dAng * r / aaPx;
    float core = 1.0 - smoothstep(0.6, 1.8, px);
    float glow = exp(-px * 0.12) * 0.35;
    float reach = exp(-r * 0.9) * step(0.0, rel.y);
    float beam = (core + glow) * reach * fog * power;

    float hue = fract(uColorHsl.x + k * 0.45 + t * 0.02);
    vec3 col = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.95));
    rgb += mix(col, hot, core * 0.6) * beam;
    alpha += beam;
  }

  // Laser head.
  vec3 bodyCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.1));
  float head = 1.0 - smoothstep(0.03, 0.033, length(rel - vec2(0.0, -0.01)));
  float aperture = exp(-r * r * 1500.0) * (0.6 + bass * 0.6);
  rgb += bodyCol * head + hsl2rgb(vec3(uColorHsl.x, 0.4, 0.95)) * aperture;
  alpha += head + aperture;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLaserFan = {
  id: 'glLaserFan',
  name_de: 'Laser-Fächer (GPU)',
  name_en: 'Laser Fan (GPU)',
  frag,
  uniforms: () => ({ uBeams: 11 }),
  fallback: lightBeams,
}
