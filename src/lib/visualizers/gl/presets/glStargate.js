/**
 * GPU preset: Stargate – concentric rings of glowing segments, each ring tied
 * to a frequency band and rotating at its own speed and direction; segments
 * light up with their band, the whole gate pulses on the bass. Sci-fi HUD.
 * @module visualizers/gl/presets/glStargate
 */

import { orbitingLight } from '../../effects/orbitingLight.js'

const frag = /* glsl */ `
uniform float uRings;

void main() {
  vec2 p = centeredFit(0.5); // Querformat: identisch, Hochformat: passt in die Breite
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  float r = length(p);
  float ang = atan(p.y, p.x);
  float aaPx = 1.0 / uResolution.y;

  float rings = clamp(uRings, 3.0, 12.0);
  float rIn = 0.07;
  float rOut = 0.45 + bass * 0.03 + uOnset.x * 0.02; // bleibt auch bei Bass-Peak <= 0.5
  float band = (r - rIn) / (rOut - rIn);          // 0 inner .. 1 outer

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  if (band > 0.0 && band < 1.0) {
    float ri = floor(band * rings);
    float rf = fract(band * rings);               // position inside the ring band
    float k = (ri + 0.5) / rings;

    // Each ring: own segment count, speed and direction.
    float segs = 6.0 + ri * 4.0;
    float dir = mod(ri, 2.0) == 0.0 ? 1.0 : -1.0;
    float spin = t * dir * (0.15 + ri * 0.04) + uOnset.w * dir * 0.2;
    float a01 = fract(ang / TAU + spin);
    float si = floor(a01 * segs);
    float sf = fract(a01 * segs);

    // Segment lit by its ring's band; a hashed subset stays dark for structure.
    float e = spectrum(k * 0.9);
    float gate = step(0.28, hash12(vec2(si, ri) + floor(t * 0.5) * 0.0));
    float lit = smoothstep(0.08, 0.7, e * uIntensity) * gate;
    // Travelling highlight around each ring.
    float sweep = smoothstep(0.85, 1.0, fract(a01 - t * dir * 0.3)) * 0.6;

    // Geometry: radial gap between rings, angular gap between segments.
    float ringMask = smoothstep(0.12, 0.2, rf) * (1.0 - smoothstep(0.8, 0.88, rf));
    float gapPx = (0.5 - abs(sf - 0.5)) * r * TAU / segs / aaPx;   // px from segment edge
    float segMask = smoothstep(1.0, 3.0, gapPx);
    float body = ringMask * segMask;

    float hue = fract(uColorHsl.x + k * 0.3);
    vec3 col = hsl2rgb(vec3(hue, 0.85, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.95));
    vec3 dim = hsl2rgb(vec3(hue, 0.6, 0.22));

    rgb += mix(dim, col, lit) * body + hot * (lit * 0.5 + sweep) * body;
    alpha += body * (0.35 + lit * 0.65) + sweep * body;

    // Thin guide circles between rings.
    float guide = 1.0 - smoothstep(0.0, 1.5 * aaPx, abs(rf - 0.05) * (rOut - rIn) / rings);
    rgb += col * guide * 0.25;
    alpha += guide * 0.25;
  }

  // Outer glow and inner reticle.
  float outerGlow = exp(-max(r - rOut, 0.0) * 14.0) * (0.15 + bass * 0.4) * step(rOut, r);
  outerGlow *= 1.0 - smoothstep(rOut, 0.5, r); // Glow endet an der kurzen Kante
  float core = exp(-r * r / (rIn * rIn * 0.6)) * (0.3 + bass * 0.8);
  float reticle = (1.0 - smoothstep(0.0, 1.5 * aaPx, abs(r - rIn * 0.8))) * 0.6;
  reticle += (1.0 - smoothstep(0.0, 1.2 * aaPx, min(abs(p.x), abs(p.y)))) * step(r, rIn * 0.7) * 0.4 * (0.5 + treb);
  vec3 base = hsl2rgb(vec3(uColorHsl.x, 0.8, 0.55));
  vec3 hotC = hsl2rgb(vec3(uColorHsl.x, 0.35, 0.95));
  rgb += base * outerGlow + hotC * (core + reticle);
  alpha += outerGlow + core + reticle;

  fragColor = outPremul(rgb, alpha);
}
`

export const glStargate = {
  id: 'glStargate',
  name_de: 'Sternentor (GPU)',
  name_en: 'Stargate (GPU)',
  frag,
  uniforms: () => ({ uRings: 7 }),
  fallback: orbitingLight,
}
