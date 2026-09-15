/**
 * Shared machinery for the fireworks presets.
 *
 * `createShellTracker()` keeps a small pool of shells alive across frames
 * (launch position, burst height, seed, age) inside a preset's `uniforms`
 * hook: shells launch on rising onsets and, when the music is quiet, on a
 * slow automatic cadence, so the sky is never empty. The shells go to the
 * shader as two vec4 arrays.
 *
 * `FIREWORKS_GLSL` holds the matching shader helpers: the rocket trail and a
 * generic burst (particles with drag, gravity, trails and flicker) that the
 * presets parameterise into peony, willow, ring and salute looks.
 *
 * @module visualizers/gl/fireworks
 */

export const MAX_SHELLS = 8

/**
 * @param {{life?: number, autoInterval?: number, onsetThreshold?: number, cooldown?: number, minY?: number, maxY?: number}} [opts]
 * @returns {(ctx: {onset: object, dt: number, bands: ArrayLike<number>}) => object}
 */
export function createShellTracker(opts = {}) {
  const life = opts.life ?? 3.6
  const autoInterval = opts.autoInterval ?? 1.4
  const threshold = opts.onsetThreshold ?? 0.42
  const cooldown = opts.cooldown ?? 0.12
  const minY = opts.minY ?? 0.08
  const maxY = opts.maxY ?? 0.3

  const a = new Float32Array(MAX_SHELLS * 4) // x, yBurst, seed, age
  const b = new Float32Array(MAX_SHELLS * 4) // hueOff, size, alive, kind
  let counter = 1
  let sinceLaunch = 0
  let sinceAuto = 0
  let prevOnset = 0

  function rand(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return x - Math.floor(x)
  }

  function launch(strength) {
    // Free slot, else the oldest.
    let slot = -1
    let oldest = -1
    for (let i = 0; i < MAX_SHELLS; i++) {
      if (b[i * 4 + 2] < 0.5) {
        slot = i
        break
      }
      if (a[i * 4 + 3] > oldest) {
        oldest = a[i * 4 + 3]
        slot = i
      }
    }
    if (slot < 0) return
    const seed = counter++
    a[slot * 4 + 0] = (rand(seed) - 0.5) * 0.9
    a[slot * 4 + 1] = Math.min(0.36, minY + rand(seed + 0.3) * (maxY - minY) + strength * 0.06)
    a[slot * 4 + 2] = seed
    a[slot * 4 + 3] = 0
    b[slot * 4 + 0] = rand(seed + 0.7)
    b[slot * 4 + 1] = 0.7 + strength * 0.6 + rand(seed + 0.5) * 0.3
    b[slot * 4 + 2] = 1
    b[slot * 4 + 3] = Math.floor(rand(seed + 0.9) * 3)
  }

  return ({ onset, dt, bands }) => {
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 1 / 60
    const o = Math.max(onset?.all || 0, onset?.bass || 0)
    const vol = bands?.[3] || 0
    sinceLaunch += step
    sinceAuto += step

    for (let i = 0; i < MAX_SHELLS; i++) {
      if (b[i * 4 + 2] > 0.5) {
        a[i * 4 + 3] += step
        if (a[i * 4 + 3] > life) b[i * 4 + 2] = 0
      }
    }

    const rising = o > threshold && o > prevOnset + 0.12
    if (rising && sinceLaunch >= cooldown) {
      launch(Math.min(1, o))
      sinceLaunch = 0
      sinceAuto = 0
      // Strong hits fire a second shell.
      if (o > 0.8) launch(Math.min(1, o) * 0.8)
    } else if (sinceAuto >= autoInterval / (0.6 + vol)) {
      launch(0.4 + vol * 0.4)
      sinceAuto = 0
      sinceLaunch = 0
    }
    prevOnset = o

    return {
      uShellA: { size: 4, data: a },
      uShellB: { size: 4, data: b },
    }
  }
}

