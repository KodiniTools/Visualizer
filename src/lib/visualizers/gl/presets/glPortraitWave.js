/**
 * GPU preset: Sound-Wave Portrait – the image is displaced by the spectrum:
 * bass bulges it from the centre, mids roll waves across it, treble ripples
 * fine detail, with a light chromatic fringe on the displacement.
 * @module visualizers/gl/presets/glPortraitWave
 */

const frag = /* glsl */ `
uniform float uAmount;

void main() {
  if (uHasImage < 0.5) { fragColor = noImagePlaceholder(); return; }
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float amt = uAmount * uIntensity;

  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float r = length(p);

  // Bass bulge from the centre.
  float bulge = (bass * 0.12 + uOnset.x * 0.08) * amt;
  uv = (uv - 0.5) * (1.0 - bulge * exp(-r * r * 3.0)) + 0.5;

  // Spectrum-shaped horizontal waves: each row is displaced by its band.
  float band = spectrum(abs(uv.y * 2.0 - 1.0) * 0.9);
  float wave = sin(uv.y * 28.0 + t * 3.0) * band * 0.03 * amt * (0.3 + mid);
  float ripple = sin(uv.y * 140.0 - t * 12.0) * treb * 0.004 * amt;
  uv.x += wave + ripple;

  // Chromatic fringe along the displacement.
  float fringe = abs(wave) * 0.6 + abs(ripple) * 2.0;
  vec3 col = vec3(img(uv + vec2(fringe, 0.0)).r, img(uv).g, img(uv - vec2(fringe, 0.0)).b);

  // Bass-driven glow in the base colour where the image is bright.
  vec3 tint = hsl2rgb(vec3(uColorHsl.x, 0.7, 0.55));
  col += tint * luma(col) * bass * 0.25 * amt;

  fragColor = outPremul(col, 1.0);
}
`

export const glPortraitWave = {
  id: 'glPortraitWave',
  name_de: 'Schallwellen-Portrait (GPU)',
  name_en: 'Sound-Wave Portrait (GPU)',
  needsImage: true,
  frag,
  uniforms: () => ({ uAmount: 1.0 }),
}
