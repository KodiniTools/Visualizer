// @vitest-environment jsdom
/**
 * Audio-Quellen von „Farbe audio-reaktiv“ der Slideshow-Fläche im Workspace-Modus:
 * Fläche nur im Workspace-Bereich (Canvas-Hintergrund bleibt), Aufhellen und
 * Farbton reagieren nur auf die gewählte Quelle; Canvas-Einstellung wirkt nicht.
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

const WS = { x: 20, y: 10, width: 40, height: 80 }

afterEach(() => {
  delete window.slideshowManager
  delete window.audioAnalysisData
  vi.restoreAllMocks()
})

function workspaceShow(color, fillAudio) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const m = new SlideshowManager({ canvas: { width: 200, height: 100 } }, null)
  m.isActive = true
  m.activeImages = [{}]
  m.setBackgroundMode('workspace')
  m.setWorkspaceColor(color)
  if (fillAudio) m.setBaseFillAudio('workspace', fillAudio)
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
  const ctx = {
    canvas: { width: 200, height: 100 },
    save() {},
    restore() {},
    fillStyle: '',
    fillRect: (...a) => calls.push(['fill', ctx.fillStyle, ...a]),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }
  r.drawBackground(ctx)
  return calls
}
const wsFill = (calls) => calls.find((c) => c[0] === 'fill')
const colorOf = (calls) => wsFill(calls)[1]
const hsl = (str) =>
  str
    .match(/^hsl\(([\d.]+), ([\d.]+)%, ([\d.]+)%\)$/)
    .slice(1)
    .map(Number)
const fx = (source, over = {}) => ({ enabled: true, source, brightness: 100, hue: 100, ...over })

describe('Workspace-Modus – Farbe audio-reaktiv', () => {
  it('ohne Audio: Canvas-Farbe bleibt, Workspace-Fläche nur im Workspace', () => {
    workspaceShow('#336699')
    expect(renderWorkspace()).toEqual([['canvas-color'], ['fill', '#336699', 20, 10, 40, 80]])
  })

  it('ohne Workspace-Format: keine Workspace-Fläche', () => {
    workspaceShow('#336699', fx('bass'))
    window.audioAnalysisData = { ...SILENT, bass: 255 }
    expect(renderWorkspace({ preset: null })).toEqual([['canvas-color']])
  })

  it('eingeschaltet, aber Stille: Farbe unverändert', () => {
    workspaceShow('#336699', fx('volume'))
    window.audioAnalysisData = { ...SILENT }
    expect(colorOf(renderWorkspace())).toBe('#336699')
  })

  // Nicht gewählte Quelle zuerst: Hüllkurve noch leer → exakt unverändert
  it('reagiert nicht auf andere Quellen (alles außer Mitten-Onset angeschlagen)', () => {
    workspaceShow('#336699', fx('midOnset'))
    window.audioAnalysisData = { ...SILENT, ...ALL_BUT('midOnset') }
    expect(colorOf(renderWorkspace())).toBe('#336699')
  })

  // vor den Schleifen-Tests: Höhen-Onset hier noch unbenutzt (Hüllkurve leer)
  it('Quelle live ändern: gilt beim nächsten Frame', () => {
    const m = workspaceShow('#000000', fx('trebleOnset', { hue: 0 }))
    window.audioAnalysisData = { ...SILENT, onsetBass: 1 }
    expect(colorOf(renderWorkspace())).toBe('#000000')
    m.setBaseFillAudio('workspace', { source: 'bassOnset' })
    const [, , l] = hsl(colorOf(renderWorkspace()))
    expect(l).toBeGreaterThan(0)
  })

  it.each(Object.keys(HIT))('Aufhellen reagiert im Workspace auf %s (Schwarz → Grau)', (source) => {
    workspaceShow('#000000', fx(source, { hue: 0 }))
    window.audioAnalysisData = { ...SILENT, ...HIT[source] }
    const calls = renderWorkspace()
    expect(calls[0]).toEqual(['canvas-color'])
    expect(wsFill(calls).slice(2)).toEqual([20, 10, 40, 80])
    const [h, s, l] = hsl(colorOf(calls))
    expect([h, s]).toEqual([0, 0])
    expect(l).toBeGreaterThan(0)
    expect(l).toBeLessThanOrEqual(50)
  })

  it.each(Object.keys(HIT))(
    'Farbton reagiert im Workspace auf %s (Rot verschiebt sich)',
    (source) => {
      workspaceShow('#ff0000', fx(source, { brightness: 0 }))
      window.audioAnalysisData = { ...SILENT, ...HIT[source] }
      const [h, s, l] = hsl(colorOf(renderWorkspace()))
      expect(h).toBeGreaterThan(0)
      expect(h).toBeLessThanOrEqual(180)
      expect([s, l]).toEqual([100, 50])
    },
  )

  it('Stärke 0 schaltet beide Effekte ab = unverändert', () => {
    workspaceShow('#ff0000', fx('allOnset', { brightness: 0, hue: 0 }))
    window.audioAnalysisData = { ...SILENT, onsetAll: 1 }
    expect(colorOf(renderWorkspace())).toBe('#ff0000')
  })

  it('Canvas-Einstellung und deren Quelle wirken im Workspace-Modus nicht', () => {
    const m = workspaceShow('#336699') // Workspace: aus
    m.setBackgroundColor('#000000')
    m.setBaseFillAudio('canvas', fx('bass'))
    window.audioAnalysisData = { ...SILENT, bass: 255, onsetAll: 1 }
    expect(renderWorkspace()).toEqual([['canvas-color'], ['fill', '#336699', 20, 10, 40, 80]])
  })
})
