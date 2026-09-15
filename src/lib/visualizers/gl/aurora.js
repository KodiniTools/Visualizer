/**
 * Shared shader building blocks for the northern-lights presets: the curtain
 * density (vertical rays inside horizontal folds), a starfield and a mountain
 * silhouette. Prepend `AURORA_GLSL` to a preset's fragment body.
 * @module visualizers/gl/aurora
 */

export const AURORA_GLSL = /* glsl */ `
// Aurora curtain density at (x, y): y measured upward from the curtain base.
// x: horizontal coordinate (already aspect-corrected), t: time,
// folds: horizontal fold amount (mids), height: vertical extent (bass).
float auroraDensity(float x, float y, float t, float folds, float height, float rayDetail) {
  // Folds move the curtain base up and down along x.
  float fold = fbm(vec2(x * 1.1 + t * 0.08, t * 0.05)) * 2.0 - 1.0;
  float base = fold * 0.12 * folds;
  float yy = y - base;
  if (yy < -0.05) return 0.0;
  // Vertical rays: high-frequency noise along x, stretched along y.
  float rays = fbm(vec2(x * (6.0 + rayDetail * 6.0) + t * 0.25 + fold * 2.0, yy * 0.6 - t * 0.08));
  rays = smoothstep(0.35, 0.8, rays);
  // Vertical profile: bright lower edge, long fade upward.
  float edge = smoothstep(-0.02, 0.03, yy);
  float profile = edge * exp(-max(yy, 0.0) * (2.2 / max(height, 0.05)));
  // Larger patches of brightness travelling along the curtain.
  float bright = 0.55 + 0.45 * fbm(vec2(x * 0.8 - t * 0.12, t * 0.07));
  return rays * profile * bright;
}

// Colour ramp along the curtain height: base hue low, shifted hue high.
vec3 auroraColour(float yy, float hueLow, float hueHigh, float dens) {
  float k = clamp(yy * 2.0, 0.0, 1.0);
  vec3 low = hsl2rgb(vec3(hueLow, 0.85, 0.5));
  vec3 high = hsl2rgb(vec3(hueHigh, 0.75, 0.5));
  vec3 col = mix(low, high, k);
  // The very bottom edge glows brighter and paler.
  col = mix(col, hsl2rgb(vec3(hueLow, 0.5, 0.85)), smoothstep(0.6, 1.2, dens) * 0.5);
  return col;
}

// Static starfield with slow twinkle.
float stars(vec2 p, float density, float t) {
  vec2 cell = floor(p * density);
  vec2 cf = fract(p * density) - 0.5;
  float h = hash12(cell);
  float h2 = hash12(cell + 3.3);
  float star = smoothstep(0.93, 1.0, h) * (1.0 - smoothstep(0.0, 0.25 + h2 * 0.15, length(cf + (vec2(h2, h) - 0.5) * 0.5)));
  return star * (0.6 + 0.4 * sin(t * (1.0 + h2 * 3.0) + h * 40.0));
}

// Mountain silhouette height at x (uv units around 0.5 from the bottom).
float mountains(float x, float base, float amp) {
  return base + (fbm(vec2(x * 1.5 + 3.0, 1.0)) - 0.4) * amp + (fbm(vec2(x * 6.0, 7.0)) - 0.5) * amp * 0.3;
}
`
