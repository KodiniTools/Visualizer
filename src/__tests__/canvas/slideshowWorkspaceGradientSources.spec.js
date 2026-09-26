// @vitest-environment jsdom
/**
 * Audio-Quellen des Farbverlaufs der Slideshow-Fläche im Workspace-Modus:
 * Verlauf füllt nur den Workspace-Bereich (Mitte/Diagonale des Workspace),
 * Puls und Rotation/Kreisen reagieren nur auf die gewählte Quelle;
 * Canvas-Hintergrund und Canvas-Verlauf bleiben unberührt.
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

// Workspace 40×80 bei (20,10) im Canvas 200×100: Mitte (40,50)
const WS = { x: 20, y: 10, width: 40, height: 80 }
const CX = 40
const CY = 50
const HALF = Math.hypot(WS.width, WS.height) / 2
// sin(t·0,002) = 0,5 → Rotation höchstens 90°
const HALF_SWING_TIME = Math.PI / 6 / 0.002

afterEach(() => {
  delete window.slideshowManager
  delete window.audioAnalysisData
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function workspaceShow(gradient) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const m = new SlideshowManager({ canvas: { width: 200, height: 100 } }, null)
  m.isActive = true
  m.activeImages = [{}]
  m.setBackgroundMode('workspace')
  m.setWorkspaceColor('#112233')
  m.setBaseGradient('workspace', { enabled: true, color2: '#ddeeff', ...gradient })
  window.slideshowManager = m
  return m
}

function renderWorkspace({ preset = { width: 9, height: 16 } } = {}) {
  const calls = []
  const manager = {
    background: '#ffffff',
    videoBackground: null,
    workspacePreset: preset,
    workspaceBackground: null,
    getWorkspaceBounds: () => ({ ...WS }),
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
const wsFill = (calls) => calls.find((c) => c[0] === 'fill')
const fillOf = (calls) => wsFill(calls)[1]
const audio = (source, over = {}) => ({ enabled: true, source, pulse: 100, rotation: 100, ...over })

describe('Workspace-Modus – Farbverlauf', () => {
  it('ohne Audio: Canvas-Farbe bleibt, radialer Verlauf nur im Workspace', () => {
    workspaceShow({ type: 'radial' })
    const calls = renderWorkspace()
    expect(calls[0]).toEqual(['canvas-color'])
    const [, fill, ...rect] = wsFill(calls)
    expect(rect).toEqual([20, 10, 40, 80])
    expect(fill.a).toEqual([CX, CY, 0, CX, CY, HALF])
    expect(fill.stops).toEqual([
      [0, '#112233'],
      [1, '#ddeeff'],
    ])
  })

  it('ohne Audio: linearer Verlauf (90° = oben→unten) über die Workspace-Diagonale', () => {
    workspaceShow({ type: 'linear', angle: 90 })
    const [x0, y0, x1, y1] = fillOf(renderWorkspace()).a
    expect(x0).toBeCloseTo(CX)
    expect(x1).toBeCloseTo(CX)
    expect(y0).toBeCloseTo(CY - HALF)
    expect(y1).toBeCloseTo(CY + HALF)
  })

  it('ohne Workspace-Format: keine Workspace-Fläche', () => {
    workspaceShow({ type: 'radial' })
    expect(wsFill(renderWorkspace({ preset: null }))).toBeUndefined()
  })

  // Nicht gewählte Quelle zuerst: Hüllkurve noch leer → exakt neutral
  it('reagiert nicht auf andere Quellen (alles außer Mitten-Onset angeschlagen)', () => {
    vi.useFakeTimers({ now: HALF_SWING_TIME })
    workspaceShow({ type: 'radial', audio: audio('midOnset') })
    window.audioAnalysisData = { ...SILENT, ...ALL_BUT('midOnset') }
    expect(fillOf(renderWorkspace()).a).toEqual([CX, CY, 0, CX, CY, HALF])
  })

  // vor den Schleifen-Tests: Alle-Onset hier noch unbenutzt (Hüllkurve leer)
  it('Quelle live ändern: gilt beim nächsten Frame', () => {
    const m = workspaceShow({ type: 'radial', audio: audio('allOnset', { rotation: 0 }) })
    window.audioAnalysisData = { ...SILENT, onsetBass: 1 }
    expect(fillOf(renderWorkspace()).a[5]).toBe(HALF)
    m.setBaseGradient('workspace', { audio: audio('bassOnset', { rotation: 0 }) })
    expect(fillOf(renderWorkspace()).a[5]).toBeLessThan(HALF)
  })

  it.each(Object.keys(HIT))('Puls reagiert im Workspace auf %s', (source) => {
    workspaceShow({ type: 'radial', audio: audio(source, { rotation: 0 }) })
    window.audioAnalysisData = { ...SILENT, ...HIT[source] }
    const calls = renderWorkspace()
    expect(wsFill(calls).slice(2)).toEqual([20, 10, 40, 80])
    const fill = fillOf(calls)
    expect(fill.a.slice(0, 2)).toEqual([CX, CY])
    expect(fill.a[5]).toBeLessThan(HALF)
    expect(fill.a[5]).toBeGreaterThanOrEqual(HALF * 0.4 - 1e-9)
  })

  it.each(Object.keys(HIT))('Rotation (linear) reagiert im Workspace auf %s', (source) => {
    vi.useFakeTimers({ now: HALF_SWING_TIME })
    workspaceShow({ type: 'linear', angle: 0, audio: audio(source, { pulse: 0 }) })
    window.audioAnalysisData = { ...SILENT, ...HIT[source] }
    const [x0, y0, x1, y1] = fillOf(renderWorkspace()).a
    const deg = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI
    expect(deg).toBeGreaterThan(0.5)
    expect(deg).toBeLessThanOrEqual(90 + 1e-9)
    expect((x0 + x1) / 2).toBeCloseTo(CX)
    expect((y0 + y1) / 2).toBeCloseTo(CY)
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(2 * HALF)
  })

  it('Kreisen (radial): Mitte wandert um höchstens 25 % der halben Workspace-Diagonale', () => {
    vi.useFakeTimers({ now: 1000 })
    workspaceShow({ type: 'radial', audio: audio('trebleOnset', { pulse: 0 }) })
    window.audioAnalysisData = { ...SILENT, onsetTreble: 1 }
    const [cx, cy, , , , radius] = fillOf(renderWorkspace()).a
    const shift = Math.hypot(cx - CX, cy - CY)
    expect(shift).toBeGreaterThan(0)
    expect(shift).toBeLessThanOrEqual(HALF * 0.25 + 1e-9)
    expect(radius).toBe(HALF)
  })

  it('„Farbe audio-reaktiv“ (Workspace) wirkt auf beide Verlaufsfarben', () => {
    const m = workspaceShow({ type: 'radial' })
    m.setBaseFillAudio('workspace', { enabled: true, source: 'allOnset', brightness: 100 })
    window.audioAnalysisData = { ...SILENT, onsetAll: 1 }
    const stops = fillOf(renderWorkspace()).stops
    expect(stops[0][1]).toMatch(/^hsl\(/)
    expect(stops[1][1]).toMatch(/^hsl\(/)
  })

  it('Canvas-Verlauf und dessen Quelle wirken im Workspace-Modus nicht', () => {
    const m = workspaceShow({ type: 'radial' }) // Workspace: ohne Audio
    m.setBaseGradient('canvas', { enabled: true, type: 'linear', audio: audio('bass') })
    window.audioAnalysisData = { ...SILENT, bass: 255, onsetAll: 1 }
    const calls = renderWorkspace()
    expect(calls[0]).toEqual(['canvas-color'])
    expect(calls.filter((c) => c[0] === 'fill')).toHaveLength(1)
    expect(fillOf(calls).a).toEqual([CX, CY, 0, CX, CY, HALF])
  })
})
