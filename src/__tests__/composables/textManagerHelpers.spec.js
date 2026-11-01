import { describe, it, expect } from 'vitest'
import { textSlotMs, DEFAULT_SLOT_MS } from '../../composables/textManager/useTextSequence.js'
import { ensureTextObjectDefaults } from '../../composables/textManager/textObjectDefaults.js'
import { sortTextsById, textObjectsOf } from '../../composables/textManager/textOrder.js'

describe('textSlotMs', () => {
  it('ohne Animation gilt der Standardwert', () => {
    expect(textSlotMs({})).toBe(DEFAULT_SLOT_MS)
    expect(textSlotMs({ animation: { type: 'none' } })).toBe(DEFAULT_SLOT_MS)
  })

  it('nimmt die längste Einlauf- und Anzeigedauer der aktiven Effekte', () => {
    const obj = {
      animation: {
        type: 'mixed',
        fade: { enabled: true, duration: 800, displayDuration: 2000 },
        slide: { enabled: true, duration: 1200, displayDuration: 1000 },
        scale: { enabled: false, duration: 9000, displayDuration: 9000 },
      },
    }
    expect(textSlotMs(obj)).toBe(1200 + 2000 + 400)
  })

  it('aktive Effekte ohne Anzeigedauer nutzen 5000 ms', () => {
    expect(textSlotMs({ animation: { type: 'fade', fade: { enabled: true } } })).toBe(5400)
  })

  it('Animation ohne aktiven Effekt fällt auf den Standardwert zurück', () => {
    expect(textSlotMs({ animation: { type: 'fade', fade: { enabled: false } } })).toBe(4400)
  })

  it('globale Dauer überschreibt alles, mindestens 500 ms', () => {
    const opts = { globalEnabled: true, globalDuration: 2000 }
    expect(textSlotMs({ animation: { type: 'fade' } }, opts)).toBe(2400)
    expect(textSlotMs({}, { globalEnabled: true, globalDuration: 100 })).toBe(900)
  })
})

describe('ensureTextObjectDefaults', () => {
  it('lässt vollständige Objekte inhaltlich unverändert', () => {
    const animation = { type: 'fade' }
    const obj = {
      letterSpacing: 2,
      lineHeightMultiplier: 140,
      stroke: { enabled: true, color: '#111', width: 3 },
      shadow: { color: '#222', blur: 4, offsetX: 1, offsetY: 1 },
      animation,
    }
    expect(ensureTextObjectDefaults(obj)).toBe(obj)
    expect(obj.letterSpacing).toBe(2)
    expect(obj.stroke.enabled).toBe(true)
    expect(obj.animation).toBe(animation)
  })

  it('letterSpacing 0 bleibt 0', () => {
    const obj = { letterSpacing: 0 }
    ensureTextObjectDefaults(obj)
    expect(obj.letterSpacing).toBe(0)
  })
})

describe('textOrder', () => {
  it('sortiert stabil nach id, ohne das Original zu ändern', () => {
    const list = [{ id: 3 }, { id: 1 }, { id: 2 }]
    expect(sortTextsById(list).map((o) => o.id)).toEqual([1, 2, 3])
    expect(list.map((o) => o.id)).toEqual([3, 1, 2])
  })

  it('liefert eine leere Liste ohne Canvas-Manager', () => {
    expect(textObjectsOf({ value: null })).toEqual([])
  })
})
