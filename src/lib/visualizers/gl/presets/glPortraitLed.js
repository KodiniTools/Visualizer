/**
 * GPU preset: LED Portrait – the image rendered as a panel of round LEDs.
 * Each LED takes the image colour under it, its size follows the brightness,
 * the whole panel pulses with the bass and columns light up with their band.
 * @module visualizers/gl/presets/glPortraitLed
 */

const frag = /* glsl */ `
uniform float uCols;

void main() {
  if (uHasImage < 0.5) { fragColor = noImagePlaceholder(); return; }
  float aspect = uResolution.x / uResolution.y;
  float bass = uBands.x;
  float cols = max(16.0, uCols);
  float cell = 1.0 / cols;                      // in uv.x units
  vec2 g = vec2(vUv.x, vUv.y / aspect) / cell;  // square cells
  vec2 id = floor(g);
  vec2 cf = fract(g) - 0.5;

  vec2 centre = (id + 0.5) * cell * vec2(1.0, aspect);
  vec4 c = img(centre);
  float l = luma(c.rgb);
  float band = spectrum(fract(id.x / cols) * 0.9);
  float boost = 0.75 + band * 0.5 * uIntensity + bass * 0.2 + uOnset.w * 0.3;

  float radius = 0.16 + l * 0.3 * boost;
  radius = min(radius, 0.47);
  float d = length(cf);
  float aa = cols / uResolution.x * 1.2;
  float led = 1.0 - smoothstep(radius - aa, radius + aa, d);
  float glow = exp(-max(d - radius, 0.0) * 9.0) * l * 0.5 * boost;

  vec3 tint = hsl2rgb(vec3(uColorHsl.x, 0.6, 0.55));
  vec3 col = mix(c.rgb, c.rgb * tint * 1.6, 0.25) * (0.7 + boost * 0.5);
  // Opaque dark panel behind the LEDs (a real LED wall is never transparent).
  vec3 panel = hsl2rgb(vec3(uColorHsl.x, 0.2, 0.05));
  vec3 off = mix(panel, c.rgb, 0.12);
  vec3 rgb = mix(panel, mix(off, col, led), 1.0) + col * glow;
  fragColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}
`

export const glPortraitLed = {
  id: 'glPortraitLed',
  name_de: 'LED-Portrait (GPU)',
  name_en: 'LED Portrait (GPU)',
  needsImage: true,
  frag,
  uniforms: () => ({ uCols: 96 }),
}
