/**
 * GPU preset: Disco Ball – a rotating mirror ball with facets that catch two
 * moving lights; the treble sets off star sparkles on the facets, the bass
 * swings the ball, and reflections sweep around it on the walls.
 * @module visualizers/gl/presets/glDiscoBall
 */

import { circles } from '../../geometric/circles.js'

const frag = /* glsl */ `
uniform float uFacets;
uniform float uRadius;

vec3 sphereNormal(vec2 lp, float R) {
  float d2 = dot(lp, lp) / (R * R);
  return vec3(lp / R, sqrt(max(1.0 - d2, 0.0)));
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float treb = uBands.z;
  float vol = uBands.w;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float R = uRadius * (1.0 + bass * 0.03);
  vec2 centre = vec2(sin(t * 0.7) * 0.02 * bass, 0.05);
  vec2 lp = p - centre;
  float r = length(lp);

  // Chain.
  float chain = (1.0 - smoothstep(0.003, 0.003 + aaPx, abs(lp.x))) * step(R, lp.y) * 0.8;
  rgb += vec3(0.5) * chain;
  alpha += chain;

  // Wall reflections: small bright squares orbiting the ball.
  {
    float ang = atan(lp.y, lp.x) / TAU + 0.5 + t * 0.05;
    float lr = log(max(r, R * 1.05));
    vec2 cc = vec2(ang * 40.0, lr * 9.0);
    vec2 id = floor(cc);
    vec2 cf = fract(cc) - 0.5;
    float h = hash12(id);
    float h2 = hash12(id + 7.0);
    float twinkle = 0.5 + 0.5 * sin(t * (2.0 + h2 * 4.0) + h * TAU);
    float on = step(0.7, h) * (0.3 + spectrum(h2 * 0.9) * 1.2 * uIntensity) * twinkle;
    vec2 q = abs(cf + (vec2(h, h2) - 0.5) * 0.4) - 0.1;
    float sq = 1.0 - smoothstep(0.0, 0.06, max(q.x, q.y));
    float refl = sq * on * step(R * 1.05, r) * smoothstep(1.6, 0.3, r);
    float hueR = fract(uColorHsl.x + h2 * 0.4);
    rgb += hsl2rgb(vec3(hueR, 0.6, 0.8)) * refl;
    alpha += refl;
  }

  // The ball.
  if (r < R + aaPx) {
    float disc = 1.0 - smoothstep(R - aaPx, R + aaPx, r);
    vec3 n = sphereNormal(lp, R);
    // Spin around the vertical axis, slight tilt.
    float spin = t * 0.45 + uOnset.w * 0.15;
    vec3 nr = n;
    nr.xz = rot2(spin) * nr.xz;
    nr.yz = rot2(0.25) * nr.yz;
    float lon = atan(nr.x, nr.z);
    float lat = asin(clamp(nr.y, -1.0, 1.0));
    float facets = max(12.0, uFacets);
    vec2 fid = floor(vec2(lon / TAU * facets, lat / PI * facets * 0.5));
    vec2 ff = fract(vec2(lon / TAU * facets, lat / PI * facets * 0.5));
    // Facet normal: reconstruct from the facet's centre angles, rotate back.
    float cl = (fid.x + 0.5) / facets * TAU;
    float ca = (fid.y + 0.5) / (facets * 0.5) * PI;
    vec3 fn = vec3(sin(cl) * cos(ca), sin(ca), cos(cl) * cos(ca));
    fn.yz = rot2(-0.25) * fn.yz;
    fn.xz = rot2(-spin) * fn.xz;
    float h = hash12(fid + 3.0);
    // Two moving lights and a viewer straight ahead.
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 L1 = normalize(vec3(sin(t * 0.6) * 0.8, 0.6, 0.7));
    vec3 L2 = normalize(vec3(-0.7, sin(t * 0.4) * 0.6, 0.6));
    float s1 = pow(max(dot(reflect(-L1, fn), V), 0.0), 60.0 + h * 40.0);
    float s2 = pow(max(dot(reflect(-L2, fn), V), 0.0), 60.0 + h * 40.0);
    float sparkle = step(0.985 - treb * 0.03, hash12(fid + floor(t * 6.0))) * treb * 1.5;
    float base = 0.18 + 0.12 * max(fn.z, 0.0) + h * 0.06;
    float grout = smoothstep(0.0, 0.08, ff.x) * smoothstep(0.0, 0.08, ff.y) * smoothstep(1.0, 0.92, ff.x) * smoothstep(1.0, 0.92, ff.y);
    float hueF = fract(uColorHsl.x + h * 0.2 + lon * 0.05);
    vec3 tint = hsl2rgb(vec3(hueF, 0.35, 0.75));
    vec3 col = tint * base + vec3(1.0) * (s1 + s2) * 1.2 + vec3(1.0, 0.97, 0.9) * sparkle;
    col *= grout * 0.85 + 0.15;
    col *= 0.7 + 0.3 * n.z;   // limb shading
    rgb = mix(rgb, col, disc);
    alpha = mix(alpha, 1.0, disc);
  }

  // Halo around the ball with the volume.
  float halo = exp(-max(r - R, 0.0) * 12.0) * (0.1 + vol * 0.3) * uIntensity * step(R, r);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.5, 0.8)) * halo;
  alpha += halo;

  fragColor = outPremul(rgb, alpha);
}
`

export const glDiscoBall = {
  id: 'glDiscoBall',
  name_de: 'Disco-Kugel (GPU)',
  name_en: 'Disco Ball (GPU)',
  frag,
  uniforms: () => ({ uFacets: 40, uRadius: 0.3 }),
  fallback: circles,
}
