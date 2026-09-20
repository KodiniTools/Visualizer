import { describe, it, expect } from 'vitest'
import {
  computeAudioReactiveValues,
  combinedScale,
  strongestGlow,
  buildFilterString,
} from '../../lib/audio/audioReactiveEngine.js'
import {
  createTickerAudioReactiveConfig,
  migrateLegacyTickerAudio,
  TICKER_EFFECT_NAMES,
  TICKER_SHARED_EFFECT_NAMES,
} from '../../lib/audio/audioReactiveConfig.js'

const loudAudio = {
  bass: 230,
  mid: 200,
  treble: 180,
  volume: 220,
  smoothBass: 230,
  smoothMid: 200,
  smoothTreble: 180,
  smoothVolume: 220,
  isBeat: false,
  beatIntensity: 0,
}

describe('audioReactiveEngine', () => {
  it('returns null when disabled, without audio data or without enabled effects', () => {
    const ar = createTickerAudioReactiveConfig()
    expect(computeAudioReactiveValues(ar, ar, loudAudio)).toBeNull()
    ar.enabled = true
    expect(computeAudioReactiveValues(ar, ar, loudAudio)).toBeNull()
    ar.effects.hue.enabled = true
    expect(computeAudioReactiveValues(ar, ar, null)).toBeNull()
    expect(computeAudioReactiveValues(ar, null, loudAudio)).toBeNull()
  })

  it('computes values for enabled effects and honours a custom calculator', () => {
    const ar = createTickerAudioReactiveConfig()
    ar.enabled = true
    ar.smoothing = 0
    ar.effects.hue.enabled = true
    ar.effects.tempo.enabled = true
    ar.effects.tempo.intensity = 100
    const calc = (name, level) =>
      name === 'tempo' ? { speedFactor: 1 + level * 3 } : { name, level }
    const out = computeAudioReactiveValues(ar, ar, loudAudio, calc)
    expect(out.hasEffects).toBe(true)
    expect(Object.keys(out.effects).sort()).toEqual(['hue', 'tempo'])
    expect(out.effects.hue.name).toBe('hue')
    expect(out.effects.hue.level).toBeGreaterThan(0)
    expect(out.effects.hue.level).toBeLessThanOrEqual(1)
    expect(out.effects.tempo.speedFactor).toBeGreaterThan(1)
  })

  it('default calculator yields finite values for time-based effects (regression: config was passed as time)', () => {
    const ar = createTickerAudioReactiveConfig()
    ar.enabled = true
    ar.smoothing = 0
    for (const name of [
      'bounce',
      'orbit',
      'swing',
      'figure8',
      'wave',
      'spiral',
      'float',
      'rotation',
      'skew',
    ]) {
      ar.effects[name].enabled = true
      ar.effects[name].intensity = 100
    }
    const out = computeAudioReactiveValues(ar, ar, loudAudio)
    expect(out).not.toBeNull()
    for (const [name, values] of Object.entries(out.effects)) {
      for (const [key, v] of Object.entries(values)) {
        expect(Number.isFinite(v), `${name}.${key} should be finite`).toBe(true)
      }
    }
    // Bewegungspfade liefern tatsächlich Verschiebungen (nicht nur Schütteln)
    const moving = ['bounce', 'orbit', 'swing', 'figure8', 'wave', 'spiral', 'float'].filter((n) =>
      Object.values(out.effects[n]).some((v) => Math.abs(v) > 0.001),
    )
    expect(moving.length).toBeGreaterThanOrEqual(5)
  })

  it('helpers combine scale, pick the strongest glow and build filters', () => {
    const fx = {
      scale: { scale: 1.2 },
      zoomPunch: { scale: 1.5 },
      glow: { glowBlur: 10, glowColor: 'a' },
      bpmPulse: { glowBlur: 30, glowColor: 'b' },
      hue: { hueRotate: 90 },
      invert: { invert: 0 },
      blur: { blur: 2 },
      strobe: { strobeBrightness: 150, strobeOpacity: 0.9 },
    }
    expect(combinedScale(fx)).toBeCloseTo(1.8)
    expect(strongestGlow(fx).glowColor).toBe('b')
    expect(strongestGlow({})).toBeNull()
    expect(buildFilterString(fx)).toBe('hue-rotate(90deg) blur(2px) brightness(150%)')
    expect(buildFilterString({})).toBe('')
  })
})

