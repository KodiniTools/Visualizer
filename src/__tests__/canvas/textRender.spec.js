// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  applyTextTransform,
  computeDeformation,
  computeOpacity,
  computePosition,
  computeTextTransform,
} from '../../lib/textManager/render/transform/index.js'
import { buildFilterString } from '../../lib/textManager/render/filters.js'
import { drawTextLines, drawTypewriterCursor } from '../../lib/textManager/render/textLines.js'
import { drawText } from '../../lib/textManager/render/drawText.js'
import { createTextObject } from '../../lib/textManager/createTextObject.js'

/**
 * Tests für die Render-Module (docs/REFACTORING-textManager.md, Schritt 5).
 */

const T0 = 1_700_000_000_000

/** Audio-Ergebnis in der Form, die getAudioReactiveValues liefert. */
function audio(effects) {
  return { hasEffects: true, effects }
}

/** Canvas-Context-Stub, der alle Aufrufe und Zuweisungen protokolliert. */
function recordingCtx() {
  const calls = []
  return new Proxy(
    {
      canvas: { width: 800, height: 600 },
      textAlign: 'center',
      fillStyle: '#000',
      globalCompositeOperation: 'source-over',
      measureText: (t) => ({ width: String(t).length * 10 }),
      calls,
    },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop]
        if (typeof prop === 'symbol') return undefined
        return (...args) => calls.push([prop, ...args])
      },
      set: (target, prop, value) => {
        calls.push(['set:' + String(prop), value])
        target[prop] = value
        return true
      },
    },
  )
}

describe('computeTextTransform', () => {
  const canvas = [800, 600]

  it('nimmt ohne Audio und Animation die statischen Werte', () => {
    const t = createTextObject('A', { relX: 0.25, relY: 0.5, opacity: 80, rotation: 10 })
    const r = computeTextTransform(t, null, ...canvas, T0)

    expect(r.opacity).toBeCloseTo(0.8, 10)
    expect(r.pixelX).toBe(200)
    expect(r.pixelY).toBe(300)
    expect(r.scale).toBe(1)
    expect(r.totalRotation).toBe(10)
    expect(r).toMatchObject({ skewX: 0, skewY: 0, stretchX: 1, stretchY: 1, flipScaleX: 1 })
    expect(r.strobeBrightnessMultiplier).toBe(100)
  })

  it('moduliert die Deckkraft mit Audio-Opacity und Strobe, statt sie zu ersetzen', () => {
    const t = createTextObject('A', { opacity: 50 })
    const r = computeTextTransform(
      t,
      audio({ opacity: { opacity: 50 }, strobe: { strobeOpacity: 0.5, strobeBrightness: 180 } }),
      ...canvas,
      T0,
    )

    // 50% Slider * 50% Audio * 0.5 Strobe
    expect(r.opacity).toBeCloseTo(0.125, 10)
    expect(r.strobeBrightnessMultiplier).toBe(180)
  })

  it('addiert Shake, Bounce und Swing auf die Position', () => {
    const t = createTextObject('A')
    const r = computeTextTransform(
      t,
      audio({ shake: { shakeX: 5, shakeY: -3 }, bounce: { bounceY: -10 }, swing: { swingX: 7 } }),
      ...canvas,
      T0,
    )

    expect(r.pixelX).toBe(400 + 5 + 7)
    expect(r.pixelY).toBe(300 - 3 - 10)
  })

  it('multipliziert alle Skalierungsquellen', () => {
    const t = createTextObject('A')
    const r = computeTextTransform(
      t,
      audio({
        scale: { scale: 1.5 },
        beatPulse: { scale: 2 },
        zoomPunch: { scale: 1.1 },
        perspective3d: { perspective3dScale: 2, perspective3dSkewX: 4, perspective3dSkewY: 2 },
      }),
      ...canvas,
      T0,
    )

    expect(r.scale).toBeCloseTo(1.5 * 2 * 1.1 * 2, 10)
    expect(r.skewX).toBe(4)
    expect(r.skewY).toBe(2)
  })

  it('addiert Skew auf die Perspektiv-Scherung', () => {
    const t = createTextObject('A')
    const r = computeTextTransform(
      t,
      audio({
        perspective3d: { perspective3dSkewX: 4, perspective3dSkewY: 2 },
        skew: { skewX: 6, skewY: 3 },
      }),
      ...canvas,
      T0,
    )

    expect(r.skewX).toBe(10)
    expect(r.skewY).toBe(5)
  })

  it('begrenzt den Beat-Flip, damit der Text nicht auf Breite 0 kollabiert', () => {
    const t = createTextObject('A')
    const nah = computeTextTransform(t, audio({ beatFlip: { flipScaleX: 0.001 } }), ...canvas, T0)
    expect(nah.flipScaleX).toBeCloseTo(0.02, 10)

    const negativ = computeTextTransform(
      createTextObject('A'),
      audio({ beatFlip: { flipScaleX: -0.001 } }),
      ...canvas,
      T0,
    )
    expect(negativ.flipScaleX).toBeCloseTo(-0.02, 10)

    const gross = computeTextTransform(
      createTextObject('A'),
      audio({ beatFlip: { flipScaleX: -1 } }),
      ...canvas,
      T0,
    )
    expect(gross.flipScaleX).toBe(-1)
  })

  it('addiert die Audio-Rotation zur statischen Drehung', () => {
    const t = createTextObject('A', { rotation: 20 })
    const r = computeTextTransform(t, audio({ rotation: { rotationAngle: -5 } }), ...canvas, T0)
    expect(r.totalRotation).toBe(15)
  })

  it('bezieht die Slide-Animation in die Position ein', () => {
    const t = createTextObject('A')
    Object.assign(t.animation.slide, {
      enabled: true,
      from: 'left',
      distance: 100,
      direction: 'in',
      duration: 1000,
      easing: 'linear',
    })

    expect(computeTextTransform(t, null, ...canvas, T0).pixelX).toBe(400 - 800)
    expect(computeTextTransform(t, null, ...canvas, T0 + 500).pixelX).toBeCloseTo(0, 10)
  })

  it('wertet Fade und Anzeigedauer VOR Slide und Scale aus', () => {
    // Reihenfolge-Regression: getDisplayOpacity liest die Startzeitpunkte der
    // anderen Animationen. Liefe Slide zuerst, wuerde der erste Frame bereits
    // eine Anzeigedauer sehen und anders ausblenden.
    const t = createTextObject('A')
    Object.assign(t.animation.slide, {
      enabled: true,
      direction: 'in',
      duration: 100,
      permanent: false,
      displayDuration: 0,
    })

    expect(computeTextTransform(t, null, ...canvas, T0).opacity).toBe(1)
  })
})

