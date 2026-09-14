/**
 * GPU preset: Glitch Portrait – RGB split, sliced row displacement, block
 * corruption and scanlines on the image. Onsets trigger the slices, treble
 * drives the colour split, bass zooms the frame.
 * @module visualizers/gl/presets/glPortraitGlitch
 */

const frag = /* glsl */ `
uniform float uAmount;

void main() {
  if (uHasImage < 0.5) { fragColor = noImagePlaceholder(); return; }
  float t = uTime;
  float bass = uBands.x;
  float treb = uBands.z;
  float onset = max(uOnset.w, uOnset.x);
  float amt = uAmount * uIntensity;

  vec2 uv = vUv;
  // Bass zoom around the centre.
  uv = (uv - 0.5) * (1.0 - bass * 0.05 * amt) + 0.5;

  // Row slices: a few bands per beat shift sideways.
  float step1 = floor(t * 12.0);
  float rowId = floor(uv.y * 24.0);
  float h = hash12(vec2(rowId, step1));
  float slice = step(1.0 - 0.15 * amt - onset * 0.5, h) * (hash12(vec2(rowId * 3.1, step1)) - 0.5) * 0.12 * (0.4 + onset);
  uv.x += slice;

  // Block corruption on strong onsets.
  vec2 blockId = floor(uv * vec2(12.0, 8.0));
  float bh = hash12(blockId + step1 * 7.0);
  float block = step(0.985 - onset * 0.08, bh);
  uv += (vec2(hash12(blockId + 1.0), hash12(blockId + 2.0)) - 0.5) * 0.08 * block;

  // RGB split.
  float split = (0.002 + treb * 0.01 + onset * 0.01) * amt;
  vec2 dir = vec2(1.0, 0.3);
  float r = img(uv + dir * split).r;
  float g = img(uv).g;
  float b = img(uv - dir * split).b;
  vec3 col = vec3(r, g, b);

  // Scanlines and a rolling bar.
  float scan = 0.92 + 0.08 * sin(uv.y * uResolution.y * 1.5);
  float bar = smoothstep(0.02, 0.0, abs(fract(uv.y - t * 0.15) - 0.5)) * 0.15;
  col = col * scan + bar;

  // Tint towards the base colour on blocks.
  vec3 tint = hsl2rgb(vec3(uColorHsl.x, 0.8, 0.6));
  col = mix(col, tint * luma(col) * 1.5, block * 0.7);

  fragColor = outPremul(col, 1.0);
}
`

export const glPortraitGlitch = {
  id: 'glPortraitGlitch',
  name_de: 'Glitch-Portrait (GPU)',
  name_en: 'Glitch Portrait (GPU)',
  needsImage: true,
  frag,
  uniforms: () => ({ uAmount: 1.0 }),
}
