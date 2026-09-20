/**
 * GPU preset: Mandala – kaleidoscopic, domain-warped noise field with
 * spectrum-driven rings and a bass-driven core. Covers the ground of
 * geometricKaleidoscope / bloomingMandala / the blossom visualizers.
 * @module visualizers/gl/presets/glMandala
 */

import { bloomingMandala } from '../../organic/bloomingMandala.js'

const frag = /* glsl */ `
uniform float uSegments;  // kaleidoscope symmetry
uniform float uHueSpread; // hue variation across the field

void main() {
  // Die ganze Figur (Vignette endet bei r = 0.85) passt in die kurze Kante.
  vec2 p = centeredFit(0.85);
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float t = uTime;

  float r = length(p);
  float ang = atan(p.y, p.x) + t * 0.12 + uOnset.w * 0.35;

  // Kaleidoscope fold.
  float seg = TAU / max(2.0, uSegments);
  float a = mod(ang, seg);
  a = abs(a - seg * 0.5);
  vec2 q = vec2(cos(a), sin(a)) * r;

  // Domain-warped noise, breathing with the bass.
  float zoom = 1.0 + bass * 0.35 * uIntensity;
  vec2 w = q * (3.2 / zoom);
  float n1 = fbm(w + vec2(t * 0.18, -t * 0.11));
  float n2 = fbm(w * 1.8 - vec2(n1 * 1.6, t * 0.15));

  // Spectrum rings: radius → frequency.
  float spec = spectrum(clamp(r * 1.5, 0.0, 1.0));
  float rings = sin(r * (34.0 + 10.0 * mid) - t * 2.4 + spec * 7.0 + n2 * 2.0) * 0.5 + 0.5;
  rings = smoothstep(0.55, 1.0, rings) * (0.25 + spec * 1.4);

  // Petals along the folded angle.
  float petal = sin(a * 12.0 + r * (9.0 + 5.0 * mid) - t * 1.6 + n1 * 3.0) * 0.5 + 0.5;
  petal = smoothstep(0.55, 0.95, petal) * (0.3 + 0.7 * smoothstep(0.0, 0.5, mid + spec));

  // Ambient noise stays faint so the background remains visible.
  float ambient = n2 * n2 * 0.22 * smoothstep(0.9, 0.3, r);
  float field = petal * 0.6 + rings * 0.65 + ambient;
  field *= smoothstep(0.85, 0.2, r);       // vignette towards the edge
  field *= 0.5 + 0.5 * uIntensity;

  // Treble sparkle on the fine structure.
  float sparkle = smoothstep(0.75, 1.0, n2) * treb * 0.9;

  float hue = fract(uColorHsl.x + n2 * uHueSpread + r * 0.12 - t * 0.01);
  vec3 col = hsl2rgb(vec3(hue, clamp(uColorHsl.y + 0.15, 0.55, 1.0), 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.6, 0.85));

  // Bass core.
  float core = exp(-r * r * (22.0 - 12.0 * bass)) * (0.35 + bass * 1.1);

  vec3 rgb = col * field + hot * sparkle + vec3(1.0, 0.96, 0.9) * core * 0.9;
  float alpha = clamp(field * 0.95 + sparkle + core, 0.0, 1.0);
  fragColor = outPremul(rgb, alpha);
}
`

export const glMandala = {
  id: 'glMandala',
  name_de: 'Mandala (GPU)',
  name_en: 'Mandala (GPU)',
  frag,
  uniforms: () => ({
    uSegments: 8,
    uHueSpread: 0.22,
  }),
  fallback: bloomingMandala,
}