describe('applyTextTransform', () => {
  const neutral = {
    pixelX: 400,
    pixelY: 300,
    scale: 1,
    totalRotation: 0,
    skewX: 0,
    skewY: 0,
    stretchX: 1,
    stretchY: 1,
    flipScaleX: 1,
  }

  it('lässt den Context unberührt, wenn nichts zu transformieren ist', () => {
    const ctx = recordingCtx()
    applyTextTransform(ctx, neutral)
    expect(ctx.calls).toEqual([])
  })

  it('dreht und skaliert um die Text-Position', () => {
    const ctx = recordingCtx()
    applyTextTransform(ctx, { ...neutral, totalRotation: 90, scale: 2 })

    expect(ctx.calls).toEqual([
      ['translate', 400, 300],
      ['rotate', Math.PI / 2],
      ['scale', 2, 2],
      ['translate', -400, -300],
    ])
  })

  it('nutzt bei Elastic die asymmetrische Skalierung inklusive Gesamt-Scale', () => {
    const ctx = recordingCtx()
    applyTextTransform(ctx, { ...neutral, scale: 2, stretchX: 1.5, stretchY: 0.5 })

    expect(ctx.calls).toContainEqual(['scale', 3, 1])
  })

  it('wendet Beat-Flip und Scherung an', () => {
    const ctx = recordingCtx()
    applyTextTransform(ctx, { ...neutral, flipScaleX: -1, skewX: 45, skewY: 0 })

    expect(ctx.calls).toContainEqual(['scale', -1, 1])
    const transform = ctx.calls.find((c) => c[0] === 'transform')
    expect(transform[3]).toBeCloseTo(1, 10) // tan(45°)
  })
})

