/**
 * Shared building blocks for the laser-figure presets. A preset defines
 * `vec2 figure(float s)` (the scanned curve) and then appends `CURVE_GLSL`,
 * which samples that curve as a polyline, finds the distance to it and draws
 * the laser trace with a travelling scan head.
 * @module visualizers/gl/laserFigures
 */

export const CURVE_GLSL = /* glsl */ `
// Distance from p to the polyline sampling figure(s) over 0..sMax. Returns
// (distance, s at the nearest point).
vec2 curveDistance(vec2 p, float segs, float sMax) {
  float dMin = 10.0;
  float sAt = 0.0;
  vec2 prev = figure(0.0);
  for (int i = 1; i <= 200; i++) {
    float fi = float(i);
    if (fi > segs) break;
    float s = fi / segs * sMax;
    vec2 cur = figure(s);
    vec2 ab = cur - prev;
    float h = clamp(dot(p - prev, ab) / max(dot(ab, ab), 1e-7), 0.0, 1.0);
    float d = length(p - prev - ab * h);
    if (d < dMin) { dMin = d; sAt = s; }
    prev = cur;
  }
  return vec2(dMin, sAt);
}

// Laser trace: crisp core, phosphor halo, hue drifting along the curve and a
// bright scan head running along it. width in px, headSpeed in curves/s.
vec4 laserTrace(vec2 dc, float sMax, float aaPx, float t, float hueBase, float hueSpread, float treb, float width, float headSpeed) {
  float px = dc.x / aaPx;
  float core = 1.0 - smoothstep(width * 0.5, width * 0.5 + 1.3, px);
  float halo = exp(-px * 0.08) * 0.45;
  float along = dc.y / sMax;
  float head = smoothstep(0.9, 1.0, fract(along - t * headSpeed)) * 0.9;
  float flick = 0.9 + 0.1 * sin(t * 50.0) * treb;
  float hue = fract(hueBase + along * hueSpread + t * 0.02);
  vec3 col = hsl2rgb(vec3(hue, 0.95, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.3, 0.95));
  vec3 rgb = (mix(col, hot, core) * (core + halo) + hot * head * core) * flick;
  float alpha = (core + halo + head * core) * flick;
  return vec4(rgb, alpha);
}
`
