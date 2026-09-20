// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  MAX_DELAY_FRAMES,
  PUNCH_BANDS,
  bandWeight,
  createPunchVariationState,
  drawPunchedBands,
  punchScalesUniform,
  setPunchCanvasFactory,
  updatePunchVariation,
} from '../../lib/visualizers/core/beatPunchVariation.js'
import { advancePunch, punchScale } from '../../lib/visualizers/core/onsetReactive.js'

/** Deterministische Zufallsfolge. */
function seq(values) {
  let i = 0
  return () => values[i++ % values.length]
}

describe('updatePunchVariation', () => {
  it('liefert bei Variation 0 den einheitlichen Zoom für alle Spalten', () => {
    const st = createPunchVariationState(PUNCH_BANDS, seq([0.9]))
    let env = 0
    for (const onset of [0, 1, 0, 0]) {
      const scales = updatePunchVariation(st, onset, 50, 0)
      env = advancePunch(env, onset)
      const erwartet = punchScale(env, 50)
      for (const s of scales) expect(s).toBeCloseTo(erwartet, 10)
      expect(punchScalesUniform(scales)).toBe(true)
    }
    // Ohne Variation wird nichts gewürfelt
    expect(Array.from(st.factor)).toEqual([1, 1, 1, 1])
  })

  it('würfelt bei einem neuen Beat je Spalte einen Faktor in [1 − v, 1 + v]', () => {
    // random-Folge: Faktor, Versatz, Faktor, Versatz, ...
    const st = createPunchVariationState(4, seq([0, 0, 1, 0, 0.5, 0, 0.25, 0]))
    updatePunchVariation(st, 0, 100, 60)
    updatePunchVariation(st, 1, 100, 60) // Anstieg 0 → 1: neuer Beat

    // v = 0.6: random 0 → 0.4, 1 → 1.6, 0.5 → 1.0, 0.25 → 0.7
    expect(Array.from(st.factor).map((f) => Number(f.toFixed(3)))).toEqual([0.4, 1.6, 1.0, 0.7])
    for (const f of st.factor) {
      expect(f).toBeGreaterThanOrEqual(0.4)
      expect(f).toBeLessThanOrEqual(1.6)
    }
  })

  it('skaliert den Zoom-Anteil mit dem Faktor der Spalte', () => {
    const st = createPunchVariationState(2, seq([0, 0, 1, 0])) // Faktoren 0.5 und 1.5 bei v = 0.5
    updatePunchVariation(st, 0, 100, 50)
    const scales = updatePunchVariation(st, 1, 100, 50)

    const voll = punchScale(1, 100) - 1 // +12 %
    expect(scales[0]).toBeCloseTo(1 + voll * 0.5, 10)
    expect(scales[1]).toBeCloseTo(1 + voll * 1.5, 10)
    expect(punchScalesUniform(scales)).toBe(false)
  })

  it('verzögert eine Spalte um ihren gewürfelten Versatz', () => {
    // Spalte 0: Faktor 1, Versatz 0; Spalte 1: Faktor 1, Versatz MAX (random 1 bei v = 1)
    const st = createPunchVariationState(2, seq([0.5, 0, 0.5, 1]))
    updatePunchVariation(st, 0, 100, 100)
    let scales = updatePunchVariation(st, 1, 100, 100) // Beat
    expect(st.delay[1]).toBe(MAX_DELAY_FRAMES)
    expect(scales[0]).toBeGreaterThan(1.1) // sofort
    expect(scales[1]).toBe(1) // noch nicht

    for (let i = 0; i < MAX_DELAY_FRAMES; i++) scales = updatePunchVariation(st, 0, 100, 100)
    expect(scales[1]).toBeGreaterThan(1.1) // MAX_DELAY_FRAMES spaeter
  })

  it('würfelt erst beim nächsten Anstieg wieder neu', () => {
    const st = createPunchVariationState(2, seq([0.1, 0, 0.9, 0, 0.3, 0, 0.7, 0]))
    updatePunchVariation(st, 0, 100, 100)
    updatePunchVariation(st, 1, 100, 100)
    const erste = Array.from(st.factor)
    updatePunchVariation(st, 0.95, 100, 100) // kein Anstieg → unverändert
    expect(Array.from(st.factor)).toEqual(erste)
    updatePunchVariation(st, 0.2, 100, 100)
    updatePunchVariation(st, 0.9, 100, 100) // Anstieg → neu
    expect(Array.from(st.factor)).not.toEqual(erste)
  })
})

