/**
 * GPU preset: Neon Grid – synthwave perspective floor with a striped sun and
 * a glowing horizon. Grid lines pulse with the bass, the sun breathes with
 * the volume. Successor of synthWave / neonGrid / hexagonGrid.
 * @module visualizers/gl/presets/glNeonGrid
 */

import { synthWave } from '../../retro/synthWave.js'

const frag = /* glsl */ `
uniform float uHorizon;    // horizon height (0..1)
uniform float uGridScale;

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  float bass = uBands.x;
  float mid = uBands.y;
  float vol = uBands.w;
  float t = uTime;

  float hue = uColorHsl.x;
  vec3 col = hsl2rgb(vec3(hue, 0.9, 0.55));
  vec3 col2 = hsl2rgb(vec3(fract(hue + 0.12), 0.9, 0.6));
  vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.9));

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  float horizon = uHorizon;
  float below = horizon - uv.y;
  if (below > 0.0) {
    // Perspective floor.
    float z = 1.0 / max(below, 0.002);
    float speed = 1.5 + bass * 3.0 + uOnset.x * 2.0;
    float fz = z * 0.12 * uGridScale + t * speed;
    float fx = (uv.x - 0.5) * aspect * z * 0.5 * uGridScale;

    // Spectrum lifts the vertical lines like a bar spectrum along x.
    float lineX = abs(fract(fx) - 0.5);
    float lineZ = abs(fract(fz) - 0.5);
    float fade = smoothstep(0.0, 0.25, below);           // fade near horizon
    float gx = 1.0 - smoothstep(0.0, 0.035 * (1.0 + bass * 1.5), lineX * (0.6 + below * 2.0));
    float gz = 1.0 - smoothstep(0.0, 0.05 * (1.0 + bass * 1.5), lineZ * (0.6 + below * 3.0));
    gx *= smoothstep(0.02, 0.16, below);
    float grid = max(gx, gz) * fade;

    // Spectrum "wall" bumps at the far end.
    float spec = spectrum(abs(uv.x * 2.0 - 1.0) * 0.8);
    float bump = smoothstep(0.08 + spec * 0.12, 0.0, below) * spec * 0.8;

    rgb += mix(col, col2, fract(fz) * 0.5) * grid * (0.7 + bass * 0.6);
    rgb += hot * bump;
    alpha += grid + bump;

    // Floor glow near the horizon.
    float floorGlow = exp(-below * 18.0) * 0.35;
    rgb += col * floorGlow;
    alpha += floorGlow;
  } else {
    // Sun above the horizon.
    float sunR = 0.16 + vol * 0.05 + uOnset.w * 0.03;
    vec2 sp = vec2((uv.x - 0.5) * aspect, uv.y - horizon - sunR * 0.75);
    float d = length(sp);
    float disc = 1.0 - smoothstep(sunR - 0.004, sunR + 0.004, d);
    // Horizontal stripes, denser towards the bottom of the sun.
    float stripes = smoothstep(0.35, 0.6, sin((sp.y + t * 0.05) * (70.0 + mid * 30.0)) * 0.5 + 0.5);
    float cut = smoothstep(0.0, -sunR * 0.9, sp.y);
    disc *= 1.0 - stripes * cut;
    vec3 sunCol = mix(hot, col2, clamp((sp.y + sunR) / (2.0 * sunR), 0.0, 1.0));
    float sunGlow = exp(-max(d - sunR, 0.0) * 12.0) * 0.4 * (0.6 + vol);
    rgb += sunCol * disc + col2 * sunGlow;
    alpha += disc + sunGlow;

    // Horizon glow.
    float hg = exp(-(uv.y - horizon) * 20.0) * 0.5;
    rgb += col * hg;
    alpha += hg;
  }

  rgb *= 0.6 + 0.4 * uIntensity;
  alpha *= 0.6 + 0.4 * uIntensity;
  fragColor = outPremul(rgb, alpha);
}
`

export const glNeonGrid = {
  id: 'glNeonGrid',
  name_de: 'Neon-Grid (GPU)',
  name_en: 'Neon Grid (GPU)',
  frag,
  uniforms: () => ({ uHorizon: 0.5, uGridScale: 1.0 }),
  fallback: synthWave,
}
