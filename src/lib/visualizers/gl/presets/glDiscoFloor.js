/**
 * GPU preset: Disco Floor – the illuminated dance floor in perspective.
 * Tiles switch colours on the beat, each tile follows a band, the bass lifts
 * the brightness, a glossy sheen runs across, and a mirror ball hangs above.
 * @module visualizers/gl/presets/glDiscoFloor
 */

import { arcadeBlocks } from '../../retro/arcadeBlocks.js'

const frag = /* glsl */ `
uniform float uTiles;
uniform float uHorizon;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float treb = uBands.z;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float horizon = uHorizon;
  float below = horizon - p.y;

  if (below > 0.0) {
    float z = 1.0 / max(below, 0.003);
    vec2 world = vec2(p.x * z, z) * uTiles * 0.12;
    vec2 id = floor(world);
    vec2 f = fract(world);
    // Beat clock: tiles re-roll their colour on onsets, otherwise slowly.
    float clock = floor(t * 1.5 + uOnset.w * 2.5);
    float h = hash12(id + clock * 3.7);
    float h2 = hash12(id * 1.3 + 2.0);
    float band = spectrum(h2 * 0.9) * uIntensity;
    float lit = 0.35 + band * 0.8 + bass * 0.2 + step(0.85, h) * 0.5;
    float hue = fract(uColorHsl.x + h * 1.0);
    vec3 col = hsl2rgb(vec3(hue, 0.9, 0.5));
    vec3 hot = hsl2rgb(vec3(hue, 0.5, 0.85));
    // Grout lines, thinner with distance.
    float g = 0.05 * (1.0 + z * 0.02);
    float grout = smoothstep(0.0, g, f.x) * smoothstep(0.0, g, f.y) * smoothstep(1.0, 1.0 - g, f.x) * smoothstep(1.0, 1.0 - g, f.y);
    // Gloss sheen sweeping across.
    float sheen = exp(-abs(f.x + f.y - 1.0 - sin(t * 0.8) * 0.6) * 4.0) * 0.25;
    float fade = smoothstep(0.0, 0.25, below);
    vec3 tile = mix(col, hot, sheen) * lit * grout;
    rgb += tile * fade;
    alpha += fade * (0.6 + 0.4 * grout);
    // Reflection glow near the horizon.
    float hz = exp(-below * 10.0) * 0.3;
    rgb += hsl2rgb(vec3(uColorHsl.x, 0.6, 0.6)) * hz;
    alpha += hz;
  } else {
    // Mirror ball above the floor with a few reflections around it.
    vec2 ball = vec2(0.0, horizon + 0.28);
    float r = length(p - ball);
    float R = 0.07 + bass * 0.005;
    vec4 mb = miniMirrorBall(p - ball, R, aaPx, t, treb);
    float disc = mb.a;
    rgb += mb.rgb * disc;
    alpha += disc;
    float chain = (1.0 - smoothstep(0.003, 0.003 + aaPx, abs(p.x))) * step(ball.y + R, p.y) * 0.8;
    rgb += vec3(0.5) * chain;
    alpha += chain;
    // Sparkle reflections on the back wall.
    vec2 cell = floor(p * 26.0);
    float hs = hash12(cell + floor(t * 3.0) * 0.0);
    float tw = 0.5 + 0.5 * sin(t * 3.0 + hs * 40.0);
    float spark = step(0.93, hs) * tw * (0.3 + treb) * (1.0 - smoothstep(0.0, 0.3, length(fract(p * 26.0) - 0.5)));
    rgb += hsl2rgb(vec3(fract(uColorHsl.x + hs * 0.3), 0.5, 0.85)) * spark * 0.8;
    alpha += spark * 0.8;
  }

  fragColor = outPremul(rgb, alpha);
}
`

export const glDiscoFloor = {
  id: 'glDiscoFloor',
  name_de: 'Disco-Tanzboden (GPU)',
  name_en: 'Disco Floor (GPU)',
  frag,
  uniforms: () => ({ uTiles: 6, uHorizon: 0.1 }),
  fallback: arcadeBlocks,
}
