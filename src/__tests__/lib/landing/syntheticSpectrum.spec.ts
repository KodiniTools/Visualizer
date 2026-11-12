import { describe, it, expect } from 'vitest'
import {
  fillSyntheticSpectrum,
  fillSyntheticWaveform,
  SYNTHETIC_BPM,
} from '../../../lib/landing/syntheticSpectrum'
import {
  HERO_SHOWCASE,
  HERO_SHOWCASE_INTERVAL_MS,
  nextShowcaseIndex,
  shuffledOrder,
} from '../../../lib/landing/heroShowcase'

const avg = (a: Uint8Array, from: number, to: number) => {
  let s = 0
  for (let i = from; i < to; i++) s += a[i] as number
  return s / (to - from)
}

describe('fillSyntheticSpectrum', () => {
  it('füllt den Puffer mit Werten 0–255 und ist deterministisch', () => {
    const a = fillSyntheticSpectrum(new Uint8Array(1024), 3.21)
    const b = fillSyntheticSpectrum(new Uint8Array(1024), 3.21)
    expect(Array.from(a)).toEqual(Array.from(b))
    expect(Math.max(...a)).toBeLessThanOrEqual(255)
    expect(Math.max(...a)).toBeGreaterThan(100)
  })

  it('hat mehr Energie im Bass als in den Höhen (wie echte Musik)', () => {
    const a = fillSyntheticSpectrum(new Uint8Array(1024), 1.1)
    expect(avg(a, 0, 32)).toBeGreaterThan(avg(a, 700, 1024) * 3)
  })

  it('pulst im Takt: Bass direkt auf dem Schlag stärker als kurz davor', () => {
    const beat = 60 / SYNTHETIC_BPM
    const onBeat = fillSyntheticSpectrum(new Uint8Array(1024), beat * 4)
    const beforeBeat = fillSyntheticSpectrum(new Uint8Array(1024), beat * 4 - 0.05)
    expect(avg(onBeat, 0, 16)).toBeGreaterThan(avg(beforeBeat, 0, 16))
  })

  it('verkraftet leere Puffer und ungültige Zeiten', () => {
    expect(fillSyntheticSpectrum(new Uint8Array(0), 1).length).toBe(0)
    const a = fillSyntheticSpectrum(new Uint8Array(64), Number.NaN)
    const b = fillSyntheticSpectrum(new Uint8Array(64), 0)
    expect(Array.from(a)).toEqual(Array.from(b))
  })
})

describe('fillSyntheticWaveform', () => {
  it('schwingt um die Ruhelage 128 und bleibt im Bytebereich', () => {
    const a = fillSyntheticWaveform(new Uint8Array(1024), 2.5)
    const mean = a.reduce((s, v) => s + v, 0) / a.length
    expect(Math.abs(mean - 128)).toBeLessThan(10)
    expect(Math.max(...a)).toBeGreaterThan(160)
    expect(Math.min(...a)).toBeLessThan(96)
  })

  it('verändert sich über die Zeit', () => {
    const a = Array.from(fillSyntheticWaveform(new Uint8Array(256), 1))
    const b = Array.from(fillSyntheticWaveform(new Uint8Array(256), 1.1))
    expect(a).not.toEqual(b)
  })
})

describe('heroShowcase', () => {
  it('shuffledOrder liefert jede Position genau einmal', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const order = shuffledOrder(15, rnd)
    expect([...order].sort((x, y) => x - y)).toEqual(Array.from({ length: 15 }, (_, i) => i))
    expect(shuffledOrder(0)).toEqual([])
    expect(shuffledOrder(3, () => Number.NaN).sort()).toEqual([0, 1, 2])
  })

  it('enthält die 15 gewünschten Visualizer mit 5 s Anzeigedauer', () => {
    expect(HERO_SHOWCASE.map((e) => e.id)).toEqual([
      'glWaveform',
      'glBars',
      'glMandala',
      'glRings',
      'glLightRays',
      'glTerrain',
      'glPendulumSnake',
      'glVuMeter',
      'glLaserTunnel',
      'glLaserBurst',
      'glLedSunstrip',
      'glLedDigit1',
      'glLedLetterA',
      'glLedFrameVu',
      'glLaserGrid',
    ])
    expect(HERO_SHOWCASE_INTERVAL_MS).toBe(5000)
  })

  it('nextShowcaseIndex läuft zyklisch und fängt ungültige Werte ab', () => {
    expect(nextShowcaseIndex(0, 5)).toBe(1)
    expect(nextShowcaseIndex(4, 5)).toBe(0)
    expect(nextShowcaseIndex(-1, 5)).toBe(0)
    expect(nextShowcaseIndex(2, 0)).toBe(0)
  })

  it('jeder Eintrag lädt ein GPU-Preset mit passender ID', async () => {
    expect(HERO_SHOWCASE.length).toBeGreaterThanOrEqual(3)
    for (const entry of HERO_SHOWCASE) {
      const spec = await entry.load()
      expect(spec.id).toBe(entry.id)
      expect(typeof spec.frag).toBe('string')
      expect(entry.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
