/**
 * GPU preset: Interference – orbiting wave sources whose ripples interfere
 * into moiré patterns. Wavelength follows the bass, the sources' speed the
 * mids, onsets kick the phase. The sources themselves glow.
 * @module visualizers/gl/presets/glInterference
 */

import { soundWaves } from '../../spectrum/soundWaves.js'

const frag = /* glsl */ `
uniform float uSources;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float t = uTime;

  float count = clamp(uSources, 2.0, 6.0);
  float freq = 38.0 + bass * 18.0;
  float phase = t * (2.2 + mid * 2.0) + uOnset.w * 3.0;

  float field = 0.0;
  float srcGlow = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float k = fi / count;
    float w = 0.25 + k * 0.2;
    float a = t * w * (mod(fi, 2.0) == 0.0 ? 1.0 : -1.0) + k * TAU;
    float rad = 0.28 + 0.12 * sin(t * 0.3 + fi * 1.7) + bass * 0.05;
    vec2 s = vec2(cos(a), sin(a)) * rad;
    float d = length(p - s);
    // Each source is weighted by its band so the pattern shifts with the music.
    float weight = 0.6 + spectrum(k * 0.9) * 0.8;
    field += cos(d * freq - phase + fi) * weight / (1.0 + d * 2.5);
    srcGlow += exp(-d * d * 400.0) * (0.4 + spectrum(k * 0.9) * 0.9);
  }
  field /= count * 0.6;                        // roughly -1 .. 1

  // Pattern: bright crests, thin dark troughs; treble sharpens the crests.
  float crest = smoothstep(0.15 - treb * 0.1, 0.9, field);
  float lines = 1.0 - smoothstep(0.0, 0.08, abs(field));   // nodal lines
  float r = length(p);
  float vignette = smoothstep(1.1, 0.4, r);

  float hue = fract(uColorHsl.x + field * 0.12 + t * 0.01);
  vec3 col = hsl2rgb(vec3(hue, 0.85, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.95));
  vec3 dark = hsl2rgb(vec3(fract(hue + 0.1), 0.7, 0.3));

  vec3 rgb = (col * crest * 0.9 + dark * lines * 0.5 + hot * srcGlow) * vignette * (0.55 + 0.45 * uIntensity);
  float alpha = (crest * 0.9 + lines * 0.4 + srcGlow) * vignette * (0.55 + 0.45 * uIntensity);
  fragColor = outPremul(rgb, alpha);
}
`

export const glInterference = {
  id: 'glInterference',
  name_de: 'Interferenz (GPU)',
  name_en: 'Interference (GPU)',
  frag,
  uniforms: () => ({ uSources: 4 }),
  fallback: soundWaves,
}