describe('bandWeight', () => {
  it('addiert sich an jeder Position über alle Spalten zu 1', () => {
    for (const bands of [2, 3, 4, 6]) {
      for (let i = 0; i <= 200; i++) {
        const x = i / 200
        let sum = 0
        for (let k = 0; k < bands; k++) sum += bandWeight(x, k, bands)
        expect(sum, `bands=${bands} x=${x}`).toBeCloseTo(1, 10)
      }
    }
  })

  it('ist in der Spaltenmitte 1 und am fernen Rand 0', () => {
    expect(bandWeight(0.125, 0, 4)).toBe(1)
    expect(bandWeight(0.875, 0, 4)).toBe(0)
    expect(bandWeight(0.625, 2, 4)).toBe(1)
  })
})

describe('punchScalesUniform', () => {
  it('erkennt gleiche und verschiedene Zooms', () => {
    expect(punchScalesUniform([1.05, 1.05, 1.05])).toBe(true)
    expect(punchScalesUniform([1.05, 1.05001])).toBe(true)
    expect(punchScalesUniform([1.0, 1.1])).toBe(false)
    expect(punchScalesUniform([1.2])).toBe(true)
  })
})

describe('drawPunchedBands', () => {
  function recordingCtx() {
    const calls = []
    const gradient = { addColorStop: (...a) => calls.push(['addColorStop', ...a]) }
    return new Proxy(
      { calls, globalCompositeOperation: 'source-over', fillStyle: null },
      {
        get: (t, p) => {
          if (p in t) return t[p]
          if (p === 'createLinearGradient') return (...a) => (calls.push([p, ...a]), gradient)
          return (...a) => calls.push([p, ...a])
        },
        set: (t, p, v) => ((t[p] = v), calls.push(['set:' + String(p), v]), true),
      },
    )
  }
  let created
  beforeEach(() => {
    created = []
    setPunchCanvasFactory((w, h) => {
      const ctx = recordingCtx()
      const c = { width: w, height: h, ctx, getContext: () => ctx }
      created.push(c)
      return c
    })
  })
  afterEach(() => setPunchCanvasFactory(null))

  it('zeichnet je Spalte eine gezoomte, maskierte Kopie und setzt sie additiv zusammen', () => {
    const ctx = recordingCtx()
    const drawn = []
    const draw = (c, w, h) => drawn.push([c, w, h])
    drawPunchedBands(ctx, draw, 800, 400, [1.0, 1.08, 1.03, 1.12])

    expect(created).toHaveLength(2) // Sammel-Canvas + Spalten-Canvas
    const [acc, band] = created
    expect(drawn).toHaveLength(4)
    for (const [c] of drawn) expect(c).toBe(band.ctx)

    // Jede Spalte um ihre eigene Mitte gezoomt
    const scales = band.ctx.calls.filter((c) => c[0] === 'scale').map((c) => c[1])
    expect(scales).toEqual([1.0, 1.08, 1.03, 1.12])
    const translates = band.ctx.calls
      .filter((c) => c[0] === 'translate' && c[1] > 0)
      .map((c) => c[1])
    expect(translates).toEqual([100, 300, 500, 700])

    // Maske per destination-in, Sammeln per lighter, ein Blit aufs Ziel
    expect(
      band.ctx.calls.filter(
        (c) => c[0] === 'set:globalCompositeOperation' && c[1] === 'destination-in',
      ),
    ).toHaveLength(4)
    expect(
      acc.ctx.calls.filter((c) => c[0] === 'set:globalCompositeOperation' && c[1] === 'lighter'),
    ).toHaveLength(4)
    expect(acc.ctx.calls.filter((c) => c[0] === 'drawImage')).toHaveLength(4)
    const blits = ctx.calls.filter((c) => c[0] === 'drawImage')
    expect(blits).toHaveLength(1)
    expect(blits[0][1]).toBe(acc)
  })

  it('fällt ohne 2D-Context auf den einheitlichen Zoom zurück', () => {
    setPunchCanvasFactory((w, h) => ({ width: w, height: h, getContext: () => null }))
    const ctx = recordingCtx()
    const drawn = []
    drawPunchedBands(ctx, (c) => drawn.push(c), 800, 400, [1.0, 1.1])
    expect(drawn).toHaveLength(1)
    expect(drawn[0]).toBe(ctx)
    expect(ctx.calls.find((c) => c[0] === 'scale')[1]).toBeCloseTo(1.05, 10)
  })
})
