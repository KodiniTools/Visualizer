import { describe, it, expect } from 'vitest'
import { EFFECT_NAMES } from '../../lib/audio/AudioReactiveEffects.js'
import {
  BACKGROUND_EFFECT_NAMES,
  TILE_COLOR_ONLY_EFFECT_NAMES,
  tileEffectNames,
  TEXT_SHARED_EFFECT_NAMES,
  TEXT_ONLY_EFFECT_NAMES,
  TEXT_EFFECT_NAMES,
  createTextAudioReactiveConfig,
  ensureTextAudioReactive,
  AUDIO_REACTIVE_PRESETS,
  AUDIO_REACTIVE_PRESET_LIST,
  DEFAULT_EFFECT_INTENSITIES,
  createAudioReactiveConfig,
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
  serializeBackgroundAudio,
  applyBackgroundAudioSnapshot,
} from '../../lib/audio/audioReactiveConfig.js'

describe('audioReactiveConfig – Struktur', () => {
  it('creates a config with every image effect disabled and default intensities', () => {
    const ar = createAudioReactiveConfig()
    expect(Object.keys(ar.effects)).toEqual([...EFFECT_NAMES])
    expect(ar).toMatchObject({
      enabled: false,
      source: 'bass',
      smoothing: 50,
      easing: 'linear',
      phase: 0,
      beatBoost: 1,
      gain: 1,
    })
    for (const name of EFFECT_NAMES) {
      expect(ar.effects[name]).toEqual({
        enabled: false,
        intensity: DEFAULT_EFFECT_INTENSITIES[name],
        source: null,
      })
    }
  })

  it('background config = image effects + gradient effects', () => {
    const ar = createAudioReactiveConfig(BACKGROUND_EFFECT_NAMES)
    expect(Object.keys(ar.effects)).toEqual([...EFFECT_NAMES, 'gradientPulse', 'gradientRotation'])
    expect(ar.effects.gradientPulse.intensity).toBe(80)
  })

  it('tile effects: full set with media, only visible effects for color-only tiles', () => {
    expect(tileEffectNames(true)).toBe(EFFECT_NAMES)
    expect(tileEffectNames(false)).toBe(TILE_COLOR_ONLY_EFFECT_NAMES)
    // Auf einer Farbkachel unsichtbar: Geometrie, Bewegung, Glow, Blur, Chromatik
    for (const name of ['scale', 'rotation', 'shake', 'glow', 'blur', 'chromatic', 'beatPulse']) {
      expect(TILE_COLOR_ONLY_EFFECT_NAMES).not.toContain(name)
    }
    for (const name of ['hue', 'invert', 'strobe', 'border', 'vignettePulse', 'colorStrobe']) {
      expect(TILE_COLOR_ONLY_EFFECT_NAMES).toContain(name)
      expect(EFFECT_NAMES).toContain(name)
    }
  })

  it('text config = shared effects (minus non-text ones) + text-only effects + reaction fields', () => {
    for (const name of ['perspective', 'border', 'chromatic', 'vignettePulse']) {
      expect(TEXT_SHARED_EFFECT_NAMES).not.toContain(name)
    }
    for (const name of TEXT_SHARED_EFFECT_NAMES) expect(EFFECT_NAMES).toContain(name)
    const ar = createTextAudioReactiveConfig({ enabled: true, source: 'mid' })
    expect(Object.keys(ar.effects)).toEqual([...TEXT_EFFECT_NAMES])
    expect(ar).toMatchObject({
      enabled: true,
      source: 'mid',
      threshold: 0,
      attack: 90,
      release: 50,
    })
    expect(ar.effects.opacity).toEqual({
      enabled: false,
      intensity: 80,
      source: null,
      minimum: 0,
      ease: false,
    })
    for (const name of TEXT_ONLY_EFFECT_NAMES) expect(ar.effects[name].intensity).toBe(80)
  })

  it('ensureTextAudioReactive completes legacy text configs in place', () => {
    const legacy = {
      enabled: true,
      source: 'treble',
      smoothing: 20,
      effects: { hue: { enabled: true, intensity: 42 }, opacity: { enabled: true, intensity: 60 } },
    }
    const out = ensureTextAudioReactive(legacy)
    expect(out).toBe(legacy)
    expect(legacy.easing).toBe('linear')
    expect(legacy.threshold).toBe(0)
    expect(legacy.effects.hue).toEqual({ enabled: true, intensity: 42, source: null })
    expect(legacy.effects.opacity).toMatchObject({
      enabled: true,
      intensity: 60,
      minimum: 0,
      ease: false,
    })
    expect(legacy.effects.beatFlip).toEqual({ enabled: false, intensity: 80, source: null })
    expect(Object.keys(legacy.effects).sort()).toEqual([...TEXT_EFFECT_NAMES].sort())
    expect(ensureTextAudioReactive(null).enabled).toBe(false)
  })

  it('preset list matches preset definitions', () => {
    expect(AUDIO_REACTIVE_PRESET_LIST.map((p) => p.id).sort()).toEqual(
      Object.keys(AUDIO_REACTIVE_PRESETS).sort(),
    )
  })
})

