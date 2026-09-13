/**
 * GPU preset: Lightning – onset-triggered bolts from the centre to the edge,
 * noise-displaced with side branches and an afterglow that fades between
 * beats. Successor of electricWeb / weatherStorm.
 *
 * The bolt bookkeeping (which bolts are alive, their seeds and ages) lives in
 * the preset's `uniforms` hook, driven by the onset detector.
 * @module visualizers/gl/presets/glLightning
 */

import { electricWeb } from '../../tech/electricWeb.js'

const MAX_BOLTS = 4

const frag = /* glsl */ `
uniform vec4 uBoltSeed;   // per-bolt seed (0 = inactive)
uniform vec4 uBoltLife;   // per-bolt life 1 → 0

// Distance from p to a noise-displaced segment a→b; returns (distance, along).
vec2 boltDist(vec2 p, vec2 a, vec2 b, float seed, float wobble) {
  vec2 ab = b - a;
  float len = length(ab);
  vec2 dir = ab / max(len, 0.0001);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 ap = p - a;
  float along = dot(ap, dir);
  float s = clamp(along / len, 0.0, 1.0);
  float side = dot(ap, nrm);
  // Distance beyond either end, so the bolt stops at its endpoints.
  float over = max(max(-along, along - len), 0.0);
  // Displacement along the bolt: two noise octaves, pinned at both ends.
  float disp = (vnoise(vec2(s * 9.0 + seed * 13.0, seed)) - 0.5) * 0.9
             + (vnoise(vec2(s * 27.0 + seed * 7.0, seed * 3.0)) - 0.5) * 0.4
             + (vnoise(vec2(s * 90.0 + seed * 5.0, seed * 5.0)) - 0.5) * 0.18;
  disp *= wobble * (0.2 + 0.8 * sin(s * PI));
  return vec2(length(vec2(side - disp, over)), s);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float t = uTime;
  float treb = uBands.z;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float hue = uColorHsl.x;
  vec3 col = hsl2rgb(vec3(hue, 0.85, 0.6));
  vec3 hot = hsl2rgb(vec3(hue, 0.25, 0.95));

  for (int i = 0; i < 4; i++) {
    float seed = uBoltSeed[i];
    float life = uBoltLife[i];
    if (seed <= 0.0 || life <= 0.0) continue;

    float ang = hash12(vec2(seed, 1.0)) * TAU;
    vec2 a = vec2(0.0);
    vec2 b = vec2(cos(ang), sin(ang)) * (0.55 + hash12(vec2(seed, 2.0)) * 0.4);

    // Main bolt.
    vec2 d = boltDist(p, a, b, seed, 0.28);
    float flick = 0.75 + 0.25 * sin(t * 60.0 + seed * 10.0);
    float core = exp(-d.x * uResolution.y * 0.45) * flick;
    float glow = exp(-d.x * 9.0) * 0.8;

    // Two branches leaving the main bolt.
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      float bs = seed * 3.7 + fk * 11.0;
      float at = 0.3 + hash12(vec2(bs, 4.0)) * 0.45;
      vec2 start = mix(a, b, at);
      float bang = ang + (hash12(vec2(bs, 5.0)) - 0.5) * 1.6;
      vec2 end = start + vec2(cos(bang), sin(bang)) * (0.18 + hash12(vec2(bs, 6.0)) * 0.22);
      vec2 bd = boltDist(p, start, end, bs, 0.18);
      core += exp(-bd.x * uResolution.y * 0.6) * 0.7 * flick;
      glow += exp(-bd.x * 12.0) * 0.4;
    }

    float fade = sqrt(life);
    rgb += (hot * core + col * glow) * fade;
    alpha += (core + glow) * fade;
  }

  // Ambient crackle in the centre, driven by treble.
  float r = length(p);
  float crackle = exp(-r * r * 25.0) * treb * 0.35;
  rgb += col * crackle;
  alpha += crackle;

  rgb *= 0.6 + 0.4 * uIntensity;
  alpha *= 0.6 + 0.4 * uIntensity;
  fragColor = outPremul(rgb, alpha);
}
`

/** Bolt state lives in the preset (one set per realm). */
function createBoltTracker() {
  const seeds = new Float32Array(MAX_BOLTS)
  const lives = new Float32Array(MAX_BOLTS)
  let cooldown = 0
  let prevOnset = 0
  let counter = 1

  return ({ onset, dt, bands }) => {
    const step = Number.isFinite(dt) && dt > 0 ? dt : 1 / 60
    const o = Math.max(onset?.all || 0, onset?.bass || 0)
    cooldown = Math.max(0, cooldown - step)

    // Trigger on a rising onset, or on strong bass when the detector is idle.
    const rising = o > 0.45 && o > prevOnset + 0.15
    const fallbackBass = (bands?.[0] || 0) > 0.75 && cooldown <= 0
    if ((rising && cooldown <= 0) || fallbackBass) {
      let slot = 0
      for (let i = 1; i < MAX_BOLTS; i++) if (lives[i] < lives[slot]) slot = i
      seeds[slot] = (counter++ % 1000) + 1
      lives[slot] = 1
      cooldown = 0.12
    }
    prevOnset = o

    for (let i = 0; i < MAX_BOLTS; i++) {
      if (lives[i] > 0) lives[i] = Math.max(0, lives[i] - step * 2.2)
    }
    return { uBoltSeed: seeds, uBoltLife: lives }
  }
}

export const glLightning = {
  id: 'glLightning',
  name_de: 'Blitze (GPU)',
  name_en: 'Lightning (GPU)',
  frag,
  uniforms: createBoltTracker(),
  fallback: electricWeb,
}
