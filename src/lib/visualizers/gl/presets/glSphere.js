/**
 * GPU preset: Audio Sphere – a raymarched sphere whose surface is displaced
 * by the spectrum, lit with diffuse, specular and rim light. Bass inflates
 * it, onsets spike it. Successor of rainbowCube / the 3D-objects category.
 * @module visualizers/gl/presets/glSphere
 */

import { rainbowCube } from '../../geometric/rainbowCube.js'

const frag = /* glsl */ `
uniform float uRadius;
uniform float uDisplace;

float displacement(vec3 n, float t) {
  // Latitude → frequency (bass at the equator), longitude ripples.
  float lat = abs(n.y);
  float lon = atan(n.z, n.x) / TAU + 0.5;
  // 16 wide bands with smooth (C1) interpolation, so neither single bins nor
  // sampling kinks carve rings into the surface.
  float bands = 16.0;
  float bi = lat * 0.85 * bands;
  float b0 = floor(bi);
  float bf = smoothstep(0.0, 1.0, bi - b0);
  float s = mix(spectrum((b0 + 0.5) / bands), spectrum((b0 + 1.5) / bands), bf);
  float ripple = sin(lon * TAU * 6.0 + t * 2.0) * 0.5 + 0.5;
  float n1 = fbm(n.xy * 2.5 + vec2(t * 0.15, 0.0)) - 0.5;
  return s * uDisplace * (0.6 + 0.4 * ripple) + n1 * 0.035 + uOnset.x * 0.05 * s;
}

float map(vec3 p, float r, float t) {
  float d = length(p) - r;
  vec3 n = normalize(p);
  return d - displacement(n, t);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float t = uTime;
  float r = uRadius * (1.0 + bass * 0.18 + uOnset.x * 0.08);

  // Camera.
  vec3 ro = vec3(0.0, 0.0, 2.6);
  vec3 rd = normalize(vec3(p * 1.15, -1.7));
  mat2 rotY = rot2(t * 0.25);
  mat2 rotX = rot2(0.35 + sin(t * 0.2) * 0.15);

  // Ray-march.
  float dist = 0.0;
  float hit = 0.0;
  vec3 pos = ro;
  for (int i = 0; i < 80; i++) {
    pos = ro + rd * dist;
    vec3 q = pos;
    q.xz = rotY * q.xz;
    q.yz = rotX * q.yz;
    float d = map(q, r, t);
    if (d < 0.002) { hit = 1.0; break; }
    dist += d * 0.55;
    if (dist > 6.0) break;
  }

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float hue = uColorHsl.x;

  if (hit > 0.5) {
    vec3 q = pos;
    q.xz = rotY * q.xz;
    q.yz = rotX * q.yz;
    vec2 e = vec2(0.004, 0.0);
    vec3 nrm = normalize(vec3(
      map(q + e.xyy, r, t) - map(q - e.xyy, r, t),
      map(q + e.yxy, r, t) - map(q - e.yxy, r, t),
      map(q + e.yyx, r, t) - map(q - e.yyx, r, t)));
    // Back to view space for lighting.
    nrm.yz = rot2(-(0.35 + sin(t * 0.2) * 0.15)) * nrm.yz;
    nrm.xz = rot2(-t * 0.25) * nrm.xz;

    vec3 lightDir = normalize(vec3(0.6, 0.8, 0.9));
    float diff = max(dot(nrm, lightDir), 0.0);
    vec3 viewDir = normalize(ro - pos);
    vec3 h = normalize(lightDir + viewDir);
    float spec = pow(max(dot(nrm, h), 0.0), 48.0);
    float rim = pow(1.0 - max(dot(nrm, viewDir), 0.0), 2.5);
    float disp = displacement(normalize(q), t) / max(uDisplace, 0.001);

    vec3 base = hsl2rgb(vec3(fract(hue + disp * 0.18), 0.8, 0.5));
    vec3 hot = hsl2rgb(vec3(fract(hue + 0.05), 0.5, 0.9));
    rgb = base * (0.18 + diff * 0.9) + hot * spec * 0.9 + hot * rim * (0.5 + bass * 0.6);
    rgb *= 0.65 + 0.35 * uIntensity;
    alpha = 1.0;
  }

  // Outer glow around the silhouette.
  float rr = length(p);
  float glow = exp(-max(rr - r * 0.95, 0.0) * 6.0) * (0.15 + bass * 0.35) * (1.0 - hit);
  rgb += hsl2rgb(vec3(hue, 0.7, 0.6)) * glow;
  alpha += glow;

  fragColor = outPremul(rgb, alpha);
}
`

export const glSphere = {
  id: 'glSphere',
  edgeFade: 'radial',
  name_de: 'Audio-Kugel (GPU)',
  name_en: 'Audio Sphere (GPU)',
  frag,
  uniforms: () => ({ uRadius: 0.62, uDisplace: 0.28 }),
  fallback: rainbowCube,
}
