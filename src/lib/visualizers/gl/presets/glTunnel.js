/**
 * GPU preset: Tunnel – flight through a twisting, noise-textured tunnel.
 * Speed and brightness follow the bass, the spectrum lights up rings along
 * the depth, the onset detector twists the tunnel. Successor of
 * vortexPortal / spiralGalaxy.
 * @module visualizers/gl/presets/glTunnel
 */

import { vortexPortal } from '../../effects/vortexPortal.js'

const frag = /* glsl */ `
uniform float uTwist;   // angular twist along the depth
uniform float uRings;   // spectrum bands mapped onto the rings

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float t = uTime;

  float r = length(p);
  float ang = atan(p.y, p.x);
  float depth = 0.3 / max(r, 0.01);                    // classic tunnel projection
  float speed = 1.0 + bass * 2.0 + uOnset.x * 1.5;
  float z = depth + t * speed;
  float twist = ang + z * 0.04 * uTwist + t * 0.15 + uOnset.w * 0.5;

  // Periodic wall texture: noise on the unit circle (no seam) + depth.
  vec2 cyl = vec2(cos(twist), sin(twist));
  float n = fbm(vec2(cyl.x * 1.6 + z * 0.25, cyl.y * 1.6 - z * 0.18));

  // Longitudinal segment lines and depth rings.
  float segs = smoothstep(0.92, 1.0, abs(sin(twist * 4.0)));
  float ringIdx = floor(z * 1.4);
  float ringF = fract(z * 1.4);
  float spec = spectrum(fract(ringIdx / uRings) * 0.9);
  float ring = smoothstep(0.14, 0.0, abs(ringF - 0.5)) * (0.2 + spec * 1.6 * uIntensity);

  // Fog: far end (centre) fades out, outer edge softens.
  float fog = smoothstep(0.02, 0.28, r) * smoothstep(1.2, 0.55, r);

  float wall = n * 1.1 * (0.5 + mid * 0.8) + segs * 0.45 * (0.3 + treb);
  float bright = (wall * (0.55 + bass * 0.8) + ring) * fog;

  float hue = fract(uColorHsl.x + n * 0.12 + ringF * 0.04);
  vec3 col = hsl2rgb(vec3(hue, clamp(uColorHsl.y + 0.1, 0.6, 1.0), 0.5));
  vec3 hot = hsl2rgb(vec3(hue, 0.45, 0.9));
  vec3 rgb = mix(col, hot, clamp(ring * 0.7, 0.0, 1.0)) * bright;
  rgb *= 0.6 + 0.4 * uIntensity;

  float alpha = clamp(bright * 1.1, 0.0, 1.0);
  fragColor = outPremul(rgb, alpha);
}
`

export const glTunnel = {
  id: 'glTunnel',
  name_de: 'Tunnel (GPU)',
  name_en: 'Tunnel (GPU)',
  frag,
  uniforms: () => ({ uTwist: 3.0, uRings: 12 }),
  fallback: vortexPortal,
}