describe('buildFilterString', () => {
  it('ist ohne Effekte und ohne Strobe leer', () => {
    expect(buildFilterString(null, 100)).toBe('')
    expect(buildFilterString({ hasEffects: false }, 100)).toBe('')
  })

  it('setzt Strobe-Helligkeit auch ohne andere Effekte', () => {
    expect(buildFilterString(null, 160)).toBe('brightness(160%)')
  })

  it('kombiniert Helligkeit mit der Strobe-Helligkeit multiplikativ', () => {
    // 80% Grundhelligkeit * 150% Strobe = 120%
    expect(buildFilterString(audio({ brightness: { brightness: 80 } }), 150)).toBe(
      'brightness(120%)',
    )
  })

  it('lässt die Helligkeit weg, wenn sie kombiniert genau 100% ergibt', () => {
    // 50% * 200% = 100% ⇒ neutral, kein Filter noetig
    expect(buildFilterString(audio({ brightness: { brightness: 50 } }), 200)).toBe('')
  })

  it('reiht die Farbfilter in fester Reihenfolge', () => {
    const s = buildFilterString(
      audio({
        hue: { hueRotate: 90 },
        saturation: { saturation: 150 },
        contrast: { contrast: 120 },
        blur: { blur: 2 },
      }),
      100,
    )
    expect(s).toBe('hue-rotate(90deg) saturate(150%) contrast(120%) blur(2px)')
  })

  it('lässt Filter mit Wert 0 weg', () => {
    const s = buildFilterString(
      audio({ grayscale: { grayscale: 0 }, sepia: { sepia: 0 }, invert: { invert: 0 } }),
      100,
    )
    expect(s).toBe('')
  })
})

describe('drawTextLines', () => {
  const layout = { pixelX: 400, startY: 300, lineHeight: 50 }

  it('zeichnet jede Zeile einmal', () => {
    const ctx = recordingCtx()
    const t = createTextObject('A')
    drawTextLines(ctx, t, { ...layout, lines: ['eins', 'zwei'], audioReactive: null })

    expect(ctx.calls).toEqual([
      ['fillText', 'eins', 400, 300],
      ['fillText', 'zwei', 400, 350],
    ])
  })

  it('zeichnet die Kontur vor der Füllung', () => {
    const ctx = recordingCtx()
    const t = createTextObject('A', { strokeEnabled: true })
    drawTextLines(ctx, t, { ...layout, lines: ['x'], audioReactive: null })

    expect(ctx.calls.map((c) => c[0])).toEqual(['strokeText', 'fillText'])
  })

  it('aktiviert die Kontur auch audio-reaktiv', () => {
    const ctx = recordingCtx()
    const t = createTextObject('A')
    drawTextLines(ctx, t, {
      ...layout,
      lines: ['x'],
      audioReactive: audio({ strokeWidth: { strokeWidth: 4 } }),
    })

    expect(ctx.calls.map((c) => c[0])).toContain('strokeText')
  })

  it('zeichnet beim Wave-Effekt buchstabenweise', () => {
    const ctx = recordingCtx()
    const t = createTextObject('A', { textAlign: 'left' })
    drawTextLines(ctx, t, {
      ...layout,
      lines: ['abc'],
      audioReactive: audio({
        wave: { waveEnabled: true, waveAmplitude: 10, waveFrequency: 0.3, waveSpeed: 0 },
      }),
    })

    const gezeichnet = ctx.calls.filter((c) => c[0] === 'fillText')
    expect(gezeichnet.map((c) => c[1])).toEqual(['a', 'b', 'c'])
    // Die Y-Positionen folgen der Welle, sind also nicht alle gleich
    expect(new Set(gezeichnet.map((c) => c[3])).size).toBeGreaterThan(1)
  })

  it('zeichnet beim RGB-Glitch drei Farbkanäle additiv', () => {
    const ctx = recordingCtx()
    const t = createTextObject('A')
    drawTextLines(ctx, t, {
      ...layout,
      lines: ['x'],
      audioReactive: audio({
        rgbGlitch: {
          glitchIntensity: 4,
          redOffsetX: -2,
          redOffsetY: -1,
          blueOffsetX: 2,
          blueOffsetY: 1,
        },
      }),
    })

    expect(ctx.calls.filter((c) => c[0] === 'fillText')).toHaveLength(3)
    expect(ctx.calls).toContainEqual(['set:globalCompositeOperation', 'lighter'])
    // Blend-Modus und Farbe werden wiederhergestellt
    expect(ctx.calls.at(-1)).toEqual(['set:fillStyle', '#000'])
    expect(ctx.calls.at(-2)).toEqual(['set:globalCompositeOperation', 'source-over'])
  })

  it('lässt bei Wave und Glitch zugleich die Kontur weg', () => {
    const ctx = recordingCtx()
    const t = createTextObject('A', { strokeEnabled: true, textAlign: 'left' })
    drawTextLines(ctx, t, {
      ...layout,
      lines: ['ab'],
      audioReactive: audio({
        wave: { waveEnabled: true, waveAmplitude: 5, waveFrequency: 0.3, waveSpeed: 0 },
        rgbGlitch: { glitchIntensity: 4, redOffsetX: 0, redOffsetY: 0 },
      }),
    })

    expect(ctx.calls.map((c) => c[0])).not.toContain('strokeText')
  })
})

