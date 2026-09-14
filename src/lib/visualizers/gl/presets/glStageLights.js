/**
 * GPU preset: Stage Lights – a truss of PAR cans shining down through fog.
 * Each lamp is tied to a band and sweeps with the mids; the bass drives the
 * beam intensity, onsets strobe the lamps, treble adds shimmer to the fog.
 * @module visualizers/gl/presets/glStageLights
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

  float lamps = clamp(uLamps, 2.0, 8.0);
  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Truss bar.
  float trussY = 0.42;
  float truss = 1.0 - smoothstep(0.012, 0.012 + 2.0 * aaPx, abs(p.y - trussY));
  vec3 trussCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.12));
  rgb += trussCol * truss;
  alpha += truss * 0.9;

  // Fog field.
  float fog = fbm(vec2(p.x * 2.0 + t * 0.15, p.y * 2.5 - t * 0.1));
  fog = 0.55 + 0.45 * fog;

  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi >= lamps) break;
    float k = (fi + 0.5) / lamps;
    vec2 src = vec2((k - 0.5) * aspect * 0.86, trussY - 0.02);
    float sx = k * 0.9;
    float level = spectrum(sx) * uIntensity;
    float strobe = (fi < lamps / 3.0) ? uOnset.x : (fi < lamps * 2.0 / 3.0 ? uOnset.y : uOnset.z);
    float power = clamp(0.12 + level * 1.2 + bass * 0.25 + strobe * 0.6, 0.0, 1.4);

    // Beam direction: mostly down, sweeping with the mids.
    float sweep = sin(t * (0.5 + fi * 0.13) + fi * 1.3) * (0.18 + mid * 0.35);
    vec2 dir = normalize(vec2(sweep, -1.0));
    vec2 rel = p - src;
    float along = dot(rel, dir);
    float side = dot(rel, vec2(-dir.y, dir.x));
    float spread = 0.09 + along * 0.32;          // cone widens with distance
    float beam = (1.0 - smoothstep(spread * 0.6, spread, abs(side))) * step(0.0, along);
    beam *= exp(-along * 1.6) * fog;             // fades into the fog
    beam *= power;

    // Lamp body and lens flare.
    float d = length(rel);
    float lens = 1.0 - smoothstep(0.018, 0.02, d);
    float flare = exp(-d * d * 900.0) * power * 1.2 + exp(-d * 25.0) * power * 0.4;
    float body = 1.0 - smoothstep(0.03, 0.032, length(rel - vec2(0.0, 0.012)));

    // Floor spot where the beam lands.
    float floorY = -0.48;
    float tf = (floorY - src.y) / dir.y;
    vec2 hit = src + dir * tf;
    float spot = exp(-dot(p - hit, p - hit) * 60.0) * power * smoothstep(-0.3, floorY, p.y) * 0.6;

    float hue = fract(uColorHsl.x + k * 0.6);
    vec3 col = hsl2rgb(vec3(hue, 0.9, 0.55));
    vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.95));
    vec3 bodyCol = hsl2rgb(vec3(uColorHsl.x, 0.15, 0.1));

    rgb += bodyCol * body * (1.0 - lens) + col * beam * 0.8 + hot * (flare + lens * power * 0.8) + col * spot;
    alpha += body * 0.9 + beam * 0.8 + flare + lens + spot;
  }

  // Treble shimmer in the fog.
  float shimmer = smoothstep(0.7, 1.0, vnoise(p * 60.0 + t * 3.0)) * treb * 0.15 * smoothstep(0.42, -0.5, p.y);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.5, 0.8)) * shimmer;
  alpha += shimmer;

  fragColor = outPremul(rgb, alpha);
}
`

export const glStageLights = {
  id: 'glStageLights',
  name_de: 'Bühnen-Scheinwerfer (GPU)',
  name_en: 'Stage Lights (GPU)',
  frag,
  uniforms: () => ({ uLamps: 6 }),
  fallback: lightBeams,
}
