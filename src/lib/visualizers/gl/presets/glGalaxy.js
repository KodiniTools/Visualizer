/**
 * GPU preset: Galaxy – rotating spiral arms of dust and stars. The arms
 * light up along the radius with the spectrum, the core swells with the
 * bass, stars twinkle on the treble. Successor of spiralGalaxy.
 * @module visualizers/gl/presets/glGalaxy
 */

import { spiralGalaxy } from '../../organic/spiralGalaxy.js'

const frag = /* glsl */ `
uniform float uArms;
uniform float uTwist;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float t = uTime;

  // Slight tilt so the disc reads as 3D.
  p.y *= 1.35;
  float r = length(p);
  // Differential rotation: inner parts spin faster.
  float ang = atan(p.y, p.x) + t * (0.12 + 0.25 / (r + 0.25)) + uOnset.w * 0.2;
  float lr = log(max(r, 0.01));

  // Spiral arm density along log-spiral coordinates.
  float armPhase = ang * uArms - lr * uTwist;
  float arms = cos(armPhase) * 0.5 + 0.5;
  arms = pow(arms, 3.2 - mid * 1.2);

  // Dust: noise in polar/log space, periodic in angle via cos/sin.
  vec2 cyl = vec2(cos(ang), sin(ang));
  float dust = fbm(vec2(cyl.x * 2.2 + lr * 1.5, cyl.y * 2.2 - lr * 0.8) + vec2(t * 0.03, 0.0));
  dust = smoothstep(0.3, 0.75, dust);

  // Spectrum lights the arms along the radius (bass inside, treble outside).
  float spec = spectrum(clamp(r * 1.4, 0.0, 1.0) * 0.9);
  float discFade = smoothstep(1.05, 0.15, r);
  float armLight = arms * (0.35 + dust * 1.2) * (0.6 + spec * 1.6 * uIntensity) * discFade * 1.6;

  // Stars: sparse hash sprites, dense along the arms, twinkling with treble.
  vec2 cell = floor(p * 90.0);
  vec2 cf = fract(p * 90.0) - 0.5;
  float h = hash12(cell);
  float star = smoothstep(0.955, 1.0, h) * (1.0 - smoothstep(0.0, 0.4, length(cf)));
  star *= (0.5 + arms * 1.2) * (0.6 + 0.4 * sin(t * 5.0 + h * 50.0)) * (0.7 + treb) * discFade * 1.4;

  // Core bulge.
  float core = exp(-r * r * (140.0 - bass * 50.0)) * (0.5 + bass * 0.9 + uOnset.x * 0.4);
  float halo = exp(-r * 6.0) * 0.3 * (0.5 + bass);

  float hue = fract(uColorHsl.x + lr * 0.04 + dust * 0.08);
  vec3 armCol = hsl2rgb(vec3(hue, 0.8, 0.55));
  vec3 dustCol = hsl2rgb(vec3(fract(hue + 0.08), 0.6, 0.35));
  vec3 hot = hsl2rgb(vec3(fract(uColorHsl.x + 0.05), 0.35, 0.95));

  vec3 rgb = mix(dustCol, armCol, spec) * armLight + hot * star + hot * core + armCol * halo;
  float alpha = armLight + star + core + halo;
  fragColor = outPremul(rgb, alpha);
}
`

export const glGalaxy = {
  id: 'glGalaxy',
  edgeFade: 'radial',
  name_de: 'Galaxie (GPU)',
  name_en: 'Galaxy (GPU)',
  frag,
  uniforms: () => ({ uArms: 2, uTwist: 4.5 }),
  fallback: spiralGalaxy,
}