describe('audioReactiveConfig – Presets', () => {
  it('applies a preset: disables everything else, sets master values', () => {
    const ar = createAudioReactiveConfig()
    ar.effects.hue.enabled = true
    expect(applyAudioReactivePreset(ar, 'pulse')).toBe(true)
    expect(ar.enabled).toBe(true)
    expect(ar.source).toBe('bass')
    expect(ar.easing).toBe('easeOut')
    expect(ar.beatBoost).toBe(1.5)
    expect(ar.smoothing).toBe(60)
    expect(ar.effects.hue.enabled).toBe(false)
    expect(ar.effects.scale).toMatchObject({ enabled: true, intensity: 70 })
    expect(ar.effects.glow).toMatchObject({ enabled: true, intensity: 80 })
  })

  it('unknown preset leaves the config untouched', () => {
    const ar = createAudioReactiveConfig()
    ar.effects.hue.enabled = true
    expect(applyAudioReactivePreset(ar, 'nope')).toBe(false)
    expect(ar.effects.hue.enabled).toBe(true)
    expect(ar.enabled).toBe(false)
  })

  it('assign restores a partial config and disables missing effects', () => {
    const ar = createAudioReactiveConfig()
    applyAudioReactivePreset(ar, 'glitch')
    assignAudioReactiveConfig(ar, {
      enabled: true,
      source: 'treble',
      effects: { hue: { enabled: true, intensity: 42, source: 'mid' } },
    })
    expect(ar.source).toBe('treble')
    expect(ar.effects.hue).toEqual({ enabled: true, intensity: 42, source: 'mid' })
    expect(ar.effects.chromatic.enabled).toBe(false)
    expect(ar.effects.skew.enabled).toBe(false)
  })
})

describe('audioReactiveConfig – Hintergrund-Snapshot', () => {
  it('round-trips through the flat snapshot format', () => {
    const ar = createAudioReactiveConfig(BACKGROUND_EFFECT_NAMES)
    ar.enabled = true
    ar.source = 'midOnset'
    ar.smoothing = 30
    ar.easing = 'punch'
    ar.beatBoost = 2
    ar.phase = 90
    ar.gain = 1.5
    ar.effects.shake = { enabled: true, intensity: 66, source: 'treble' }
    ar.effects.gradientPulse = { enabled: true, intensity: 55, source: null }

    const snap = serializeBackgroundAudio(ar)
    expect(snap).toMatchObject({
      bgAudioEnabled: true,
      bgAudioSource: 'midOnset',
      bgAudioSmoothing: 30,
      bgAudioEasing: 'punch',
      bgAudioBeatBoost: 2,
      bgAudioPhase: 90,
      bgAudioGain: 1.5,
    })
    expect(snap.bgEffects.shake).toEqual({ enabled: true, intensity: 66, source: 'treble' })
    expect(snap.bgEffects.gradientPulse).toEqual({ enabled: true, intensity: 55 })

    const target = createAudioReactiveConfig(BACKGROUND_EFFECT_NAMES)
    applyBackgroundAudioSnapshot(target, JSON.parse(JSON.stringify(snap)))
    expect(target).toEqual(ar)
  })

  it('accepts legacy snapshots (few effects, no master extras)', () => {
    const ar = createAudioReactiveConfig(BACKGROUND_EFFECT_NAMES)
    ar.effects.shake.enabled = true
    ar.easing = 'bounce'
    applyBackgroundAudioSnapshot(ar, {
      bgAudioEnabled: true,
      bgAudioSource: 'bass',
      bgAudioSmoothing: 50,
      bgEffects: {
        hue: { enabled: true, intensity: 80 },
        gradientRotation: { enabled: true, intensity: 40 },
      },
    })
    expect(ar.enabled).toBe(true)
    expect(ar.easing).toBe('linear')
    expect(ar.beatBoost).toBe(1)
    expect(ar.gain).toBe(1)
    expect(ar.effects.hue).toEqual({ enabled: true, intensity: 80, source: null })
    expect(ar.effects.gradientRotation).toEqual({ enabled: true, intensity: 40, source: null })
    expect(ar.effects.shake.enabled).toBe(false)
  })

  it('applies an empty snapshot as "all off"', () => {
    const ar = createAudioReactiveConfig(BACKGROUND_EFFECT_NAMES)
    ar.enabled = true
    ar.effects.glow.enabled = true
    applyBackgroundAudioSnapshot(ar, null)
    expect(ar.enabled).toBe(false)
    expect(ar.effects.glow.enabled).toBe(false)
  })
})
