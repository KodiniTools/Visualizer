/**
 * GPU preset: Laser Burst – a starburst of beams from the centre, mirrored
 * into a kaleidoscope. Beam count follows the mids, the burst breathes and
 * spins with the bass, onsets fire a bright shockwave ring along the beams,
 * treble flickers the tips.
 * @module visualizers/gl/presets/glLaserBurst
 */

import { lightBeams } from '../../effects/lightBeams.js'

const frag = /* glsl */ `
uniform float uBeams;
uniform float uMirrors;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float flick = 0.85 + 0.15 * sin(t * 48.0) * treb;

  float r = length(p);
  float ang = atan(p.y, p.x) + t * 0.2 * (1.0 + bass) + uOnset.w * 0.6;
  // Kaleidoscope fold.
  float mirrors = clamp(uMirrors, 1.0, 8.0);
  float seg = TAU / mirrors;
  float a = mod(ang, seg);
  a = abs(a - seg * 0.5);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float beams = clamp(uBeams, 2.0, 12.0);
  float nBeams = 2.0 + floor(mid * (beams - 2.0) + 0.5);

  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    if (fi >= nBeams) break;
    float ba = (fi + 0.5) / nBeams * seg * 0.5;   // within the folded wedge
    float wobble = sin(t * 1.5 + fi * 1.3) * 0.03 * mid;
    float px = abs(a - ba - wobble) * r / aaPx;
    float sx = fract(fi / nBeams) * 0.85;
    float e = spectrum(sx) * uIntensity;
    float reach = exp(-r * (1.2 - bass * 0.5));
    float beam = laserGlow(px) * reach * (0.3 + e * 1.0) * flick * smoothstep(0.02, 0.08, r);
    float hue = fract(uColorHsl.x + fi / nBeams * 0.5 + t * 0.03);
    vec3 col = hsl2rgb(vec3(hue, 0.95, 0.55));
    rgb += mix(col, vec3(1.0), 1.0 - smoothstep(0.5, 1.7, px)) * beam;
    alpha += beam;
  }

  // Onset shockwave ring travelling outward along the beams.
  float ringR = fract(t * 0.9) * 0.9;
  float ring = laserGlow(abs(r - ringR) / aaPx * 0.5) * uOnset.w * 0.8 * (1.0 - ringR);
  vec3 hot = hsl2rgb(vec3(uColorHsl.x, 0.4, 0.95));
  rgb += hot * ring;
  alpha += ring;

  // Core.
  float core = exp(-r * r * 400.0) * (0.5 + bass * 0.8);
  rgb += hot * core;
  alpha += core;

  fragColor = outPremul(rgb, alpha);
}
`

export const glLaserBurst = {
  id: 'glLaserBurst',
  edgeFade: 'radial',
  name_de: 'Laser-Burst (GPU)',
  name_en: 'Laser Burst (GPU)',
  frag,
  uniforms: () => ({ uBeams: 8, uMirrors: 6 }),
  fallback: lightBeams,
}
