import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  LED_TEXT_ID,
  LED_NUMBER_ID,
  DEFAULT_LED_CONFIG,
  isLedTextVisualizer,
  normalizeLedTextInput,
  normalizeLedField,
  normalizeLedConfig,
  parseLedText,
  formatClock,
  formatCountdown,
  ledDisplayText,
} from '../../../lib/visualizers/gl/ledTextSettings.js'
import { ledTextLayout, glyphPresetFor } from '../../../lib/visualizers/gl/ledText.js'
import {
  COLON_BITMAP,
  makeLedColonPreset,
  rowToBits,
} from '../../../lib/visualizers/gl/presets/glLedDigits.js'
import { Visualizers, glVisualizers } from '../../../lib/visualizers/index.js'
import { visualizerState } from '../../../lib/visualizers/core/state.js'

describe('gl/ledTextSettings – Text', () => {
  it('begrenzt die Eingabe auf 4 Zeilen à 24 Zeichen ohne Steuerzeichen', () => {
    expect(normalizeLedTextInput('a\r\nb\u0007c')).toBe('a\nbc')
    expect(normalizeLedTextInput('1\n2\n3\n4\n5')).toBe('1\n2\n3\n4')
    expect(normalizeLedTextInput('x'.repeat(30))).toHaveLength(24)
    expect(normalizeLedTextInput(null)).toBe('')
  })

  it('zerlegt Text in Großbuchstaben, schreibt Umlaute um und entfernt Rest', () => {
    expect(parseLedText('Hallo Welt!')).toEqual(['HALLO WELT'])
    expect(parseLedText('Grüße\n  2026 ')).toEqual(['GRUESSE', '2026'])
    expect(parseLedText('\n\n')).toEqual([])
  })

  it('lässt bei LED-Zahlen nur Ziffern, Leerzeichen und Doppelpunkt zu', () => {
    expect(parseLedText('Tor 12:30 ab', { digitsOnly: true })).toEqual(['12:30'])
    // Doppelpunkt nur bei Zahlen, nicht bei Text
    expect(parseLedText('12:30')).toEqual(['1230'])
  })
})

describe('gl/ledTextSettings – Uhrzeit und Countdown', () => {
  const now = new Date('2026-03-01T13:05:09Z')

  it('formatiert die Uhrzeit in der gewählten Zeitzone', () => {
    expect(formatClock(now, { timeZone: 'UTC' })).toBe('13:05:09')
    expect(formatClock(now, { timeZone: 'UTC', seconds: false })).toBe('13:05')
    // Winterzeit: Zürich = UTC+1
    expect(formatClock(now, { timeZone: 'Europe/Zurich' })).toBe('14:05:09')
  })

  it('zählt bis zum Ziel herunter, mit Tagen vorne und 0 nach Ablauf', () => {
    expect(formatCountdown(now, '2026-03-01T13:06:10Z')).toBe('00:01:01')
    expect(formatCountdown(now, '2026-03-03T17:15:09Z')).toBe('2 04:10:00')
    expect(formatCountdown(now, '2026-03-01T12:00:00Z')).toBe('00:00:00')
    expect(formatCountdown(now, '')).toBe('00:00:00')
    // Ohne Sekunden wird auf die volle Minute aufgerundet
    expect(formatCountdown(now, '2026-03-01T13:06:10Z', { seconds: false })).toBe('00:02')
  })

  it('liefert den Anzeigetext je Visualizer und Modus', () => {
    const cfg = { ledText: 'Hi', ledNumberText: '42', ledNumberTimeZone: 'UTC' }
    expect(ledDisplayText(LED_TEXT_ID, cfg, now)).toBe('Hi')
    expect(ledDisplayText(LED_NUMBER_ID, cfg, now)).toBe('42')
    expect(ledDisplayText(LED_NUMBER_ID, { ...cfg, ledNumberMode: 'clock' }, now)).toBe('13:05:09')
    expect(
      ledDisplayText(
        LED_NUMBER_ID,
        { ledNumberMode: 'countdown', ledCountdownTarget: '2026-03-01T13:05:39Z' },
        now,
      ),
    ).toBe('00:00:30')
  })
})

describe('gl/ledTextSettings – Validierung', () => {
  it('füllt fehlende Felder mit Standardwerten und verwirft ungültige', () => {
    expect(normalizeLedConfig(undefined)).toEqual(DEFAULT_LED_CONFIG)
    const cfg = normalizeLedConfig({
      ledNumberMode: 'bogus',
      ledNumberTimeZone: 'Mars/Base',
      ledCountdownTarget: 'kein Datum',
      ledNumberSeconds: 0,
    })
    expect(cfg.ledNumberMode).toBe('text')
    expect(cfg.ledNumberTimeZone).toBe('')
    expect(cfg.ledCountdownTarget).toBe('')
    // nur explizites false schaltet die Sekunden aus
    expect(cfg.ledNumberSeconds).toBe(true)
    expect(normalizeLedField('ledNumberSeconds', false)).toBe(false)
  })

  it('speichert das Countdown-Ziel als ISO-Zeit (UTC)', () => {
    expect(normalizeLedField('ledCountdownTarget', '2026-12-31T23:00:00+01:00')).toBe(
      '2026-12-31T22:00:00.000Z',
    )
  })

  it('erkennt beide LED-Visualizer', () => {
    expect(isLedTextVisualizer('glLedText')).toBe(true)
    expect(isLedTextVisualizer('glLedNumber')).toBe(true)
    expect(isLedTextVisualizer('glLedLetterA')).toBe(false)
  })
})

