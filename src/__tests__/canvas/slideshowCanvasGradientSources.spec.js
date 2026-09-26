// @vitest-environment jsdom
/**
 * Audio-Quellen des Farbverlaufs der Slideshow-Fläche im Canvas-Modus:
 * Verlauf füllt den ganzen Canvas (Farbhintergrund ersetzt), Puls und
 * Rotation/Kreisen reagieren nur auf die gewählte Quelle; Workspace-
 * Einstellungen wirken hier nicht.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BackgroundRenderer } from '../../lib/canvasManager/rendering/BackgroundRenderer.js'
import { SlideshowManager } from '../../lib/slideshowManager.js'

const SILENT = {
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  onsetBass: 0,
  onsetMid: 0,
  onsetTreble: 0,
  onsetAll: 0,
}
const HIT = {
  bass: { bass: 255 },
  mid: { mid: 255 },
  treble: { treble: 255 },
  volume: { volume: 255 },
  dynamic: { mid: 200, treble: 100 },
  bassOnset: { onsetBass: 1 },
  midOnset: { onsetMid: 1 },
  trebleOnset: { onsetTreble: 1 },
  allOnset: { onsetAll: 1 },
}
const ALL_BUT = (source) =>
  Object.assign(
    {},
    ...Object.entries(HIT)
      .filter(([k]) => k !== source && k !== 'dynamic')
      .map(([, v]) => v),
  )

// Canvas 200×100: Mitte (100,50), halbe Diagonale ≈ 111,8
const HALF = Math.hypot(200, 100) / 2
// sin(t·0,002) = 1 → maximaler Rotations-Ausschlag (±180° bei vollem Pegel)
const PEAK_TIME = Math.PI / 2 / 0.002
// sin(t·0,002) = 0,5 → höchstens 90° (180° wäre wieder waagerecht, nur gespiegelt)
const HALF_SWING_TIME = Math.PI / 6 / 0.002

afterEach(() => {
  delete window.slideshowManager
  delete window.audioAnalysisData
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function canvasShow(gradient) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const m = new SlideshowManager({ canvas: { width: 200, height: 100 } }, null)
  m.isActive = true
  m.activeImages = [{}]
  m.setBackgroundMode('canvas')
  m.setBackgroundColor('#112233')
  m.setBaseGradient('canvas', { enabled: true, color2: '#ddeeff', ...gradient })
  window.slideshowManager = m
  return m
}

/** Zeichnet den Hintergrund; liefert die Füllungen (Verlauf mit Parametern + Stops). */
function renderCanvas() {
  const calls = []
  const manager = {
    background: '#ffffff',
    videoBackground: null,
    workspacePreset: null,
    backgroundTilesStore: null,
  }
  const r = new BackgroundRenderer(manager)
  r._drawColorBackground = () => calls.push(['canvas-color'])
  r.drawBackgroundTiles = () => {}
  const gradient =
    (kind) =>
    (...a) => ({
      kind,
      a,
      stops: [],
      addColorStop(o, c) {
        this.stops.push([o, c])
      },
    })
  const ctx = {
    canvas: { width: 200, height: 100 },
    save() {},
    restore() {},
    fillStyle: '',
    fillRect: (...a) => calls.push(['fill', ctx.fillStyle, ...a]),
    createLinearGradient: gradient('linear'),
    createRadialGradient: gradient('radial'),
  }
  r.drawBackground(ctx)
  return calls
}
const fillOf = (calls) => calls.find((c) => c[0] === 'fill')[1]
const audio = (source, over = {}) => ({ enabled: true, source, pulse: 100, rotation: 100, ...over })

