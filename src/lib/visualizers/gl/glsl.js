/**
 * Shared GLSL for GPU visualizer presets.
 *
 * Every preset fragment shader is compiled as `FRAG_HEADER + preset.frag`, so a
 * preset only writes its own helpers + `main()` and gets the standard uniforms,
 * the audio texture samplers and a small noise / colour toolkit for free.
 *
 * Output contract: presets write **premultiplied** RGBA into `fragColor`
 * (use `outPremul()`), because the engine canvas is created with
 * `premultipliedAlpha: true` and is composited via `drawImage()` onto the
 * transparent visualizer layer.
 *
 * @module visualizers/gl/glsl
 */

export const VERT_SRC = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

import { AUDIO_TEX_ROWS, AUDIO_HISTORY_ROWS } from './audioFeatures.js'

export const FRAG_HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;

uniform vec2  uResolution;  // canvas size in px
uniform float uTime;        // seconds, accumulated from real frame time
uniform float uDt;          // seconds since last frame
uniform vec3  uColor;       // base colour, linear-ish 0–1 RGB
uniform vec3  uColorHsl;    // base colour as (h 0–1, s 0–1, l 0–1)
uniform float uIntensity;   // user intensity / opacity slider (0–1+)
uniform vec4  uBands;       // bass, mid, treble, volume (0–1)
uniform vec4  uOnset;       // onset bass, mid, treble, all (0–1, self-normalised)
uniform sampler2D uAudio;   // row 0 (y=.25): raw spectrum, row 1 (y=.75): smoothed log spectrum
uniform float uAudioMode;   // 0 = spectrum rows, 1 = time-domain rows (needsTimeData presets)
uniform float uHistoryHead; // ring index of the newest history row
uniform sampler2D uImage;   // portrait presets: user image (unit 1)
uniform float uHasImage;    // 1 when uImage holds an image
uniform vec2  uImageSize;   // image pixel size
uniform float uImageFlip;   // 1 = texture rows start at the image top → flip v

#define AUDIO_ROWS ${AUDIO_TEX_ROWS}.0
#define HISTORY_ROWS ${AUDIO_HISTORY_ROWS}.0

#define PI  3.14159265359
#define TAU 6.28318530718

