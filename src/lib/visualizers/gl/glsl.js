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

// Premultiplied output. Alpha is raised to cover the brightest channel so the
// result is always a valid premultiplied colour (rgb <= a) and bright glows
// never get clipped by the compositor.
vec4 outPremul(vec3 rgb, float a) {
  rgb = clamp(rgb, 0.0, 1.0);
  a = clamp(max(a, max(rgb.r, max(rgb.g, rgb.b))), 0.0, 1.0);
  return vec4(rgb, a);
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