describe('Canvas-Modus – Farbverlauf', () => {
  it('ohne Audio: radialer Verlauf über den ganzen Canvas, Farbhintergrund ersetzt', () => {
    canvasShow({ type: 'radial' })
    const calls = renderCanvas()
    expect(calls).toHaveLength(1) // kein Canvas-Farbhintergrund
    const [, fill, ...rect] = calls[0]
    expect(rect).toEqual([0, 0, 200, 100])
    expect(fill.kind).toBe('radial')
    expect(fill.a).toEqual([100, 50, 0, 100, 50, HALF])
    expect(fill.stops).toEqual([
      [0, '#112233'],
      [1, '#ddeeff'],
    ])
  })

  it('ohne Audio: linearer Verlauf mit Winkel durch die Canvas-Mitte', () => {
    canvasShow({ type: 'linear', angle: 0 })
    const fill = fillOf(renderCanvas())
    expect(fill.kind).toBe('linear')
    expect(fill.a.map((v) => +v.toFixed(3))).toEqual([
      +(100 - HALF).toFixed(3),
      50,
      +(100 + HALF).toFixed(3),
      50,
    ])
  })

  // Nicht gewählte Quelle zuerst: Hüllkurve noch leer → exakt neutral
  it('reagiert nicht auf andere Quellen (alles außer Bass-Onset angeschlagen)', () => {
    vi.useFakeTimers({ now: PEAK_TIME })
    canvasShow({ type: 'radial', audio: audio('bassOnset') })
    window.audioAnalysisData = { ...SILENT, ...ALL_BUT('bassOnset') }
    expect(fillOf(renderCanvas()).a).toEqual([100, 50, 0, 100, 50, HALF])
  })

  // vor den Schleifen-Tests: Höhen-Onset hier noch unbenutzt (Hüllkurve leer)
  it('Quelle live ändern: gilt beim nächsten Frame', () => {
    const m = canvasShow({ type: 'radial', audio: audio('trebleOnset', { rotation: 0 }) })
    window.audioAnalysisData = { ...SILENT, onsetMid: 1 }
    expect(fillOf(renderCanvas()).a[5]).toBe(HALF) // Höhen-Onset still
    m.setBaseGradient('canvas', { audio: audio('midOnset', { rotation: 0 }) })
    expect(m.getBaseGradient('canvas')).toMatchObject({ enabled: true, type: 'radial' })
    expect(fillOf(renderCanvas()).a[5]).toBeLessThan(HALF)
  })

  it.each(Object.keys(HIT))(
    'Puls reagiert im Canvas auf %s (Radius zieht sich zusammen)',
    (source) => {
      canvasShow({ type: 'radial', audio: audio(source, { rotation: 0 }) })
      window.audioAnalysisData = { ...SILENT, ...HIT[source] }
      const fill = fillOf(renderCanvas())
      expect(fill.a.slice(0, 2)).toEqual([100, 50]) // ohne Kreisen: Mitte bleibt
      expect(fill.a[5]).toBeLessThan(HALF)
      expect(fill.a[5]).toBeGreaterThanOrEqual(HALF * 0.4 - 1e-9)
    },
  )

  it.each(Object.keys(HIT))('Rotation (linear) reagiert im Canvas auf %s', (source) => {
    vi.useFakeTimers({ now: HALF_SWING_TIME })
    canvasShow({ type: 'linear', angle: 0, audio: audio(source, { pulse: 0 }) })
    window.audioAnalysisData = { ...SILENT, ...HIT[source] }
    const [x0, y0, x1, y1] = fillOf(renderCanvas()).a
    // Winkel dreht sich (0° < Winkel ≤ 90°), Verlauf weiterhin durch die Mitte
    const deg = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI
    expect(deg).toBeGreaterThan(0.5)
    expect(deg).toBeLessThanOrEqual(90 + 1e-9)
    expect((x0 + x1) / 2).toBeCloseTo(100)
    expect((y0 + y1) / 2).toBeCloseTo(50)
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(2 * HALF) // ohne Puls: volle Länge
  })

  it('volle Rotation bei vollem Pegel = 180° (Richtung umgekehrt)', () => {
    vi.useFakeTimers({ now: PEAK_TIME })
    canvasShow({ type: 'linear', angle: 0, audio: audio('bassOnset', { pulse: 0 }) })
    window.audioAnalysisData = { ...SILENT, onsetBass: 1 }
    const [x0, , x1] = fillOf(renderCanvas()).a
    expect(x0).toBeGreaterThan(x1) // Farbe 1 jetzt rechts
  })

  it('Kreisen (radial): Mittelpunkt wandert, Radius bleibt ohne Puls', () => {
    vi.useFakeTimers({ now: 1000 })
    canvasShow({ type: 'radial', audio: audio('allOnset', { pulse: 0 }) })
    window.audioAnalysisData = { ...SILENT, onsetAll: 1 }
    const [cx, cy, , , , radius] = fillOf(renderCanvas()).a
    expect(Math.hypot(cx - 100, cy - 50)).toBeGreaterThan(0)
    expect(Math.hypot(cx - 100, cy - 50)).toBeLessThanOrEqual(HALF * 0.25 + 1e-9)
    expect(radius).toBe(HALF)
  })

  it('„Farbe audio-reaktiv“ wirkt auf beide Verlaufsfarben', () => {
    const m = canvasShow({ type: 'radial' })
    m.setBaseFillAudio('canvas', { enabled: true, source: 'allOnset', brightness: 100 })
    window.audioAnalysisData = { ...SILENT, onsetAll: 1 }
    const stops = fillOf(renderCanvas()).stops
    expect(stops[0][1]).toMatch(/^hsl\(/)
    expect(stops[1][1]).toMatch(/^hsl\(/)
  })

  it('Workspace-Verlauf und dessen Quelle wirken im Canvas-Modus nicht', () => {
    const m = canvasShow({ type: 'radial' }) // Canvas: ohne Audio
    m.setBaseGradient('workspace', {
      enabled: true,
      type: 'linear',
      audio: audio('bass'),
    })
    window.audioAnalysisData = { ...SILENT, bass: 255, onsetAll: 1 }
    const fill = fillOf(renderCanvas())
    expect(fill.kind).toBe('radial')
    expect(fill.a).toEqual([100, 50, 0, 100, 50, HALF])
  })
})
