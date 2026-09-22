// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TextManager } from '../../lib/textManager.js'

/**
 * Characterization-Tests für den TextManager.
 *
 * Zweck: Das AKTUELLE Verhalten festnageln, bevor die Datei in Module
 * aufgeteilt wird (siehe docs/REFACTORING-textManager.md). Die Erwartungen
 * beschreiben den Ist-Zustand – auch dort, wo er überraschend ist; solche
 * Stellen sind als "Quirk" kommentiert und dürfen sich beim Refactoring
 * NICHT ändern.
 */

const T0 = 1_700_000_000_000

/** Canvas-Stub: measureText liefert 10px pro Zeichen (deterministisch). */
function makeCanvas(width = 800, height = 600) {
  const ctx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    letterSpacing: '0px',
    textAlign: '',
    textBaseline: '',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save: vi.fn(),
    restore: vi.fn(),
    measureText: (text) => ({ width: String(text).length * 10 }),
  }
  return { width, height, getContext: () => ctx, _ctx: ctx }
}

/** Setzt die Systemzeit auf T0 + ms (Animationen lesen Date.now()). */
function at(ms) {
  vi.setSystemTime(T0 + ms)
}

describe('TextManager', () => {
  let tm

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    tm = new TextManager({})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ───────────────────────────── add() / Objekt-Defaults ────────────────────

  describe('add()', () => {
    it('legt ein vollständiges Text-Objekt mit Standardwerten an', () => {
      const t = tm.add('Hallo')

      expect(t.type).toBe('text')
      expect(t.content).toBe('Hallo')
      expect(t.relX).toBe(0.5)
      expect(t.relY).toBe(0.5)
      expect(t.fontSize).toBe(48)
      expect(t.fontFamily).toBe('Arial')
      expect(t.color).toBe('#ff0000')
      expect(t.textAlign).toBe('center')
      expect(t.textBaseline).toBe('middle')
      expect(t.opacity).toBe(100)
      expect(t.letterSpacing).toBe(0)
      expect(t.lineHeightMultiplier).toBe(120)
      expect(t.rotation).toBe(0)
      expect(t.shadow).toEqual({ color: '#000000', blur: 0, offsetX: 0, offsetY: 0 })
      expect(t.stroke).toEqual({ enabled: false, color: '#000000', width: 2 })
      expect(tm.textObjects).toContain(t)
    })

    it('übernimmt Optionen und erlaubt 0 als Wert für opacity', () => {
      const t = tm.add('X', { relX: 0.1, fontSize: 12, opacity: 0, letterSpacing: -5 })
      expect(t.relX).toBe(0.1)
      expect(t.fontSize).toBe(12)
      expect(t.opacity).toBe(0)
      expect(t.letterSpacing).toBe(-5)
    })

    it('verwendet "Neuer Text" als Fallback für leeren Inhalt', () => {
      expect(tm.add('').content).toBe('Neuer Text')
      expect(tm.add().content).toBe('Neuer Text')
    })

    it('aktiviert Audio-Reaktivität standardmäßig, Animationen dagegen nicht', () => {
      const t = tm.add('A')
      expect(t.audioReactive.enabled).toBe(true)
      expect(t.audioReactive.source).toBe('bass')
      expect(t.animation.type).toBe('none')
      for (const name of ['typewriter', 'fade', 'scale', 'slide']) {
        expect(t.animation[name].enabled).toBe(false)
      }
      expect(t.animation._state).toEqual({ startTime: null, isPlaying: false, currentIndex: 0 })
    })

    it('vergibt eindeutige IDs', () => {
      const ids = new Set([tm.add('a').id, tm.add('b').id, tm.add('c').id])
      expect(ids.size).toBe(3)
    })
  })

  // ───────────────────────────── Bounds / Hit-Testing ───────────────────────

  describe('getObjectBounds()', () => {
    /** Basis-Text: 'AB' → measureText = 20px, lineHeight = 40 * 1.2 = 48 */
    const base = { content: 'AB', fontSize: 40, relX: 0.5, relY: 0.5 }

    it('berechnet zentrierte Bounds inkl. minimalem Klick-Padding', () => {
      const t = tm.add(base.content, base)
      const bounds = tm.getObjectBounds(t, makeCanvas())

      // basePadding = max(3, fontSize * 0.05) = max(3, 2) = 3
      expect(bounds).toEqual({ x: 387, y: 273, width: 26, height: 54 })
    })

    it('skaliert das Padding bei großen Schriften mit der Schriftgröße', () => {
      const t = tm.add('AB', { ...base, fontSize: 100 })
      const bounds = tm.getObjectBounds(t, makeCanvas())
      // basePadding = 100 * 0.05 = 5; lineHeight = 120
      expect(bounds).toEqual({ x: 385, y: 235, width: 30, height: 130 })
    })

    it('berücksichtigt letterSpacing (n-1 Lücken)', () => {
      const t = tm.add('AB', { ...base, letterSpacing: 5 })
      const bounds = tm.getObjectBounds(t, makeCanvas())
      // maxWidth = 20 + 5 * (2-1) = 25
      expect(bounds.width).toBe(25 + 6)
      expect(bounds.x).toBe(400 - 12.5 - 3)
    })

    it('nimmt bei mehrzeiligem Text die breiteste Zeile', () => {
      const t = tm.add('AB\nCDE', base)
      const bounds = tm.getObjectBounds(t, makeCanvas())
      // maxWidth = 30, Höhe = 2 * 48
      expect(bounds).toEqual({ x: 382, y: 249, width: 36, height: 102 })
    })

    it('erweitert die Bounds um die Kontur-Breite', () => {
      const t = tm.add('AB', { ...base, strokeEnabled: true, strokeWidth: 4 })
      const bounds = tm.getObjectBounds(t, makeCanvas())
      expect(bounds).toEqual({ x: 383, y: 269, width: 34, height: 62 })
    })

    it('erweitert die Bounds asymmetrisch um Schatten-Blur und -Offset', () => {
      const t = tm.add('AB', { ...base, shadowBlur: 10, shadowOffsetX: 4, shadowOffsetY: -2 })
      const bounds = tm.getObjectBounds(t, makeCanvas())
      // links = max(0, 10-4) = 6, rechts = 14, oben = max(0, 10-(-2)) = 12, unten = 8
      expect(bounds).toEqual({ x: 381, y: 261, width: 46, height: 74 })
    })

    it('respektiert textAlign und textBaseline', () => {
      const left = tm.add('AB', { ...base, textAlign: 'left', textBaseline: 'top' })
      expect(tm.getObjectBounds(left, makeCanvas())).toMatchObject({ x: 397, y: 297 })

      const right = tm.add('AB', { ...base, textAlign: 'right', textBaseline: 'bottom' })
      expect(tm.getObjectBounds(right, makeCanvas())).toMatchObject({ x: 377, y: 249 })
    })

    it('gibt für Nicht-Text-Objekte null zurück', () => {
      expect(tm.getObjectBounds(null, makeCanvas())).toBeNull()
      expect(tm.getObjectBounds({ type: 'image' }, makeCanvas())).toBeNull()
    })

    it('stellt den Canvas-Context nach der Messung wieder her', () => {
      const canvas = makeCanvas()
      tm.getObjectBounds(tm.add('AB', base), canvas)
      expect(canvas._ctx.save).toHaveBeenCalledTimes(1)
      expect(canvas._ctx.restore).toHaveBeenCalledTimes(1)
    })
  })

  describe('findObjectAt() / isPointInRect()', () => {
    it('liefert das oberste Objekt an der Position', () => {
      const canvas = makeCanvas()
      const unten = tm.add('AB', { fontSize: 40 })
      const oben = tm.add('AB', { fontSize: 40 })

      expect(tm.findObjectAt(400, 300, canvas)).toBe(oben)
      expect(tm.textObjects[0]).toBe(unten)
    })

    it('gibt null zurück, wenn kein Objekt getroffen wurde', () => {
      tm.add('AB', { fontSize: 40 })
      expect(tm.findObjectAt(0, 0, makeCanvas())).toBeNull()
    })

    it('prüft Rechtecke inklusive der Ränder', () => {
      const rect = { x: 10, y: 20, width: 30, height: 40 }
      expect(tm.isPointInRect(10, 20, rect)).toBe(true)
      expect(tm.isPointInRect(40, 60, rect)).toBe(true)
      expect(tm.isPointInRect(9, 20, rect)).toBe(false)
      expect(tm.isPointInRect(41, 60, rect)).toBe(false)
    })
  })

  // ───────────────────────────── Canvas-Style ───────────────────────────────

  describe('Style-Anwendung', () => {
    it('setzt Font, Farbe, letterSpacing und Schatten beim Zeichnen', () => {
      const t = tm.add('A', {
        fontSize: 30,
        fontFamily: 'Courier',
        fontWeight: 'bold',
        fontStyle: 'italic',
        color: '#00ff00',
        letterSpacing: 4,
        shadowBlur: 8,
        shadowColor: '#112233',
        shadowOffsetX: 2,
        shadowOffsetY: 3,
      })
      const ctx = makeCanvas()._ctx
      tm.applyTextStyle(ctx, t)

      expect(ctx.font).toBe('italic bold 30px Courier')
      expect(ctx.fillStyle).toBe('#00ff00')
      expect(ctx.letterSpacing).toBe('4px')
      expect(ctx.shadowColor).toBe('#112233')
      expect(ctx.shadowBlur).toBe(8)
      expect(ctx.shadowOffsetX).toBe(2)
      expect(ctx.shadowOffsetY).toBe(3)
    })

    it('misst ohne Schatten', () => {
      const t = tm.add('A', { shadowBlur: 8, shadowColor: '#112233' })
      const ctx = makeCanvas()._ctx
      tm.applyTextStyleForMeasurement(ctx, t)

      expect(ctx.shadowColor).toBe('transparent')
      expect(ctx.shadowBlur).toBe(0)
    })

    it('setzt den Schatten vollständig zurück', () => {
      const ctx = makeCanvas()._ctx
      ctx.shadowColor = '#fff'
      ctx.shadowBlur = 20
      ctx.shadowOffsetX = 5
      ctx.shadowOffsetY = 5
      tm.resetShadow(ctx)

      expect(ctx.shadowColor).toBe('transparent')
      expect(ctx.shadowBlur).toBe(0)
      expect(ctx.shadowOffsetX).toBe(0)
      expect(ctx.shadowOffsetY).toBe(0)
    })

    it('addiert audio-reaktiven letterSpacing und erzwingt die Kontur', () => {
      const t = tm.add('A', { letterSpacing: 2 })
      const ctx = makeCanvas()._ctx
      const audio = {
        hasEffects: true,
        effects: { letterSpacing: { letterSpacing: 8 }, strokeWidth: { strokeWidth: 6 } },
      }
      tm.applyTextStyleWithAudio(ctx, t, audio, false)

      expect(ctx.letterSpacing).toBe('10px')
      expect(ctx.lineWidth).toBe(6) // max(statisch 2, audio 6)
      expect(ctx.lineJoin).toBe('round')
    })

    it('lässt den audio-reaktiven Glow den statischen Schatten überschreiben', () => {
      const t = tm.add('A', { shadowBlur: 5, shadowColor: '#000000' })
      const ctx = makeCanvas()._ctx
      const audio = {
        hasEffects: true,
        effects: { glow: { glowBlur: 30, glowColor: 'rgba(1,2,3,0.5)' } },
      }
      tm.applyTextStyleWithAudio(ctx, t, audio, true)

      expect(ctx.shadowColor).toBe('rgba(1,2,3,0.5)')
      expect(ctx.shadowBlur).toBe(30)
      expect(ctx.shadowOffsetX).toBe(0)
      expect(ctx.shadowOffsetY).toBe(0)
    })

    it('wählt das stärkste Leuchten aus allen Glow-Quellen', () => {
      const effects = {
        glow: { glowBlur: 10 },
        beatPulse: { glowBlur: 40 },
        bpmPulse: { glowBlur: 20 },
      }
      expect(tm._strongestGlow(effects).glowBlur).toBe(40)
      expect(tm._strongestGlow({ glow: { glowBlur: 0 } })).toBeNull()
      expect(tm._strongestGlow({})).toBeNull()
    })
  })

  // ───────────────────────────── Typewriter ─────────────────────────────────

  describe('_getTypewriterText()', () => {
    function typed(overrides = {}) {
      const t = tm.add('ABC')
      Object.assign(t.animation.typewriter, { enabled: true, speed: 100, ...overrides })
      return t
    }

    it('gibt bei deaktivierter Animation den vollen Text zurück', () => {
      const t = tm.add('ABC')
      expect(tm._getTypewriterText(t)).toEqual({
        text: 'ABC',
        showCursor: false,
        isComplete: true,
      })
    })

    it('tippt den Text zeichenweise', () => {
      const t = typed()

      // Quirk: der erste Frame zeigt bereits ein Zeichen (substring(0, index+1))
      expect(tm._getTypewriterText(t).text).toBe('A')
      at(100)
      expect(tm._getTypewriterText(t).text).toBe('AB')
      at(200)
      expect(tm._getTypewriterText(t).text).toBe('ABC')

      at(300)
      const done = tm._getTypewriterText(t)
      expect(done).toMatchObject({ text: 'ABC', isComplete: true })
      expect(t.animation._state.isPlaying).toBe(false)
    })

    it('zeigt während der Start-Verzögerung nichts an', () => {
      const t = typed({ startDelay: 500 })

      expect(tm._getTypewriterText(t)).toMatchObject({ text: '', isComplete: false })
      at(499)
      expect(tm._getTypewriterText(t).text).toBe('')
      at(500)
      expect(tm._getTypewriterText(t).text).toBe('A')
    })

    it('blendet den Cursor nach Abschluss aus – außer im Loop', () => {
      const ohneLoop = typed({ showCursor: true })
      const mitLoop = typed({ showCursor: true, loop: true })
      // Der erste Aufruf startet die Animation – beide bei T0
      tm._getTypewriterText(ohneLoop)
      tm._getTypewriterText(mitLoop)

      at(300)
      expect(tm._getTypewriterText(ohneLoop).showCursor).toBe(false)
      expect(tm._getTypewriterText(mitLoop).showCursor).toBe(true)
    })

    it('startet nach loopDelay neu', () => {
      const t = typed({ loop: true, loopDelay: 1000 })
      tm._getTypewriterText(t)

      at(300)
      expect(tm._getTypewriterText(t)).toMatchObject({ text: 'ABC', isComplete: true })
      at(1299)
      expect(tm._getTypewriterText(t).text).toBe('ABC')
      at(1300)
      expect(tm._getTypewriterText(t)).toMatchObject({ text: '', isComplete: false })
      at(1400)
      expect(tm._getTypewriterText(t).text).toBe('AB')
    })

    it('setzt den Zustand über restartTypewriter() zurück', () => {
      const t = typed()
      at(300)
      tm._getTypewriterText(t)
      tm.restartTypewriter(t)

      expect(t.animation._state).toMatchObject({
        startTime: null,
        isPlaying: false,
        currentIndex: 0,
      })
      expect(tm._getTypewriterText(t).text).toBe('A')
    })
  })

  // ───────────────────────────── Fade ───────────────────────────────────────

  describe('_getFadeOpacity()', () => {
    function faded(overrides = {}) {
      const t = tm.add('A')
      Object.assign(t.animation.fade, {
        enabled: true,
        duration: 1000,
        easing: 'linear',
        ...overrides,
      })
      return t
    }

    it('ist bei deaktivierter Animation voll sichtbar', () => {
      expect(tm._getFadeOpacity(tm.add('A'))).toEqual({ opacity: 1, isComplete: true })
    })

    it('blendet linear ein (direction "in")', () => {
      const t = faded({ direction: 'in' })

      expect(tm._getFadeOpacity(t)).toEqual({ opacity: 0, isComplete: false })
      at(250)
      expect(tm._getFadeOpacity(t).opacity).toBeCloseTo(0.25, 5)
      at(1000)
      expect(tm._getFadeOpacity(t)).toEqual({ opacity: 1, isComplete: true })
    })

    it('blendet aus (direction "out")', () => {
      const t = faded({ direction: 'out' })

      expect(tm._getFadeOpacity(t).opacity).toBe(1)
      at(400)
      expect(tm._getFadeOpacity(t).opacity).toBeCloseTo(0.6, 5)
      at(1000)
      expect(tm._getFadeOpacity(t)).toEqual({ opacity: 0, isComplete: true })
    })

    it('hält während der Start-Verzögerung den Ausgangswert', () => {
      const ein = faded({ direction: 'in', startDelay: 300 })
      expect(tm._getFadeOpacity(ein)).toEqual({ opacity: 0, isComplete: false })

      const aus = faded({ direction: 'out', startDelay: 300 })
      expect(tm._getFadeOpacity(aus)).toEqual({ opacity: 1, isComplete: false })
      at(300)
      expect(tm._getFadeOpacity(aus).opacity).toBe(1)
    })

    it('blendet mit Anzeigedauer ein, hält und blendet wieder aus', () => {
      const t = faded({ direction: 'in', permanent: false, displayDuration: 2000 })

      tm._getFadeOpacity(t)
      at(500)
      expect(tm._getFadeOpacity(t).opacity).toBeCloseTo(0.5, 5)
      at(1500) // Halte-Phase
      expect(tm._getFadeOpacity(t)).toEqual({ opacity: 1, isComplete: false })
      at(3500) // Ausblenden zur Hälfte
      expect(tm._getFadeOpacity(t).opacity).toBeCloseTo(0.5, 5)
      at(4000)
      expect(tm._getFadeOpacity(t)).toEqual({ opacity: 0, isComplete: true })
    })

    it('durchläuft bei "inOut" immer Ein- und Ausblenden', () => {
      const t = faded({ direction: 'inOut' })

      tm._getFadeOpacity(t)
      at(1000) // hold = 0 → Ausblenden beginnt sofort, startet aber bei 1
      expect(tm._getFadeOpacity(t)).toEqual({ opacity: 1, isComplete: false })
      at(1500)
      expect(tm._getFadeOpacity(t).opacity).toBeCloseTo(0.5, 5)
      at(2000)
      expect(tm._getFadeOpacity(t)).toEqual({ opacity: 0, isComplete: true })
    })

    it('startet nach loopDelay neu', () => {
      const t = faded({ direction: 'in', loop: true, loopDelay: 500 })

      tm._getFadeOpacity(t)
      at(1000)
      expect(tm._getFadeOpacity(t)).toEqual({ opacity: 1, isComplete: true })
      at(1499)
      expect(tm._getFadeOpacity(t).opacity).toBe(1)
      at(1500)
      expect(tm._getFadeOpacity(t)).toEqual({ opacity: 0, isComplete: false })
      at(2000)
      expect(tm._getFadeOpacity(t).opacity).toBeCloseTo(0.5, 5)
    })

    it('setzt den Zustand über restartFade() zurück', () => {
      const t = faded({ direction: 'in' })
      tm._getFadeOpacity(t)
      at(800)
      tm.restartFade(t)

      expect(t.animation._state.fadeStartTime).toBeNull()
      expect(tm._getFadeOpacity(t).opacity).toBe(0)
    })

    it('ergänzt einen fehlenden _state defensiv', () => {
      const t = faded({ direction: 'in' })
      delete t.animation._state
      expect(() => tm._getFadeOpacity(t)).not.toThrow()
      expect(t.animation._state.fadeStartTime).toBe(T0)
    })
  })

  // ───────────────────────────── Scale ──────────────────────────────────────

  describe('_getScaleValue()', () => {
    function scaled(overrides = {}) {
      const t = tm.add('A')
      Object.assign(t.animation.scale, {
        enabled: true,
        duration: 1000,
        easing: 'linear',
        startScale: 0,
        endScale: 2,
        ...overrides,
      })
      return t
    }

    it('ist bei deaktivierter Animation neutral', () => {
      expect(tm._getScaleValue(tm.add('A'))).toEqual({ scale: 1, isComplete: true })
    })

    it('interpoliert von startScale nach endScale (direction "in")', () => {
      const t = scaled({ direction: 'in' })

      expect(tm._getScaleValue(t)).toEqual({ scale: 0, isComplete: false })
      at(500)
      expect(tm._getScaleValue(t).scale).toBeCloseTo(1, 5)
      at(1000)
      expect(tm._getScaleValue(t)).toEqual({ scale: 2, isComplete: true })
    })

    it('zoomt heraus (direction "out")', () => {
      const t = scaled({ direction: 'out' })

      expect(tm._getScaleValue(t).scale).toBe(2)
      at(500)
      expect(tm._getScaleValue(t).scale).toBeCloseTo(1, 5)
      at(1000)
      expect(tm._getScaleValue(t)).toEqual({ scale: 0, isComplete: true })
    })

    it('hält bei nicht-permanenter Anzeige und zoomt danach zurück', () => {
      const t = scaled({ direction: 'in', permanent: false, displayDuration: 1000 })

      tm._getScaleValue(t)
      at(1500) // Halte-Phase
      expect(tm._getScaleValue(t)).toEqual({ scale: 2, isComplete: false })
      at(2500)
      expect(tm._getScaleValue(t).scale).toBeCloseTo(1, 5)
      at(3000)
      expect(tm._getScaleValue(t)).toEqual({ scale: 0, isComplete: true })
    })

    it('startet nach loopDelay neu', () => {
      const t = scaled({ direction: 'in', loop: true, loopDelay: 500 })

      tm._getScaleValue(t)
      at(1000)
      expect(tm._getScaleValue(t).isComplete).toBe(true)
      at(1500)
      expect(tm._getScaleValue(t)).toEqual({ scale: 0, isComplete: false })
    })

    it('setzt den Zustand über restartScale() zurück', () => {
      const t = scaled({ direction: 'in' })
      tm._getScaleValue(t)
      tm.restartScale(t)
      expect(t.animation._state.scaleStartTime).toBeNull()
    })
  })

  // ───────────────────────────── Slide ──────────────────────────────────────

  describe('_getSlideOffset()', () => {
    function slid(overrides = {}) {
      const t = tm.add('A')
      Object.assign(t.animation.slide, {
        enabled: true,
        duration: 1000,
        easing: 'linear',
        from: 'left',
        distance: 100,
        ...overrides,
      })
      return t
    }

    it('ist bei deaktivierter Animation ohne Versatz', () => {
      expect(tm._getSlideOffset(tm.add('A'), 800, 600)).toEqual({
        offsetX: 0,
        offsetY: 0,
        isComplete: true,
      })
    })

    it('fährt von links herein (direction "in")', () => {
      const t = slid({ direction: 'in' })

      expect(tm._getSlideOffset(t, 800, 600)).toEqual({
        offsetX: -800,
        offsetY: 0,
        isComplete: false,
      })
      at(500)
      expect(tm._getSlideOffset(t, 800, 600).offsetX).toBeCloseTo(-400, 5)
      at(1000)
      expect(tm._getSlideOffset(t, 800, 600)).toEqual({
        offsetX: 0,
        offsetY: 0,
        isComplete: true,
      })
    })

    it('fährt nach oben heraus (direction "out", from "top")', () => {
      const t = slid({ direction: 'out', from: 'top' })

      expect(tm._getSlideOffset(t, 800, 600).offsetY).toBeCloseTo(0, 5) // -0
      at(500)
      expect(tm._getSlideOffset(t, 800, 600).offsetY).toBeCloseTo(-300, 5)
      at(1000)
      expect(tm._getSlideOffset(t, 800, 600)).toEqual({
        offsetX: 0,
        offsetY: -600,
        isComplete: true,
      })
    })

    it('rechnet die Distanz prozentual zur Canvas-Größe', () => {
      const t = slid({ direction: 'in', from: 'right', distance: 50 })
      expect(tm._getSlideOffset(t, 800, 600).offsetX).toBe(400)
    })

    it('hält bei nicht-permanenter Anzeige und fährt danach wieder hinaus', () => {
      const t = slid({ direction: 'in', permanent: false, displayDuration: 1000 })

      tm._getSlideOffset(t, 800, 600)
      at(1500)
      expect(tm._getSlideOffset(t, 800, 600)).toEqual({
        offsetX: 0,
        offsetY: 0,
        isComplete: false,
      })
      at(2500)
      expect(tm._getSlideOffset(t, 800, 600).offsetX).toBeCloseTo(-400, 5)
      at(3000)
      expect(tm._getSlideOffset(t, 800, 600)).toEqual({
        offsetX: -800,
        offsetY: 0,
        isComplete: true,
      })
    })

    it('startet nach loopDelay neu', () => {
      const t = slid({ direction: 'in', loop: true, loopDelay: 500 })

      tm._getSlideOffset(t, 800, 600)
      at(1000)
      expect(tm._getSlideOffset(t, 800, 600).isComplete).toBe(true)
      at(1500)
      expect(tm._getSlideOffset(t, 800, 600)).toEqual({
        offsetX: -800,
        offsetY: 0,
        isComplete: false,
      })
    })

    it('setzt den Zustand über restartSlide() zurück', () => {
      const t = slid({ direction: 'in' })
      tm._getSlideOffset(t, 800, 600)
      tm.restartSlide(t)
      expect(t.animation._state.slideStartTime).toBeNull()
    })
  })

  // ───────────────────────────── Anzeigedauer ───────────────────────────────

  describe('_getDisplayOpacity()', () => {
    it('ist ohne laufende Animation voll sichtbar', () => {
      expect(tm._getDisplayOpacity(tm.add('A'))).toBe(1)
    })

    it('ignoriert permanente und geloopte Animationen', () => {
      const permanent = tm.add('A')
      Object.assign(permanent.animation.fade, { enabled: true, permanent: true })
      tm._getFadeOpacity(permanent)
      at(99_000)
      expect(tm._getDisplayOpacity(permanent)).toBe(1)

      const loop = tm.add('A')
      Object.assign(loop.animation.fade, { enabled: true, permanent: false, loop: true })
      tm._getFadeOpacity(loop)
      at(99_000)
      expect(tm._getDisplayOpacity(loop)).toBe(1)
    })

    it('blendet den Typewriter nach Tippdauer + Anzeigedauer in 500ms aus', () => {
      const t = tm.add('AB')
      Object.assign(t.animation.typewriter, {
        enabled: true,
        speed: 100,
        permanent: false,
        displayDuration: 1000,
      })
      tm._getTypewriterText(t) // setzt _state.startTime

      // Zyklus = 2 Zeichen * 100ms + 1000ms Anzeigedauer = 1200ms
      at(1199)
      expect(tm._getDisplayOpacity(t)).toBe(1)
      at(1450)
      expect(tm._getDisplayOpacity(t)).toBeCloseTo(0.5, 5)
      at(1700)
      expect(tm._getDisplayOpacity(t)).toBe(0)
    })

    it('nimmt bei mehreren Animationen das späteste Zyklus-Ende', () => {
      const t = tm.add('A')
      Object.assign(t.animation.fade, {
        enabled: true,
        permanent: false,
        duration: 500,
        displayDuration: 500,
        direction: 'in',
      })
      Object.assign(t.animation.slide, {
        enabled: true,
        permanent: false,
        duration: 1000,
        displayDuration: 2000,
        direction: 'in',
      })
      tm._getFadeOpacity(t) // Zyklus = 500 * 2 + 500 = 1500
      tm._getSlideOffset(t, 800, 600) // Zyklus = 1000 * 2 + 2000 = 4000

      at(3999)
      expect(tm._getDisplayOpacity(t)).toBe(1)
      at(4500)
      expect(tm._getDisplayOpacity(t)).toBe(0)
    })
  })

  // ───────────────────────────── Audio-Reaktive Effekte ─────────────────────

  describe('_calculateTextEffectValue()', () => {
    it('bildet die Basis-Effekte linear auf ihren Wertebereich ab', () => {
      expect(tm._calculateTextEffectValue('hue', 0.5)).toEqual({ hueRotate: 360 })
      expect(tm._calculateTextEffectValue('brightness', 0.5)).toEqual({ brightness: 120 })
      expect(tm._calculateTextEffectValue('scale', 0.5)).toEqual({ scale: 1.25 })
      expect(tm._calculateTextEffectValue('letterSpacing', 0.5)).toEqual({ letterSpacing: 15 })
      expect(tm._calculateTextEffectValue('strokeWidth', 0.5)).toEqual({ strokeWidth: 5 })
    })

    it('liefert Glow als Blur + Farbe', () => {
      const glow = tm._calculateTextEffectValue('glow', 0.5)
      expect(glow.glowBlur).toBe(25)
      expect(glow.glowColor).toBe('rgba(139, 92, 246, 0.75)')
    })

    it('berücksichtigt das Minimum bei opacity', () => {
      expect(tm._calculateTextEffectValue('opacity', 0.5, { minimum: 40 })).toEqual({ opacity: 70 })
      expect(tm._calculateTextEffectValue('opacity', 0)).toEqual({ opacity: 0 })
      expect(tm._calculateTextEffectValue('opacity', 1)).toEqual({ opacity: 100 })
    })

    it('wendet die Ease-Out-Kurve an, wenn ease gesetzt ist', () => {
      // level = 1 - (1 - 0.5)^3 = 0.875
      expect(tm._calculateTextEffectValue('hue', 0.5, { ease: true }).hueRotate).toBeCloseTo(630, 5)
    })

    it('hält shake unterhalb der Schwelle bei 0', () => {
      expect(tm._calculateTextEffectValue('shake', 0.2)).toEqual({ shakeX: 0, shakeY: 0 })

      const shake = tm._calculateTextEffectValue('shake', 1)
      expect(Math.abs(shake.shakeX)).toBeLessThanOrEqual(15)
      expect(Math.abs(shake.shakeY)).toBeLessThanOrEqual(15)
    })

    it('liefert für unbekannte Namen die gemeinsame Bild-Engine', () => {
      // 'saturation' ist kein Text-Sonderfall → default-Zweig
      expect(tm._calculateTextEffectValue('saturation', 0.5)).toHaveProperty('saturation')
    })
  })

  describe('getAudioReactiveValues()', () => {
    afterEach(() => {
      delete window.audioAnalysisData
    })

    it('gibt ohne Konfiguration, ohne enabled oder ohne Audio-Daten null zurück', () => {
      window.audioAnalysisData = { bass: 255, mid: 0, treble: 0, volume: 255 }
      expect(tm.getAudioReactiveValues(null)).toBeNull()
      expect(tm.getAudioReactiveValues({ enabled: false })).toBeNull()

      delete window.audioAnalysisData
      expect(tm.getAudioReactiveValues({ enabled: true, effects: {} })).toBeNull()
    })

    it('gibt null zurück, wenn kein Effekt aktiviert ist', () => {
      window.audioAnalysisData = { bass: 255, mid: 0, treble: 0, volume: 255 }
      const t = tm.add('A')
      expect(tm.getAudioReactiveValues(t.audioReactive)).toBeNull()
    })

    it('berechnet Werte für aktivierte Effekte', () => {
      window.audioAnalysisData = { bass: 255, mid: 0, treble: 0, volume: 255 }
      const t = tm.add('A')
      Object.assign(t.audioReactive.effects.hue, { enabled: true, intensity: 100 })

      const result = tm.getAudioReactiveValues(t.audioReactive)
      expect(result.hasEffects).toBe(true)
      expect(result.effects.hue.hueRotate).toBeGreaterThan(0)
      expect(result.effects.hue.hueRotate).toBeLessThanOrEqual(720)
      expect(result.effects.scale).toBeUndefined()
    })
  })

  // ───────────────────────────── Collection / Zeichnen ──────────────────────

  describe('Collection-API', () => {
    it('verschiebt ein Objekt an die oberste Ebene', () => {
      const a = tm.add('A')
      const b = tm.add('B')
      tm.moveToTop(a)
      expect(tm.textObjects).toEqual([b, a])

      tm.moveToTop({ id: 'unbekannt' })
      expect(tm.textObjects).toEqual([b, a])
    })

    it('aktualisiert verschachtelte Eigenschaften über updateProperty()', () => {
      const t = tm.add('A')
      tm.updateProperty(t, 'fontSize', 72)
      expect(t.fontSize).toBe(72)
      expect(() => tm.updateProperty(null, 'fontSize', 72)).not.toThrow()
    })

    it('liefert alle Texte und leert die Liste', () => {
      tm.add('A')
      tm.add('B')
      expect(tm.getAllTexts()).toHaveLength(2)
      tm.clear()
      expect(tm.getAllTexts()).toHaveLength(0)
    })
  })

  describe('draw()', () => {
    it('fängt Fehler beim Zeichnen ab, damit das Recording weiterläuft', () => {
      const fehler = vi.spyOn(console, 'error').mockImplementation(() => {})
      tm.add('A')
      tm.add('B')
      vi.spyOn(tm, 'drawText').mockImplementation(() => {
        throw new Error('boom')
      })
      const ctx = makeCanvas()._ctx

      expect(() => tm.draw(ctx, 800, 600)).not.toThrow()
      expect(fehler).toHaveBeenCalledTimes(2)
      fehler.mockRestore()
    })
  })
})