describe('gl/ledText – Layout und Glyphen', () => {
  it('verteilt die Zeichen zentriert auf gleich große Zellen', () => {
    const { cellW, cellH, cells } = ledTextLayout(['AB', 'C'], 200, 100)
    expect(cellW).toBe(100)
    expect(cellH).toBe(50)
    expect(cells).toEqual([
      { ch: 'A', x: 0, y: 0 },
      { ch: 'B', x: 100, y: 0 },
      { ch: 'C', x: 50, y: 50 },
    ])
  })

  it('lässt Leerzeichen als leere Zelle aus', () => {
    const { cells } = ledTextLayout(['A B'], 300, 100)
    expect(cells.map((c) => c.ch)).toEqual(['A', 'B'])
    expect(cells[1].x).toBe(200)
  })

  it('hat einen LED-Doppelpunkt im gleichen 5×7-Raster', () => {
    expect(COLON_BITMAP).toHaveLength(7)
    const spec = makeLedColonPreset()
    expect(spec.id).toBe('glLedColon')
    for (const bits of COLON_BITMAP.map(rowToBits)) expect(spec.frag).toContain(`${bits}.0`)
    expect(typeof spec.fallback.draw).toBe('function')
    // Doppelpunkt ist kein eigener Eintrag in der Visualizer-Liste
    expect(Visualizers.glLedColon).toBeUndefined()
  })

  it('findet für A–Z, 0–9 und ":" ein Glyphen-Preset', () => {
    expect(glyphPresetFor('Q').id).toBe('glLedLetterQ')
    expect(glyphPresetFor('7').id).toBe('glLedDigit7')
    expect(glyphPresetFor(':').id).toBe('glLedColon')
    expect(glyphPresetFor(' ')).toBeNull()
  })
})

describe('gl/ledText – Visualizer', () => {
  // Ohne WebGL2 zeichnen die Glyphen ihren Canvas2D-Fallback in ein
  // (gestubtes) OffscreenCanvas; gezählt werden die Kopien auf das Ziel.
  const mockCtx = (calls) =>
    new Proxy(
      { globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1 },
      {
        get: (t, p) => (p in t ? t[p] : (...a) => calls.push([p, ...a])),
        set: (t, p, v) => ((t[p] = v), true),
      },
    )

  beforeEach(() => {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(w, h) {
          this.width = w
          this.height = h
        }
        getContext(type) {
          return type === '2d' ? mockCtx([]) : null
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    visualizerState._ledText = null
  })

  const drawnCells = (id, config) => {
    const calls = []
    visualizerState._ledText = { key: 'test', ...config }
    Visualizers[id].draw(mockCtx(calls), new Uint8Array(64).fill(90), 64, 800, 200, '#ff0', 1)
    return calls.filter((c) => c[0] === 'drawImage')
  }

  it('ist als GPU-Visualizer registriert', () => {
    for (const id of [LED_TEXT_ID, LED_NUMBER_ID]) {
      expect(glVisualizers[id]).toBeDefined()
      expect(Visualizers[id]).toBe(glVisualizers[id])
      expect(Visualizers[id].kind).toBe('gl')
      expect(Visualizers[id].ledText).toBe(true)
    }
  })

  it('zeichnet jedes Zeichen des Texts in eine eigene Zelle', () => {
    const cells = drawnCells(LED_TEXT_ID, { ledText: 'HI YOU' })
    expect(cells).toHaveLength(5)
    // 6 Spalten à 133 px (1 px Rand links), Leerzeichen bleibt leer
    expect(cells.map((c) => c[2])).toEqual([1, 134, 400, 533, 666])
  })

  it('zeichnet die Uhrzeit mit Doppelpunkten', () => {
    const cells = drawnCells(LED_NUMBER_ID, { ledNumberMode: 'clock', ledNumberSeconds: false })
    // HH:MM → 5 Zellen
    expect(cells).toHaveLength(5)
  })

  it('zeichnet bei leerem Text nichts', () => {
    expect(drawnCells(LED_TEXT_ID, { ledText: '  !? ' })).toHaveLength(0)
    expect(drawnCells(LED_NUMBER_ID, { ledNumberText: 'abc' })).toHaveLength(0)
  })
})
