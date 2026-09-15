/**
 * GPU preset: Disco Rays – a mirror ball throwing soft rotating light rays
 * into the haze. Ray count follows the mids, rays brighten with their band,
 * the bass pumps the ball, onsets flash a ring of sparkles off the facets.
 * @module visualizers/gl/presets/glDiscoRays
 */

import { lightBeams } from '../../effects/lightBeams.js'

const frag = /* glsl */ `
uniform float uRays;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float r = length(p);
  float ang = atan(p.y, p.x);
  float R = 0.12 + bass * 0.01;
  float haze = 0.6 + 0.4 * fbm(vec2(ang * 2.0 + t * 0.1, r * 3.0 - t * 0.2));

  // Rotating rays: soft wedges, each tied to a band.
  float rays = clamp(uRays, 6.0, 32.0);
  float spin = t * 0.25 + uOnset.w * 0.3;
  float a01 = fract((ang + spin) / TAU);
  float ri = floor(a01 * rays);
  float rf = fract(a01 * rays) - 0.5;
  float h = hash12(vec2(ri, 1.0));
  float band = spectrum(fract(h * 0.9)) * uIntensity;
  float isOn = step(0.35 - mid * 0.25, h);
  float wedge = 1.0 - smoothstep(0.18, 0.5, abs(rf) * (1.0 + r * 1.5));
  float ray = wedge * isOn * exp(-max(r - R, 0.0) * 1.6) * (0.25 + band * 1.1) * haze * step(R, r);
  float hue = fract(uColorHsl.x + h * 0.5);
  vec3 col = hsl2rgb(vec3(hue, 0.6, 0.7));
  rgb += col * ray;
  alpha += ray;

  // Sparkle ring on onsets: bright dots flying out from the ball.
  float ringR = R + fract(t * 1.2) * 0.8;
  float dotsA = fract(a01 * 48.0) - 0.5;
  float dotR = abs(r - ringR);
  float dots = (1.0 - smoothstep(0.0, 0.012, length(vec2(dotsA * r * TAU / 48.0, dotR)))) * uOnset.w * step(0.4, hash12(vec2(floor(a01 * 48.0), floor(t * 1.2))));
  rgb += vec3(1.0) * dots;
  alpha += dots;

  // The ball.
  vec4 mb = miniMirrorBall(p, R, aaPx, t, treb);
  float disc = mb.a;
  rgb = mix(rgb, mb.rgb, disc);
  alpha = mix(alpha, 1.0, disc);
  float chain = (1.0 - smoothstep(0.003, 0.003 + aaPx, abs(p.x))) * step(R, p.y) * 0.8;
  rgb += vec3(0.5) * chain;
  alpha += chain;

  fragColor = outPremul(rgb, alpha);
}
`

export const glDiscoRays = {
  id: 'glDiscoRays',
  name_de: 'Disco-Strahlen (GPU)',
  name_en: 'Disco Rays (GPU)',
  frag,
  uniforms: () => ({ uRays: 20 }),
  fallback: lightBeams,
}