describe('ticker audio config', () => {
  it('ticker config = shared effects + tempo/opacity, no surface-only effects', () => {
    for (const name of ['perspective', 'border', 'chromatic', 'vignettePulse']) {
      expect(TICKER_SHARED_EFFECT_NAMES).not.toContain(name)
    }
    const ar = createTickerAudioReactiveConfig()
    expect(Object.keys(ar.effects)).toEqual([...TICKER_EFFECT_NAMES])
    expect(ar.effects.tempo).toEqual({ enabled: false, intensity: 60, source: null })
  })

  it('migrates legacy ticker fields (mode → effect, beat strength → intensity, level → gain)', () => {
    const ar = migrateLegacyTickerAudio({
      audioReactive: true,
      reactMode: 'glow',
      beatIntensity: 35,
      audioLevel: 150,
    })
    expect(ar.enabled).toBe(true)
    expect(ar.gain).toBe(1.5)
    expect(ar.source).toBe('bassOnset')
    expect(ar.effects.glow).toMatchObject({ enabled: true, intensity: 35 })
    expect(ar.effects.tempo.enabled).toBe(false)
    const def = migrateLegacyTickerAudio({})
    expect(def.enabled).toBe(false)
    expect(def.effects.tempo).toMatchObject({ enabled: true, intensity: 60 })
  })
})

describe('computeAudioReactiveValues – levelOptions', () => {
  /** Minimale Konfiguration mit einem Effekt, der den rohen Pegel durchreicht. */
  function konfig(overrides = {}) {
    return {
      enabled: true,
      source: 'bass',
      smoothing: 50,
      effects: { hue: { enabled: true, intensity: 100 } },
      ...overrides,
    }
  }
  const durchreichen = (_name, level) => ({ level })
  const pegel = (ar, audio, levelOptions) =>
    computeAudioReactiveValues(ar, ar, audio, durchreichen, levelOptions).effects.hue.level

  it('ändert ohne levelOptions nichts am bisherigen Verhalten', () => {
    const ohne = pegel(konfig(), loudAudio)
    const leer = pegel(konfig(), loudAudio, null)
    const leeresObjekt = pegel(konfig(), loudAudio, {})
    expect(leer).toBe(ohne)
    expect(leeresObjekt).toBe(ohne)
  })

  it('gated den Pegel über threshold', () => {
    // bass 230/255 ≈ 0.9 – eine Schwelle darüber muss auf 0 gehen
    expect(pegel(konfig(), loudAudio, { threshold: 0.95, attack: 1, release: 1 })).toBe(0)
    expect(pegel(konfig(), loudAudio, { threshold: 0, attack: 1, release: 1 })).toBeGreaterThan(0.8)
  })

  it('lässt explizite attack/release das abgeleitete smoothing überstimmen', () => {
    const still = { ...loudAudio, bass: 0 }

    // Mit smoothing 100 wäre der Abfall träge; attack/release = 1 macht ihn sofort
    const ar = konfig({ smoothing: 100 })
    computeAudioReactiveValues(ar, ar, loudAudio, durchreichen, { attack: 1, release: 1 })
    const sofort = computeAudioReactiveValues(ar, ar, still, durchreichen, {
      attack: 1,
      release: 1,
    }).effects.hue.level
    expect(sofort).toBe(0)

    // Zum Vergleich: dieselbe Konfiguration ohne levelOptions klingt langsam aus
    const traege = konfig({ smoothing: 100 })
    computeAudioReactiveValues(traege, traege, loudAudio, durchreichen)
    const nachher = computeAudioReactiveValues(traege, traege, still, durchreichen).effects.hue
      .level
    expect(nachher).toBeGreaterThan(0)
  })

  it('glättet den Eingang über preSmoothing', () => {
    const still = { ...loudAudio, bass: 0 }

    // Der erste Frame initialisiert die Hüllkurve mit dem Zielwert – die
    // Glättung wird erst ab dem zweiten Frame sichtbar.
    const geglaettet = konfig()
    pegel(geglaettet, still, { preSmoothing: 0.9, attack: 1, release: 1 })
    const mitGlaettung = pegel(geglaettet, loudAudio, {
      preSmoothing: 0.9,
      attack: 1,
      release: 1,
    })

    const direkt = konfig()
    pegel(direkt, still, { preSmoothing: 0, attack: 1, release: 1 })
    const ohneGlaettung = pegel(direkt, loudAudio, { preSmoothing: 0, attack: 1, release: 1 })

    expect(mitGlaettung).toBeLessThan(ohneGlaettung)
    expect(mitGlaettung).toBeGreaterThan(0)
  })
})
