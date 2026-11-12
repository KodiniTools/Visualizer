import { describe, it, expect } from 'vitest'
import { fillSyntheticSpectrum, SYNTHETIC_BPM } from '../../../lib/landing/syntheticSpectrum'
import { HERO_SHOWCASE, nextShowcaseIndex } from '../../../lib/landing/heroShowcase'

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

describe('heroShowcase', () => {
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
