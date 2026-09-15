/**
 * GPU preset: LED Cluster – a round fixture with lamps in three rings:
 * one bass lamp in the centre, six mid lamps around it, twelve treble lamps
 * outside. Chase lights run around the rings, the bass lamp breathes.
 * @module visualizers/gl/presets/glLedCluster
 */

import { orbitingLight } from '../../effects/orbitingLight.js'

const frag = /* glsl */ `
uniform float uLensSize;

vec4 ring(vec2 p, float radius, float count, float R, float aaPx, float sxBase, float sxSpread, float chase, float hueOff, float t) {
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float a = fi / count * TAU + t * 0.05;
    vec2 c = vec2(cos(a), sin(a)) * radius;
    vec2 lp = p - c;
    if (length(lp) > R * 2.2) continue;
    float sx = sxBase + fi / count * sxSpread;
    float e = (spectrum(sx - 0.01) + spectrum(sx) + spectrum(sx + 0.01)) / 3.0 * uIntensity;
    float run = smoothstep(0.7, 1.0, fract(fi / count - t * chase));
    float lit = clamp(smoothstep(0.04, 0.5, e) + run * 0.8 + uOnset.w * 0.3, 0.0, 1.0);
    float hue = fract(uColorHsl.x + hueOff + fi / count * 0.3);
    vec3 ledCol = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 ledDim = hsl2rgb(vec3(hue, 0.7, 0.13));
    vec3 ledHot = hsl2rgb(vec3(hue, 0.45, 0.93));
    acc += ledLamp(lp, R, aaPx, lit, ledCol, ledDim, ledHot, 1.0);
  }
  return acc;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float r = length(p);
  float housing = 1.0 - smoothstep(0.45, 0.45 + 2.0 * aaPx, r);
  vec3 housingCol = hsl2rgb(vec3(uColorHsl.x, 0.25, 0.09));
  rgb += housingCol * housing;
  alpha += housing * 0.9;
  // Ring grooves.
  float groove = (1.0 - smoothstep(0.0, 1.5 * aaPx, abs(r - 0.205))) + (1.0 - smoothstep(0.0, 1.5 * aaPx, abs(r - 0.34)));
  rgb += housingCol * 2.0 * groove * 0.4;

  float R = uLensSize;
  // Centre bass lamp.
  float eB = (spectrum(0.02) + spectrum(0.05) + spectrum(0.08)) / 3.0 * uIntensity;
  float litB = clamp(smoothstep(0.04, 0.5, eB) + uOnset.x * 0.5, 0.0, 1.0);
  vec3 hueB = hsl2rgb(vec3(uColorHsl.x, 0.95, 0.55));
  vec4 centre = ledLamp(p, R * 1.35 * (1.0 + bass * 0.06), aaPx, litB, hueB, hsl2rgb(vec3(uColorHsl.x, 0.7, 0.13)), hsl2rgb(vec3(uColorHsl.x, 0.45, 0.93)), 1.0);
  rgb += centre.rgb; alpha += centre.a;

  vec4 mids = ring(p, 0.2, 6.0, R * 0.95, aaPx, 0.24, 0.2, 0.35, 0.33, t);
  vec4 highs = ring(p, 0.37, 12.0, R * 0.8, aaPx, 0.55, 0.35, -0.5, 0.66, t);
  rgb += mids.rgb + highs.rgb;
  alpha += mids.a + highs.a;

  float outerGlow = exp(-max(r - 0.45, 0.0) * 22.0) * uBands.w * 0.3 * step(0.45, r);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.7, 0.5)) * outerGlow;
  alpha += outerGlow;
  fragColor = outPremul(rgb, alpha);
}
`

export const glLedCluster = {
  id: 'glLedCluster',
  name_de: 'LED-Kreis-Cluster (GPU)',
  name_en: 'LED Cluster (GPU)',
  frag,
  uniforms: () => ({ uLensSize: 0.052 }),
  fallback: orbitingLight,
}
