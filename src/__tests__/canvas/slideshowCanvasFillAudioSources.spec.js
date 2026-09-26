// @vitest-environment jsdom
/**
 * Audio-Quellen von „Farbe audio-reaktiv“ der Slideshow-Fläche im Canvas-Modus:
 * einfarbige Fläche über den ganzen Canvas (Farbhintergrund ersetzt),
 * Aufhellen und Farbton reagieren nur auf die gewählte Quelle;
 * Workspace-Einstellungen wirken hier nicht.
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

afterEach(() => {
  delete window.slideshowManager
  delete window.audioAnalysisData
  vi.restoreAllMocks()
})

function canvasShow(color, fillAudio) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const m = new SlideshowManager({ canvas: { width: 200, height: 100 } }, null)
  m.isActive = true
  m.activeImages = [{}]
  m.setBackgroundMode('canvas')
  m.setBackgroundColor(color)
  if (fillAudio) m.setBaseFillAudio('canvas', fillAudio)
  window.slideshowManager = m
  return m
}

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
const colorOf = (calls) => calls.find((c) => c[0] === 'fill')[1]
/** hsl(h, s%, l%) → [h, s, l] */
const hsl = (str) =>
  str
    .match(/^hsl\(([\d.]+), ([\d.]+)%, ([\d.]+)%\)$/)
    .slice(1)
    .map(Number)
const fx = (source, over = {}) => ({ enabled: true, source, brightness: 100, hue: 100, ...over })

describe('Canvas-Modus – Farbe audio-reaktiv', () => {
  it('ohne Audio: einfarbige Fläche über den ganzen Canvas, Farbhintergrund ersetzt', () => {
    canvasShow('#336699')
    expect(renderCanvas()).toEqual([['fill', '#336699', 0, 0, 200, 100]])
  })

  it('eingeschaltet, aber Stille: Farbe unverändert', () => {
    canvasShow('#336699', fx('bass'))
    window.audioAnalysisData = { ...SILENT }
    expect(colorOf(renderCanvas())).toBe('#336699')
  })

  // Nicht gewählte Quelle zuerst: Hüllkurve noch leer → exakt unverändert
  it('reagiert nicht auf andere Quellen (alles außer Höhen-Onset angeschlagen)', () => {
    canvasShow('#336699', fx('trebleOnset'))
    window.audioAnalysisData = { ...SILENT, ...ALL_BUT('trebleOnset') }
    expect(colorOf(renderCanvas())).toBe('#336699')
  })

  // vor den Schleifen-Tests: Mitten-Onset hier noch unbenutzt (Hüllkurve leer)
  it('Quelle live ändern: gilt beim nächsten Frame', () => {
    const m = canvasShow('#000000', fx('midOnset', { hue: 0 }))
    window.audioAnalysisData = { ...SILENT, onsetAll: 1 }
    expect(colorOf(renderCanvas())).toBe('#000000')
    m.setBaseFillAudio('canvas', { source: 'allOnset' })
    expect(m.getBaseFillAudio('canvas')).toMatchObject({ enabled: true, brightness: 100 })
    const [, , l] = hsl(colorOf(renderCanvas()))
    expect(l).toBeGreaterThan(0)
  })

  it.each(Object.keys(HIT))('Aufhellen reagiert im Canvas auf %s (Schwarz → Grau)', (source) => {
    canvasShow('#000000', fx(source, { hue: 0 }))
    window.audioAnalysisData = { ...SILENT, ...HIT[source] }
    const calls = renderCanvas()
    expect(calls).toHaveLength(1)
    expect(calls[0].slice(2)).toEqual([0, 0, 200, 100])
    const [h, s, l] = hsl(calls[0][1])
    expect([h, s]).toEqual([0, 0])
    expect(l).toBeGreaterThan(0)
    expect(l).toBeLessThanOrEqual(50) // höchstens +50 % Richtung Weiß
  })

  it.each(Object.keys(HIT))('Farbton reagiert im Canvas auf %s (Rot verschiebt sich)', (source) => {
    canvasShow('#ff0000', fx(source, { brightness: 0 }))
    window.audioAnalysisData = { ...SILENT, ...HIT[source] }
    const [h, s, l] = hsl(colorOf(renderCanvas()))
    expect(h).toBeGreaterThan(0)
    expect(h).toBeLessThanOrEqual(180)
    expect([s, l]).toEqual([100, 50]) // Sättigung/Helligkeit bleiben
  })

  it('Stärke 0 schaltet einzelne Effekte ab; beide 0 = unverändert', () => {
    canvasShow('#ff0000', fx('bassOnset', { brightness: 0, hue: 0 }))
    window.audioAnalysisData = { ...SILENT, onsetBass: 1 }
    expect(colorOf(renderCanvas())).toBe('#ff0000')
  })

  it('Workspace-Einstellung und deren Quelle wirken im Canvas-Modus nicht', () => {
    const m = canvasShow('#336699') // Canvas: aus
    m.setWorkspaceColor('#000000')
    m.setBaseFillAudio('workspace', fx('bass'))
    window.audioAnalysisData = { ...SILENT, bass: 255, onsetAll: 1 }
    expect(renderCanvas()).toEqual([['fill', '#336699', 0, 0, 200, 100]])
  })

  it('ohne Slideshow als Hintergrund: normaler Farbhintergrund, keine Fläche', () => {
    const m = canvasShow('#000000', fx('bass'))
    m.setBackgroundMode('none')
    window.audioAnalysisData = { ...SILENT, bass: 255 }
    expect(renderCanvas()).toEqual([['canvas-color']])
  })
})
