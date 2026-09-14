/**
 * GPU preset: Contour Portrait – only the edges of the image as glowing lines
 * in the base colour, breathing with the bass, with a scan sweep and treble
 * shimmer; the image itself stays as a faint ghost underneath.
 * @module visualizers/gl/presets/glPortraitEdges
 */

const frag = /* glsl */ `
uniform float uThreshold;

float lumaAt(vec2 iuv) { return luma(imgRaw(iuv).rgb); }

void main() {
  if (uHasImage < 0.5) { fragColor = noImagePlaceholder(); return; }
  float t = uTime;
  float bass = uBands.x;
  float treb = uBands.z;

  vec2 iuv = imageUv(vUv);
  vec2 px = 1.0 / max(uImageSize, vec2(1.0));
  // Sobel on luma.
  float tl = lumaAt(iuv + vec2(-px.x,  px.y)), tc = lumaAt(iuv + vec2(0.0,  px.y)), tr = lumaAt(iuv + vec2( px.x,  px.y));
  float ml = lumaAt(iuv + vec2(-px.x,  0.0)),                                          mr = lumaAt(iuv + vec2( px.x,  0.0));
  float bl = lumaAt(iuv + vec2(-px.x, -px.y)), bc = lumaAt(iuv + vec2(0.0, -px.y)), br = lumaAt(iuv + vec2( px.x, -px.y));
  float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
  float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
  float edge = length(vec2(gx, gy));
  float thr = uThreshold * (1.0 - bass * 0.4);
  float lines = smoothstep(thr, thr + 0.25, edge) * uIntensity;

  // Band-driven brightness along y, scan sweep, treble shimmer.
  float band = spectrum(abs(vUv.y * 2.0 - 1.0) * 0.9);
  float sweep = exp(-abs(fract(t * 0.2) - vUv.y) * 30.0) * 0.6;
  float shimmer = 0.85 + 0.15 * sin(t * 20.0 + vUv.y * 200.0) * treb;

  float hue = fract(uColorHsl.x + vUv.y * 0.12);
  vec3 col = hsl2rgb(vec3(hue, 0.85, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.4, 0.95));
  vec3 base = img(vUv).rgb;

  float glowE = lines * (0.6 + band * 0.8 + bass * 0.4 + uOnset.w * 0.5) * shimmer;
  // Opaque near-black backdrop so the contours glow on any canvas colour.
  vec3 backdrop = hsl2rgb(vec3(uColorHsl.x, 0.3, 0.04));
  vec3 rgb = backdrop + base * 0.14 + mix(col, hot, min(glowE, 1.0) * 0.6) * glowE + col * sweep * lines;
  fragColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}
`

export const glPortraitEdges = {
  id: 'glPortraitEdges',
  name_de: 'Konturen-Portrait (GPU)',
  name_en: 'Contour Portrait (GPU)',
  needsImage: true,
  frag,
  uniforms: () => ({ uThreshold: 0.25 }),
}