/** Shader helpers shared by the fireworks presets (prepend to the preset frag). */
export const FIREWORKS_GLSL = /* glsl */ `
uniform vec4 uShellA[8]; // x (-0.45..0.45 of width), burst height, seed, age (s)
uniform vec4 uShellB[8]; // hue offset, size, alive, kind
const float RISE = 0.85;

float fwHash(float n) { return fract(sin(n * 12.9898 + 78.233) * 43758.5453); }

// Rising rocket with a sparkling trail. prog: 0..1 along the rise.
vec4 rocket(vec2 p, vec2 launch, vec2 burst, float prog, float seed, float aaPx, vec3 col) {
  float e = 1.0 - pow(1.0 - prog, 2.2);                 // ease-out
  vec2 pos = mix(launch, burst, e);
  pos.x += sin(prog * 12.0 + seed) * 0.01;
  vec2 dir = normalize(burst - launch + vec2(0.0, 0.001));
  vec2 rel = p - pos;
  float along = dot(rel, -dir);
  float side = abs(dot(rel, vec2(-dir.y, dir.x)));
  float trailLen = 0.12 * (1.0 - prog * 0.5);
  float trail = (1.0 - smoothstep(0.0, trailLen, along)) * step(0.0, along) * exp(-side * side * 20000.0) * 0.8;
  float head = exp(-dot(rel, rel) * 40000.0) * 1.5;
  float spark = step(0.6, fwHash(floor(along * 60.0) + floor(uTime * 30.0) + seed)) * exp(-side * 900.0) * step(0.0, along) * step(along, trailLen) * 0.6;
  float v = (trail + head + spark) * (1.0 - smoothstep(0.85, 1.0, prog));
  return vec4(mix(col, vec3(1.0, 0.95, 0.85), head) * v, v);
}

// Generic burst. kind: 0 peony (round), 1 willow (long drooping trails),
// 2 ring (particles on a shell). Returns (rgb, alpha).
vec4 burst(vec2 p, vec2 c, float age, float seed, float size, float hue, float kind, float aaPx, float sparkleAmt) {
  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float drag = kind == 1.0 ? 1.4 : 2.4;
  float g = kind == 1.0 ? 0.16 : 0.10;
  float fade = kind == 1.0 ? 0.55 : 0.9;
  float spread = (1.0 - exp(-age * drag)) / drag;      // eased distance factor
  // Early out: outside the burst's reach.
  float reach = size * 0.65 * spread + 0.05 + g * age * age * 0.5;
  if (length(p - c) > reach + 0.08) return vec4(0.0);
  float life = exp(-age * fade);
  int count = 40;
  for (int i = 0; i < 40; i++) {
    if (i >= count) break;
    float fi = float(i);
    float h1 = fwHash(seed * 3.1 + fi * 7.7);
    float h2 = fwHash(seed * 1.7 + fi * 3.3 + 11.0);
    float h3 = fwHash(seed * 2.3 + fi * 5.1 + 23.0);
    float ang = kind == 2.0 ? fi / float(count) * TAU : h1 * TAU;
    float spd = kind == 2.0 ? 1.0 : (0.55 + h2 * 0.6);
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 vel = dir * spd * size * 0.65;
    // Position now and slightly earlier (for the streak).
    vec2 pos = c + vel * spread - vec2(0.0, g * age * age * 0.5);
    float agePrev = max(age - 0.06, 0.0);
    float spreadPrev = (1.0 - exp(-agePrev * drag)) / drag;
    vec2 posPrev = c + vel * spreadPrev - vec2(0.0, g * agePrev * agePrev * 0.5);
    vec2 ab = pos - posPrev;
    float hh = clamp(dot(p - posPrev, ab) / max(dot(ab, ab), 1e-7), 0.0, 1.0);
    float d = length(p - posPrev - ab * hh);
    float px = d / aaPx;
    float flicker = 0.7 + 0.3 * sin(uTime * (20.0 + h3 * 30.0) + fi);
    float bright = (1.0 - smoothstep(0.6, 1.8, px)) + exp(-px * 0.25) * 0.4;
    bright *= life * flicker * (0.6 + h3 * 0.6);
    // Willow: long fading tails hanging down.
    if (kind == 1.0) {
      float tailLen = 0.05 + age * 0.05;
      vec2 up = vec2(0.0, 1.0);
      float alongUp = dot(p - pos, up);
      float sideUp = abs(dot(p - pos, vec2(1.0, 0.0)));
      float tail = (1.0 - smoothstep(0.0, tailLen, alongUp)) * step(0.0, alongUp) * exp(-sideUp * sideUp * 40000.0) * life * 0.5;
      bright += tail;
    }
    float sparkle = step(0.93, fwHash(fi * 9.1 + floor(uTime * 12.0) + seed)) * sparkleAmt * life;
    float hueP = fract(hue + h3 * 0.08 + age * 0.03);
    vec3 col = hsl2rgb(vec3(hueP, 0.9, 0.55));
    vec3 hot = hsl2rgb(vec3(hueP, 0.4, 0.95));
    rgb += mix(col, hot, min(bright, 1.0) * 0.6 + sparkle) * bright;
    alpha += bright;
  }
  // Flash at the moment of the burst.
  float flash = exp(-age * 12.0) * exp(-dot(p - c, p - c) * 600.0) * 1.5;
  rgb += vec3(1.0, 0.95, 0.9) * flash;
  alpha += flash;
  return vec4(rgb, alpha);
}

// All shells: rockets before RISE, bursts after. kindOverride < 0 keeps the shell's own kind.
vec4 fireworks(vec2 p, float aspect, float aaPx, float kindOverride, float sparkleAmt, float hueBase) {
  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 sa = uShellA[i];
    vec4 sb = uShellB[i];
    if (sb.z < 0.5) continue;
    vec2 launch = vec2(sa.x * aspect, -0.5);
    vec2 c = vec2(sa.x * aspect, sa.y);
    float hue = fract(hueBase + sb.x * 0.6);
    vec3 col = hsl2rgb(vec3(hue, 0.8, 0.6));
    if (sa.w < RISE) {
      vec4 r = rocket(p, launch, c, sa.w / RISE, sa.z, aaPx, col);
      rgb += r.rgb; alpha += r.a;
    } else {
      float kind = kindOverride < 0.0 ? sb.w : kindOverride;
      vec4 bst = burst(p, c, sa.w - RISE, sa.z, sb.y, hue, kind, aaPx, sparkleAmt);
      rgb += bst.rgb; alpha += bst.a;
    }
  }
  return vec4(rgb, alpha);
}
`