float audioRow(float x, float row) { return texture(uAudio, vec2(clamp(x, 0.0, 1.0), (row + 0.5) / AUDIO_ROWS)).r; }
float spectrumRaw(float x) { return audioRow(x, 0.0); }
float spectrum(float x)    { return audioRow(x, 1.0); }
// Smoothed spectrum 'age' frames ago, age in 0 (newest) .. 1 (oldest kept).
float history(float x, float age) {
  float back = clamp(age, 0.0, 1.0) * (HISTORY_ROWS - 1.0);
  float r0 = floor(back);
  float f = back - r0;
  float row0 = 2.0 + mod(uHistoryHead - r0 + HISTORY_ROWS * 2.0, HISTORY_ROWS);
  float row1 = 2.0 + mod(uHistoryHead - r0 - 1.0 + HISTORY_ROWS * 2.0, HISTORY_ROWS);
  return mix(audioRow(x, row0), audioRow(x, row1), f);
}
// Time-domain presets only: waveform in -1..1 (row 0) and its smoothed envelope 0..1 (row 1).
float waveform(float x)    { return audioRow(x, 0.0) * 2.0 - 1.0; }
float envelope(float x)    { return audioRow(x, 1.0); }

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Value noise that tiles in x with the given integer period (for angular
// coordinates: no seam at the atan() wrap).
float vnoisePeriodicX(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float i0 = mod(i.x, period);
  float i1 = mod(i.x + 1.0, period);
  return mix(mix(hash12(vec2(i0, i.y)), hash12(vec2(i1, i.y)), u.x),
             mix(hash12(vec2(i0, i.y + 1.0)), hash12(vec2(i1, i.y + 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Cover-fit image sampling: fills the canvas, centred, aspect preserved.
vec2 imageUv(vec2 uv) {
  float ca = uResolution.x / max(uResolution.y, 1.0);
  float ia = uImageSize.x / max(uImageSize.y, 1.0);
  vec2 s = ia > ca ? vec2(ca / ia, 1.0) : vec2(1.0, ia / ca);
  vec2 iuv = (uv - 0.5) * s + 0.5;
  iuv.y = mix(iuv.y, 1.0 - iuv.y, uImageFlip);
  return iuv;
}
vec4 img(vec2 uv) { return texture(uImage, imageUv(uv)); }
vec4 imgRaw(vec2 iuv) { return texture(uImage, clamp(iuv, 0.0, 1.0)); }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// Zentrierte, seitenverhältnis-korrigierte Koordinaten: y läuft von -0.5 (unten)
// bis 0.5 (oben), x entsprechend dem Seitenverhältnis.
vec2 centered() { return (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0); }

// Halbe kürzere Canvas-Kante in centered()-Einheiten: 0.5 im Querformat,
// 0.5 * Seitenverhältnis im Hochformat. Alles jenseits davon liegt außerhalb
// des Canvas.
float halfShortSide() { return 0.5 * min(uResolution.x / uResolution.y, 1.0); }

// Wie centered(), aber so skaliert, dass designRadius genau die halbe KÜRZERE
// Canvas-Kante erreicht. Für zentrierte Figuren (Mandala, Sternentor, …), die
// bei jedem Seitenverhältnis vollständig sichtbar sein sollen: was über die
// kurze Kante hinausläuft, wird nie gerendert und erscheint beim Verkleinern
// des Visualizers als harter Anschnitt.
vec2 centeredFit(float designRadius) { return centered() * (designRadius / halfShortSide()); }

// Premultiplied output. Alpha is raised to cover the brightest channel so the
// result is always a valid premultiplied colour (rgb <= a) and bright glows
// never get clipped by the compositor.
vec4 outPremul(vec3 rgb, float a) {
  rgb = clamp(rgb, 0.0, 1.0);
  a = clamp(max(a, max(rgb.r, max(rgb.g, rgb.b))), 0.0, 1.0);
  return vec4(rgb, a);
}

// A round LED lamp with lens shading, specular dot, bezel and bloom.
// lp: local coords centred on the lamp; R: lens radius; lit: 0..1.
// Returns premultiplied-ish (rgb, coverage) to be accumulated by the caller.
vec4 ledLamp(vec2 lp, float R, float aaPx, float lit, vec3 ledCol, vec3 ledDim, vec3 ledHot, float bloomMask) {
  float d = length(lp);
  float lens = 1.0 - smoothstep(R - aaPx, R + aaPx, d);
  float shade = 1.0 - smoothstep(0.0, R, d) * 0.55;
  float core = exp(-d * d / (R * R * 0.18)) * lit;
  vec2 specPos = lp - vec2(-R * 0.4, R * 0.4);
  float specular = exp(-dot(specPos, specPos) / (R * R * 0.012)) * 0.45;
  float bezel = (1.0 - smoothstep(0.0, 1.5 * aaPx, abs(d - R - 1.5 * aaPx))) * 0.6;
  float bloom = exp(-max(d - R, 0.0) / (R * 0.35)) * lit * 0.75 * step(R, d) * bloomMask;
  vec3 lensCol = mix(ledDim, ledCol, lit) * shade + ledHot * core * 0.9 + vec3(1.0) * specular * (0.3 + lit * 0.5);
  vec3 rgb = lensCol * lens + ledCol * bloom + ledDim * 0.5 * bezel;
  float a = lens + bloom + bezel * 0.5;
  return vec4(rgb, a);
}

// Volumetric-looking spotlight beam in fog. src: lamp position, dir: unit
// direction, spread: half-width at unit distance, reach: fade distance,
// fog: 0..1 density multiplier. Returns beam intensity 0..1.
float spotBeam(vec2 p, vec2 src, vec2 dir, float spread, float reach, float fog) {
  vec2 rel = p - src;
  float along = dot(rel, dir);
  if (along < 0.0) return 0.0;
  float side = dot(rel, vec2(-dir.y, dir.x));
  float w = 0.02 + along * spread;
  float beam = 1.0 - smoothstep(w * 0.55, w, abs(side));
  beam *= exp(-along / max(reach, 0.001));
  // Brighter core along the axis.
  beam *= 0.6 + 0.4 * (1.0 - smoothstep(0.0, w * 0.5, abs(side)));
  return beam * fog;
}

// Lamp body + lens flare for a spotlight source.
vec4 spotLamp(vec2 p, vec2 src, float power, vec3 hot, vec3 bodyCol) {
  float d = length(p - src);
  float lens = 1.0 - smoothstep(0.016, 0.019, d);
  float body = 1.0 - smoothstep(0.027, 0.03, d);
  float flare = exp(-d * d * 900.0) * power * 1.1 + exp(-d * 22.0) * power * 0.35;
  vec3 rgb = bodyCol * body * (1.0 - lens) + hot * (lens * (0.35 + power * 0.65) + flare);
  return vec4(rgb, body + flare);
}

// Laser line profile from a distance in pixels: crisp core + soft halo.
float laserGlow(float px) {
  return (1.0 - smoothstep(0.5, 1.7, px)) + exp(-px * 0.14) * 0.35;
}

// Small mirror ball: shaded sphere with rotating lat/long facets and a hot
// spot. lp: local coords centred on the ball, R: radius. Returns (rgb, disc).
vec4 miniMirrorBall(vec2 lp, float R, float aaPx, float t, float sparkle) {
  float r = length(lp);
  float disc = 1.0 - smoothstep(R - aaPx, R + aaPx, r);
  float d2 = dot(lp, lp) / (R * R);
  vec3 n = vec3(lp / R, sqrt(max(1.0 - d2, 0.0)));
  vec3 nr = n;
  nr.xz = rot2(t * 0.5) * nr.xz;
  nr.yz = rot2(0.3) * nr.yz;
  float lon = atan(nr.x, nr.z);
  float lat = asin(clamp(nr.y, -1.0, 1.0));
  vec2 fid = floor(vec2(lon / TAU * 16.0, lat / PI * 8.0));
  vec2 ff = fract(vec2(lon / TAU * 16.0, lat / PI * 8.0));
  float h = hash12(fid + 5.0);
  float grout = smoothstep(0.0, 0.12, ff.x) * smoothstep(0.0, 0.12, ff.y) * smoothstep(1.0, 0.88, ff.x) * smoothstep(1.0, 0.88, ff.y);
  vec3 L = normalize(vec3(0.5, 0.7, 0.6));
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
  float flash = step(0.97 - sparkle * 0.03, hash12(fid + floor(t * 6.0))) * sparkle;
  vec3 col = vec3(0.45, 0.48, 0.55) * (0.35 + 0.35 * n.z + h * 0.25) * (0.5 + 0.5 * grout) + vec3(1.0) * (spec * 0.8 + flash);
  return vec4(col, disc);
}

// Shown by portrait presets while no image is selected: a dashed frame in
// the base colour with a pulsing dot, so the layer is visibly "waiting".
vec4 noImagePlaceholder() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float aaPx = 1.0 / uResolution.y;
  vec2 q = abs(p) - vec2(0.42 * uResolution.x / uResolution.y, 0.36);
  float box = abs(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0));
  float frame = 1.0 - smoothstep(1.5 * aaPx, 3.0 * aaPx, box);
  float dash = step(0.5, fract((p.x + p.y) * 12.0 + uTime * 0.5));
  float r = length(p);
  float dot = exp(-r * r * (300.0 - uBands.x * 150.0)) * (0.4 + uBands.x);
  vec3 col = hsl2rgb(vec3(uColorHsl.x, 0.7, 0.6));
  float a = frame * dash * 0.6 + dot;
  return outPremul(col * a, a);
}
`

/**
 * Full fragment source for a preset.
 * @param {string} presetFrag
 * @returns {string}
 */
export function buildFragmentSource(presetFrag) {
  return FRAG_HEADER + '\n' + presetFrag
}
