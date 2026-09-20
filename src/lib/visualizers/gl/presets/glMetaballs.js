/**
 * GPU preset: Blobs – orbiting metaballs that merge and split, lit with a
 * glossy rim. Bass inflates them, each blob follows its own band, onsets pop
 * an extra blob in the centre.
 * @module visualizers/gl/presets/glMetaballs
 */

import { pulsingOrbs } from '../../effects/pulsingOrbs.js'

const frag = /* glsl */ `
uniform float uBlobs;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float treb = uBands.z;
  float t = uTime;

  float count = clamp(uBlobs, 2.0, 7.0);
  float field = 0.0;
  vec2 grad = vec2(0.0);
  float hueAcc = 0.0;

  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float k = fi / count;
    float band = spectrum(k * 0.9);
    float a = t * (0.3 + k * 0.35) * (mod(fi, 2.0) == 0.0 ? 1.0 : -1.0) + k * TAU;
    float rad = 0.18 + 0.16 * sin(t * 0.37 + fi * 2.1);
    vec2 c = vec2(cos(a), sin(a)) * rad;
    float rr = 0.07 + band * 0.08 * uIntensity + bass * 0.03;
    vec2 d = p - c;
    float d2 = dot(d, d) + 0.0004;
    float contrib = rr * rr / d2;
    field += contrib;
    grad += -2.0 * rr * rr * d / (d2 * d2);
    hueAcc += contrib * k;
  }
  // Onset blob in the centre.
  float rc = 0.05 + uOnset.w * 0.12;
  float dc2 = dot(p, p) + 0.0004;
  float cc = rc * rc / dc2;
  field += cc;
  grad += -2.0 * rc * rc * p / (dc2 * dc2);

  float iso = 1.0;
  float body = smoothstep(iso - 0.08, iso + 0.08, field);
  // Rim: the field slope near the iso surface gives a fake normal.
  vec2 n = normalize(grad + 1e-5);
  float edge = 1.0 - smoothstep(iso, iso + 0.9, field);      // 1 at the surface
  float rim = body * edge;
  vec3 lightDir = normalize(vec3(-0.5, 0.7, 0.6));
  float nz = sqrt(max(0.0, 1.0 - edge * edge));
  vec3 nrm = normalize(vec3(n * edge, nz));
  float diff = max(dot(nrm, lightDir), 0.0);
  float spec = pow(max(dot(reflect(-lightDir, nrm), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);

  float hueMix = hueAcc / max(field, 0.001);
  float hue = fract(uColorHsl.x + hueMix * 0.25);
  vec3 col = hsl2rgb(vec3(hue, 0.8, 0.5));
  vec3 hot = hsl2rgb(vec3(hue, 0.35, 0.95));

  float halo = smoothstep(0.35, iso, field) * (1.0 - body) * 0.35;
  vec3 rgb = col * body * (0.35 + diff * 0.7) + hot * (spec * 0.8 + rim * (0.35 + treb * 0.6)) * body + col * halo;
  float alpha = body + halo;
  fragColor = outPremul(rgb, alpha);
}
`

export const glMetaballs = {
  id: 'glMetaballs',
  edgeFade: 'rect',
  name_de: 'Blobs (GPU)',
  name_en: 'Blobs (GPU)',
  frag,
  uniforms: () => ({ uBlobs: 5 }),
  fallback: pulsingOrbs,
}
