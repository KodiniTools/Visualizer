import { describe, it, expect } from 'vitest'
import {
  DIGIT_BITMAPS,
  DIGIT_COLS,
  DIGIT_ROWS,
  LETTER_BITMAPS,
  makeLedDigitPreset,
  makeLedLetterPreset,
  rowToBits,
} from '../../../lib/visualizers/gl/presets/glLedDigits.js'
import { glPresetSpecs } from '../../../lib/visualizers/gl/index.js'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const LETTERS = ['A', 'B', 'C', 'D', 'E']

describe('gl/presets/glLedDigits', () => {
  it('hat für jede Ziffer 0–9 eine gültige 5×7-Bitmap', () => {
    for (const d of DIGITS) {
      const bm = DIGIT_BITMAPS[d]
      expect(bm, `Ziffer ${d}`).toHaveLength(DIGIT_ROWS)
      for (const row of bm) {
        expect(row).toHaveLength(DIGIT_COLS)
        expect(row).toMatch(/^[.#]{5}$/)
      }
    }
  })

  it('unterscheidet alle zehn Ziffern', () => {
    const keys = new Set(Object.values(DIGIT_BITMAPS).map((bm) => bm.join('')))
    expect(keys.size).toBe(10)
  })

  it('kodiert Zeilen mit der linken Spalte als höchstem Bit', () => {
    expect(rowToBits('#####')).toBe(31)
    expect(rowToBits('#....')).toBe(16)
    expect(rowToBits('....#')).toBe(1)
    expect(rowToBits('.###.')).toBe(14)
  })

  it('bakt die Bitmap als Konstanten in den Shader', () => {
    const { frag } = makeLedDigitPreset(1)
    for (const bits of DIGIT_BITMAPS[1].map(rowToBits)) {
      expect(frag).toContain(`return ${bits}.0;`)
    }
    expect(frag).toMatch(/void\s+main\s*\(/)
    expect(frag).toContain('ledLamp(')
  })

  it('ist unter glLedDigit0–9 registriert, mit Namen und Canvas2D-Fallback', () => {
    for (const d of DIGITS) {
      const spec = glPresetSpecs[`glLedDigit${d}`]
      expect(spec).toBeDefined()
      expect(spec.name_de).toBe(`LED-Ziffer ${d} (GPU)`)
      expect(spec.name_en).toBe(`LED Digit ${d} (GPU)`)
      expect(typeof spec.fallback.draw).toBe('function')
    }
  })

  it('hat für jeden Buchstaben A–E eine gültige 5×7-Bitmap', () => {
    for (const c of LETTERS) {
      const bm = LETTER_BITMAPS[c]
      expect(bm, `Buchstabe ${c}`).toHaveLength(DIGIT_ROWS)
      for (const row of bm) expect(row).toMatch(/^[.#]{5}$/)
    }
  })

  it('unterscheidet Buchstaben untereinander und von den Ziffern', () => {
    const alle = [...Object.values(DIGIT_BITMAPS), ...Object.values(LETTER_BITMAPS)].map((bm) =>
      bm.join(''),
    )
    expect(new Set(alle).size).toBe(alle.length)
  })

  it('ist unter glLedLetterA–E registriert, mit Namen und Canvas2D-Fallback', () => {
    for (const c of LETTERS) {
      const spec = glPresetSpecs[`glLedLetter${c}`]
      expect(spec).toBeDefined()
      expect(spec.name_de).toBe(`LED-Buchstabe ${c} (GPU)`)
      expect(spec.name_en).toBe(`LED Letter ${c} (GPU)`)
      expect(typeof spec.fallback.draw).toBe('function')
      expect(spec.frag).toContain('ledLamp(')
    }
  })

  it('lehnt unbekannte Buchstaben ab', () => {
    expect(() => makeLedLetterPreset('Z')).toThrow(/Bitmap/)
    expect(() => makeLedLetterPreset('a')).toThrow(/Bitmap/)
  })

  it('lehnt unbekannte Ziffern ab', () => {
    expect(() => makeLedDigitPreset(10)).toThrow(/Bitmap/)
    expect(() => makeLedDigitPreset(-1)).toThrow(/Bitmap/)
  })

  it('zeichnet den Fallback ohne Fehler auf einen 2D-Context', () => {
    const calls = []
    const ctx = new Proxy(
      { globalAlpha: 1, fillStyle: '' },
      {
        get: (t, p) => (p in t ? t[p] : (...a) => calls.push([p, ...a])),
        set: (t, p, v) => ((t[p] = v), true),
      },
    )
    const data = new Uint8Array(64).fill(128)
    expect(() =>
      makeLedDigitPreset(3).fallback.draw(ctx, data, 64, 800, 450, '#6ea8fe', 1),
    ).not.toThrow()
    // 35 Lampen + Gehaeuse: mindestens 36 Fuellungen
    expect(calls.filter((c) => c[0] === 'fill').length).toBeGreaterThanOrEqual(36)
  })
})