describe('drawTypewriterCursor', () => {
  const layout = { lines: ['abc'], pixelX: 400, startY: 300, lineHeight: 50 }

  it('zeichnet nichts, wenn der Cursor aus oder die Animation fertig ist', () => {
    const ctx = recordingCtx()
    const t = createTextObject('A')
    const basis = { ...layout, now: T0 }

    drawTypewriterCursor(ctx, t, { ...basis, typewriterResult: { showCursor: false } })
    drawTypewriterCursor(ctx, t, {
      ...basis,
      typewriterResult: { showCursor: true, isComplete: true },
    })
    expect(ctx.calls).toEqual([])
  })

  it('blinkt im 500ms-Takt', () => {
    const t = createTextObject('A')
    const res = { showCursor: true, isComplete: false, cursorChar: '|' }

    const sichtbar = recordingCtx()
    drawTypewriterCursor(sichtbar, t, { ...layout, typewriterResult: res, now: 1000 })
    expect(sichtbar.calls).toHaveLength(1)

    const versteckt = recordingCtx()
    drawTypewriterCursor(versteckt, t, { ...layout, typewriterResult: res, now: 1500 })
    expect(versteckt.calls).toEqual([])
  })

  it('positioniert den Cursor je nach Ausrichtung', () => {
    const res = { showCursor: true, isComplete: false, cursorChar: '_' }
    const x = (textAlign) => {
      const ctx = recordingCtx()
      drawTypewriterCursor(ctx, createTextObject('A', { textAlign }), {
        ...layout,
        typewriterResult: res,
        now: 1000,
      })
      return ctx.calls[0][2]
    }

    expect(x('left')).toBe(430) // 400 + Breite 30
    expect(x('right')).toBe(400)
    expect(x('center')).toBe(415)
  })
})

describe('drawText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
  })
  afterEach(() => {
    vi.useRealTimers()
    delete window.audioAnalysisData
  })

  it('zeichnet nichts für leeren Inhalt', () => {
    const ctx = recordingCtx()
    drawText(ctx, createTextObject('A', { content: '' }) && { content: '' }, 800, 600)
    expect(ctx.calls).toEqual([])
  })

  it('hält save/restore im Gleichgewicht und setzt Schatten und Filter zurück', () => {
    window.audioAnalysisData = { bass: 255, mid: 200, treble: 100, volume: 255 }
    const t = createTextObject('Hallo\nWelt')
    for (const name of ['hue', 'strobe', 'shake', 'glow']) {
      t.audioReactive.effects[name].enabled = true
    }

    const ctx = recordingCtx()
    drawText(ctx, t, 800, 600)

    const namen = ctx.calls.map((c) => c[0])
    expect(namen.filter((n) => n === 'save')).toHaveLength(1)
    expect(namen.filter((n) => n === 'restore')).toHaveLength(1)
    expect(namen[0]).toBe('save')
    expect(namen.at(-1)).toBe('restore')

    // Schatten und Filter werden VOR restore() zurückgesetzt
    expect(ctx.calls.at(-2)).toEqual(['set:filter', 'none'])
    expect(ctx.calls.slice(-6, -2).map((c) => c[0])).toEqual([
      'set:shadowColor',
      'set:shadowBlur',
      'set:shadowOffsetX',
      'set:shadowOffsetY',
    ])
  })

  it('verschiebt mehrzeilige Texte bei textBaseline "middle" nach oben', () => {
    const ctx = recordingCtx()
    drawText(ctx, createTextObject('eins\nzwei', { fontSize: 100 }), 800, 600)

    // lineHeight = 120, zwei Zeilen ⇒ Start 60px über der Mitte
    const zeilen = ctx.calls.filter((c) => c[0] === 'fillText')
    expect(zeilen.map((c) => c[3])).toEqual([240, 360])
  })

  it('positioniert mehrzeilige Texte bei textBaseline "top" ab der Mitte', () => {
    const ctx = recordingCtx()
    drawText(ctx, createTextObject('eins\nzwei', { fontSize: 100, textBaseline: 'top' }), 800, 600)

    const zeilen = ctx.calls.filter((c) => c[0] === 'fillText')
    expect(zeilen.map((c) => c[3])).toEqual([300, 420])
  })
})

