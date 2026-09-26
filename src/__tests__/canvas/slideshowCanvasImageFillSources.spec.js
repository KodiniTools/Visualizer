// @vitest-environment jsdom
/**
 * Audio-Quellen des eigenen Flächenbildes im Canvas-Modus der Slideshow:
 * Bild füllt den ganzen Canvas (über der Flächenfarbe), reagiert nur auf die
 * gewählte Quelle; Workspace-Einstellungen wirken hier nicht.
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

// Bild 50×100 auf Canvas 200×100: eingepasst 50×100 bei x=75, gefüllt 200×400
const IMG = { width: 50, height: 100 }

afterEach(() => {
  delete window.slideshowManager
  delete window.audioAnalysisData
  vi.restoreAllMocks()
})

function canvasShow(fill) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const m = new SlideshowManager({ canvas: { width: 200, height: 100 } }, null)
  m.isActive = true
  m.activeImages = [{}]
  m.setBackgroundMode('canvas')
  m.setBackgroundColor('#224466')
  m.setBaseImage('canvas', fill, IMG)
  window.slideshowManager = m
  return m
}

function renderCanvas() {
  const calls = []
  const manager = {
    background: '#ffffff', // reiner Farbhintergrund – wird ersetzt
    videoBackground: null,
    workspacePreset: null,
    backgroundTilesStore: null,
  }
  const r = new BackgroundRenderer(manager)
  r._drawColorBackground = () => calls.push(['canvas-color'])
  r.drawBackgroundTiles = () => {}
  const ctx = {
    canvas: { width: 200, height: 100 },
    filter: 'none',
    save() {},
    restore() {},
    beginPath() {},
    clip: () => calls.push(['clip']),
    rect: (...a) => calls.push(['rect', ...a]),
    fillStyle: '',
    fillRect: (...a) => calls.push(['fill', ctx.fillStyle, ...a]),
    drawImage: (img, ...a) => calls.push(['image', img, ctx.filter, ...a]),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }
  r.drawBackground(ctx)
  return calls
}

const imageCall = (calls) => calls.find((c) => c[0] === 'image')
const audio = (source, over = {}) => ({
  enabled: true,
  source,
  brightness: 100,
  hue: 100,
  zoom: 100,
  ...over,
})

describe('Canvas-Modus – Flächenbild', () => {
  it('ohne Audio: Farbe, dann Bild über den ganzen Canvas; Farbhintergrund ersetzt', () => {
    canvasShow({ enabled: true, fit: 'contain' })
    const calls = renderCanvas()
    expect(calls).toEqual([
      ['fill', '#224466', 0, 0, 200, 100],
      ['rect', 0, 0, 200, 100],
      ['clip'],
      ['image', IMG, 'none', 75, 0, 50, 100],
    ])
  })

  it('Füllen: Bild deckt den ganzen Canvas ab (beschnitten)', () => {
    canvasShow({ enabled: true, fit: 'cover' })
    expect(imageCall(renderCanvas()).slice(3)).toEqual([0, -150, 200, 400])
  })

  // Nicht gewählte Quelle zuerst: Hüllkurve noch leer → exakt neutral
  it('reagiert nicht auf andere Quellen (alles außer Höhen-Onset angeschlagen)', () => {
    canvasShow({ enabled: true, fit: 'contain', audio: audio('trebleOnset') })
    window.audioAnalysisData = { ...SILENT, ...ALL_BUT('trebleOnset') }
    expect(imageCall(renderCanvas()).slice(2)).toEqual(['none', 75, 0, 50, 100])
  })

  // vor den Schleifen-Tests: Mitten-Onset hier noch unbenutzt (Hüllkurve leer)
  it('Quelle live ändern (wie aus dem Panel): gilt beim nächsten Frame, Bild bleibt', () => {
    const m = canvasShow({ enabled: true, fit: 'contain', audio: audio('midOnset') })
    window.audioAnalysisData = { ...SILENT, onsetBass: 1 }
    expect(imageCall(renderCanvas())[2]).toBe('none') // Mitten-Onset still
    m.setBaseImage('canvas', { audio: audio('bassOnset') })
    expect(m.getBaseImage('canvas').image).toBe(IMG) // Bild bleibt erhalten
    expect(imageCall(renderCanvas())[2]).toMatch(/^brightness/)
  })

  it.each(Object.keys(HIT))('reagiert im Canvas auf %s (Aufhellen, Farbton, Zoom)', (source) => {
    canvasShow({ enabled: true, fit: 'contain', audio: audio(source) })
    window.audioAnalysisData = { ...SILENT, ...HIT[source] }
    const [, img, filter, x, y, w, h] = imageCall(renderCanvas())
    expect(img).toBe(IMG)
    expect(filter).toMatch(/^brightness\((\d+\.\d)%\) hue-rotate\((\d+\.\d)deg\)$/)
    const [, bright, hue] = filter.match(/brightness\(([\d.]+)%\) hue-rotate\(([\d.]+)deg\)/)
    expect(Number(bright)).toBeGreaterThan(100)
    expect(Number(hue)).toBeGreaterThan(0)
    // Puls-Zoom um die Mitte des Canvas
    expect(w).toBeGreaterThan(50)
    expect(x + w / 2).toBeCloseTo(100)
    expect(y + h / 2).toBeCloseTo(50)
  })

  it('einzelne Effekte: Stärke 0 schaltet ab', () => {
    canvasShow({
      enabled: true,
      fit: 'contain',
      audio: audio('allOnset', { brightness: 0, hue: 0 }),
    })
    window.audioAnalysisData = { ...SILENT, onsetAll: 1 }
    const [, , filter, , , w] = imageCall(renderCanvas())
    expect(filter).toBe('none')
    expect(w).toBeGreaterThan(50) // nur Zoom
  })

  it('Workspace-Einstellungen wirken im Canvas-Modus nicht', () => {
    const m = canvasShow({ enabled: true, fit: 'contain' }) // Canvas: ohne Audio
    m.setBaseImage('workspace', { enabled: true, audio: audio('bass') }, { width: 1, height: 1 })
    window.audioAnalysisData = { ...SILENT, bass: 255, onsetAll: 1 }
    const calls = renderCanvas()
    expect(calls.filter((c) => c[0] === 'image')).toHaveLength(1)
    expect(imageCall(calls).slice(1)).toEqual([IMG, 'none', 75, 0, 50, 100])
  })
})
