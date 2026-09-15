/**
 * GPU preset: Footlights – a row of lamps along the stage edge at the bottom,
 * shining upward through fog. Each lamp is a band, the bass drives the
 * intensity, the mids fan the beams, onsets strobe, treble shimmers.
 * @module visualizers/gl/presets/glFootlights
 */

import { lightBeams } from '../../effects/lightBeams.js'

const frag = /* glsl */ `
uniform float uLamps;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float lamps = clamp(uLamps, 3.0, 10.0);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Stage edge.
  float edgeY = -0.44;
  float edge = 1.0 - smoothstep(0.0, 2.0 * aaPx, abs(p.y - edgeY - 0.012) - 0.012);
  vec3 bodyCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.1));
  rgb += bodyCol * edge * 0.8;
  alpha += edge * 0.9;

  float fog = 0.55 + 0.45 * fbm(vec2(p.x * 2.2 + t * 0.1, p.y * 2.0 - t * 0.15));

  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    if (fi >= lamps) break;
    float k = (fi + 0.5) / lamps;
    vec2 src = vec2((k - 0.5) * aspect * 0.9, edgeY + 0.02);
    float sx = abs(k * 2.0 - 1.0) * 0.85;
    float level = spectrum(sx) * uIntensity;
    float strobe = sx < 0.3 ? uOnset.x : (sx < 0.6 ? uOnset.y : uOnset.z);
    float power = clamp(0.1 + level * 1.2 + bass * 0.3 + strobe * 0.6, 0.0, 1.4);

    // Fan: outer lamps lean outward, all sway with the mids.
    float lean = (k - 0.5) * (0.5 + mid * 0.6) + sin(t * 0.7 + fi) * 0.08 * mid;
    vec2 dir = normalize(vec2(lean, 1.0));
    float beam = spotBeam(p, src, dir, 0.28, 1.1, fog) * power;

    float hue = fract(uColorHsl.x + k * 0.5);
    vec3 col = hsl2rgb(vec3(hue, 0.9, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.95));
    vec4 lamp = spotLamp(p, src, power, hot, bodyCol);
    rgb += col * beam * 0.85 + lamp.rgb;
    alpha += beam * 0.85 + lamp.a;
  }

  // Ceiling wash where the beams gather, and treble shimmer in the fog.
  float wash = smoothstep(0.1, 0.5, p.y) * bass * 0.15 * uIntensity;
  float shimmer = smoothstep(0.7, 1.0, vnoise(p * 60.0 + t * 3.0)) * treb * 0.15 * smoothstep(edgeY, 0.5, p.y);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.6, 0.6)) * (wash + shimmer);
  alpha += wash + shimmer;

  fragColor = outPremul(rgb, alpha);
}
`

export const glFootlights = {
  id: 'glFootlights',
  name_de: 'Rampenlicht (GPU)',
  name_en: 'Footlights (GPU)',
  frag,
  uniforms: () => ({ uLamps: 7 }),
  fallback: lightBeams,
}
