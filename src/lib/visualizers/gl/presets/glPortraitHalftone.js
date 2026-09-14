/**
 * GPU preset: Halftone Portrait – print-style dot screen in the base colour.
 * Dot size follows the image brightness and the bass, the screen angle drifts
 * slowly, onsets flash the highlights.
 * @module visualizers/gl/presets/glPortraitHalftone
 */

const frag = /* glsl */ `
uniform float uCells;

void main() {
  if (uHasImage < 0.5) { fragColor = noImagePlaceholder(); return; }
  float t = uTime;
  float bass = uBands.x;
  float aspect = uResolution.x / uResolution.y;

  // Rotated screen.
  float ang = 0.26 + sin(t * 0.1) * 0.03;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  vec2 q = rot2(ang) * p * uCells;
  vec2 id = floor(q);
  vec2 cf = fract(q) - 0.5;
  vec2 centreP = rot2(-ang) * ((id + 0.5) / uCells);
  vec2 centreUv = centreP / vec2(aspect, 1.0) + 0.5;

  vec4 c = img(centreUv);
  float l = luma(c.rgb);
  float band = spectrum(clamp(centreUv.y, 0.0, 1.0) * 0.9);
  // Print logic: dark image areas get the big ink dots.
  float ink = 1.0 - l;
  float size = (0.04 + ink * 0.5) * (0.9 + bass * 0.25 + band * 0.15 * uIntensity + uOnset.w * 0.15);
  float d = length(cf);
  float aa = uCells / uResolution.y * 1.2;
  float dot = 1.0 - smoothstep(size - aa, size + aa, d);

  vec3 inkCol = hsl2rgb(vec3(uColorHsl.x, 0.75, 0.32));
  vec3 deep = hsl2rgb(vec3(uColorHsl.x, 0.8, 0.14));
  vec3 col = mix(inkCol, deep, smoothstep(0.5, 1.0, ink));
  // A whisper of the original colour keeps skin tones alive.
  col = mix(col, c.rgb * 0.6, 0.2 * (1.0 - ink));
  // Paper: opaque, slightly warm, pulsing a touch with the onset.
  vec3 paper = vec3(0.96, 0.95, 0.92) * (1.0 - uOnset.w * 0.06);
  vec3 rgb = mix(paper, col, dot);
  fragColor = vec4(rgb, 1.0);
}
`

export const glPortraitHalftone = {
  id: 'glPortraitHalftone',
  name_de: 'Halbton-Portrait (GPU)',
  name_en: 'Halftone Portrait (GPU)',
  needsImage: true,
  frag,
  uniforms: () => ({ uCells: 70 }),
}
