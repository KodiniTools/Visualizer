/**
 * GPU preset: Disco Reflections – the room view: hundreds of light squares
 * thrown by a small ball at the top sweep across the walls in curved paths,
 * twinkling with the treble, denser with the volume, rushing on onsets.
 * @module visualizers/gl/presets/glDiscoReflections
 */

import { pixelFireworks } from '../../particle/pixelFireworks.js'

const frag = /* glsl */ `
uniform float uDensity;

vec4 layer(vec2 p, vec2 ball, float density, float spin, float scale, float hueOff, float t, float vol, float treb) {
  vec2 rel = p - ball;
  float r = length(rel);
  float ang = atan(rel.y, rel.x) / TAU + 0.5 + spin;
  float lr = log(max(r, 0.05));
  vec2 cc = vec2(ang * density, lr * density * 0.22) * scale;
  vec2 id = floor(cc);
  vec2 cf = fract(cc) - 0.5;
  float h = hash12(id + hueOff * 31.0);
  float h2 = hash12(id * 1.7 + 9.0);
  float h3 = hash12(id * 2.3 + 4.0);
  float twinkle = 0.55 + 0.45 * sin(t * (1.5 + h3 * 5.0) + h * TAU);
  float lit = step(0.72 - vol * 0.15, h) * (0.3 + spectrum(h2 * 0.9) * 1.1 * uIntensity) * twinkle;
  // Squares stretch with distance like real reflections on a wall.
  vec2 sz = vec2(0.09, 0.09 + r * 0.06);
  vec2 q = abs(cf + (vec2(h2, h3) - 0.5) * 0.5) - sz;
  float sq = (1.0 - smoothstep(0.0, 0.05, max(q.x, q.y)));
  float glow = exp(-max(max(q.x, q.y), 0.0) * 18.0) * 0.4;
  float v = (sq + glow) * lit * smoothstep(0.08, 0.3, r) * smoothstep(2.0, 0.5, r);
  float hue = fract(uColorHsl.x + hueOff + h2 * 0.35);
  vec3 col = hsl2rgb(vec3(hue, 0.55, 0.82));
  col = mix(col, vec3(1.0), treb * 0.4 * sq);
  return vec4(col * v, v);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float treb = uBands.z;
  float vol = uBands.w;

  vec2 ball = vec2(0.0, 0.42);
  float spin = t * (0.03 + bass * 0.03) + uOnset.w * 0.06;

  vec4 a = layer(p, ball, uDensity, spin, 1.0, 0.0, t, vol, treb);
  vec4 b = layer(p, ball, uDensity * 0.7, -spin * 0.6, 1.3, 0.33, t, vol, treb);
  vec4 c = layer(p, ball, uDensity * 1.4, spin * 1.4, 0.8, 0.66, t, vol, treb);
  vec3 rgb = a.rgb + b.rgb * 0.7 + c.rgb * 0.6;
  float alpha = a.a + b.a * 0.7 + c.a * 0.6;

  // Small ball at the top.
  float r = length(p - ball);
  vec4 mb = miniMirrorBall(p - ball, 0.045, aaPx, t, treb);
  float disc = mb.a;
  rgb = mix(rgb, mb.rgb, disc);
  alpha = mix(alpha, 1.0, disc);
  float chain = (1.0 - smoothstep(0.003, 0.003 + aaPx, abs(p.x))) * step(ball.y + 0.045, p.y) * 0.8;
  rgb += vec3(0.5) * chain;
  alpha += chain;

  fragColor = outPremul(rgb, alpha);
}
`

export const glDiscoReflections = {
  id: 'glDiscoReflections',
  name_de: 'Disco-Reflexe (GPU)',
  name_en: 'Disco Reflections (GPU)',
  frag,
  uniforms: () => ({ uDensity: 48 }),
  fallback: pixelFireworks,
}