describe('Transform-Phasen einzeln', () => {
  // Die drei Teile sind voneinander unabhängig und einzeln prüfbar.
  const canvas = [800, 600]

  it('computeOpacity liefert Deckkraft und Strobe-Helligkeit', () => {
    const t = createTextObject('A', { opacity: 40 })
    expect(computeOpacity(t, null, T0)).toEqual({
      opacity: 0.4,
      strobeBrightnessMultiplier: 100,
    })

    const mitStrobe = computeOpacity(
      createTextObject('A'),
      audio({ strobe: { strobeOpacity: 0.5, strobeBrightness: 250 } }),
      T0,
    )
    expect(mitStrobe).toEqual({ opacity: 0.5, strobeBrightnessMultiplier: 250 })
  })

  it('neutralisiert strobeOpacity 0 – bekannte Abweichung zu den anderen Renderern', () => {
    // `strobeOpacity || 1.0` macht aus dem dunklen Blitz-Frame einen sichtbaren:
    // Der Text-Strobe blinkt daher nie dunkel, nur seine Helligkeit schwankt.
    // Bilder, Kacheln und der Lauftext prüfen dagegen auf `!== undefined` und
    // blenden korrekt aus. Vorbestehend, siehe docs/REFACTORING-textManager.md.
    const dunkel = computeOpacity(
      createTextObject('A'),
      audio({ strobe: { strobeOpacity: 0, strobeBrightness: 100 } }),
      T0,
    )
    expect(dunkel.opacity).toBe(1)
  })

  it('computePosition rechnet relative Koordinaten in Pixel um', () => {
    const t = createTextObject('A', { relX: 0.25, relY: 0.75 })
    expect(computePosition(t, null, ...canvas, T0)).toEqual({ pixelX: 200, pixelY: 450 })
  })

  it('computeDeformation lässt Deckkraft und Position unberührt', () => {
    const t = createTextObject('A', { rotation: 45 })
    const d = computeDeformation(t, audio({ elastic: { stretchX: 2, stretchY: 0.5 } }), T0)

    expect(d.totalRotation).toBe(45)
    expect(d.stretchX).toBe(2)
    expect(d.stretchY).toBe(0.5)
    expect(d).not.toHaveProperty('opacity')
    expect(d).not.toHaveProperty('pixelX')
  })

  it('setzt sich in computeTextTransform aus genau diesen drei Teilen zusammen', () => {
    const fx = audio({
      strobe: { strobeOpacity: 0.5, strobeBrightness: 150 },
      shake: { shakeX: 3, shakeY: 4 },
      elastic: { stretchX: 1.5, stretchY: 0.8 },
    })

    // Referenzwerte auf eigenen Objekten, damit der Animations-Zustand
    // der Gesamtberechnung nicht vorweggenommen wird
    const o = computeOpacity(createTextObject('A'), fx, T0)
    const p = computePosition(createTextObject('A'), fx, ...canvas, T0)
    const d = computeDeformation(createTextObject('A'), fx, T0)

    expect(computeTextTransform(createTextObject('A'), fx, ...canvas, T0)).toEqual({
      ...o,
      ...p,
      ...d,
    })
  })
})
