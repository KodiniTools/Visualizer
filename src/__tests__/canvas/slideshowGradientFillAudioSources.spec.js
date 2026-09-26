// @vitest-environment jsdom
/**
 * „Farbe audio-reaktiv“ auf dem Farbverlauf der Slideshow-Fläche –
 * Canvas- und Workspace-Modus:
 * - beide Verlaufsfarben reagieren (gleiches Aufhellen / gleiche Farbton-
 *   Verschiebung) nur auf die gewählte Quelle
 * - Quelle der Farbe und Quelle des Verlaufs (Puls/Rotation) sind unabhängig
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

// Canvas 200×100; Workspace 40×80 bei (20,10)
const MODES = {
  canvas: { area: [0, 0, 200, 100], half: Math.hypot(200, 100) / 2 },
  workspace: { area: [20, 10, 40, 80], half: Math.hypot(40, 80) / 2 },
}

afterEach(() => {
  delete window.slideshowManager
  delete window.audioAnalysisData
  vi.restoreAllMocks()
})

function show(mode, { color = '#ff0000', color2 = '#0000ff', fill, gradientAudio } = {}) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const m = new SlideshowManager({ canvas: { width: 200, height: 100 } }, null)
  m.isActive = true
  m.activeImages = [{}]
  m.setBackgroundMode(mode)
  if (mode === 'canvas') m.setBackgroundColor(color)
  else m.setWorkspaceColor(color)
  m.setBaseGradient(mode, {
    enabled: true,
    type: 'radial',
    color2,
    audio: gradientAudio ?? { enabled: false },
  })
  if (fill) m.setBaseFillAudio(mode, fill)
  window.slideshowManager = m
  return m
}

function render(mode) {
  const calls = []
  const [x, y, w, h] = MODES[mode].area
  const manager = {
    background: '#ffffff',
    videoBackground: null,
    workspacePreset: mode === 'workspace' ? { width: 9, height: 16 } : null,
    workspaceBackground: null,
    getWorkspaceBounds: () => ({ x, y, width: w, height: h }),
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
        this.stops.push(c)
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
  const fill = calls.find((c) => c[0] === 'fill')
  return { calls, fill: fill[1], rect: fill.slice(2) }
}
const hsl = (str) =>
  str
    .match(/^hsl\(([\d.]+), ([\d.]+)%, ([\d.]+)%\)$/)
    .slice(1)
    .map(Number)
const fx = (source, over = {}) => ({ enabled: true, source, brightness: 0, hue: 100, ...over })

describe.each(Object.keys(MODES))('%s-Modus – Farbe audio-reaktiv auf dem Farbverlauf', (mode) => {
  const { area, half } = MODES[mode]

  it('ohne Audio: Verlauf Rot → Blau im Bereich, Farben unverändert', () => {
    show(mode)
    const { fill, rect } = render(mode)
    expect(rect).toEqual(area)
    expect(fill.stops).toEqual(['#ff0000', '#0000ff'])
  })

  // Nicht gewählte Quelle zuerst: Hüllkurve noch leer → exakt unverändert
  it('reagiert nicht auf andere Quellen (alles außer Höhen-Onset angeschlagen)', () => {
    show(mode, { fill: fx('trebleOnset', { brightness: 100 }) })
    window.audioAnalysisData = { ...SILENT, ...ALL_BUT('trebleOnset') }
    expect(render(mode).fill.stops).toEqual(['#ff0000', '#0000ff'])
  })

  it('Quelle der Farbe und des Verlaufs sind unabhängig', () => {
    // Farbe: Bass-Onset, Verlauf-Puls: Mitten-Onset → nur Bass angeschlagen
    show(mode, {
      fill: fx('bassOnset'),
      gradientAudio: { enabled: true, source: 'midOnset', pulse: 100, rotation: 0 },
    })
    window.audioAnalysisData = { ...SILENT, onsetBass: 1 }
    let out = render(mode)
    expect(out.fill.stops.every((c) => c.startsWith('hsl('))).toBe(true) // Farbe reagiert
    expect(out.fill.a[5]).toBe(half) // Puls nicht

    // Farbe: Alle-Onset (unbenutzt), Verlauf-Puls: Dynamisch → nur Mitten/Höhen
    show(mode, {
      fill: fx('allOnset'),
      gradientAudio: { enabled: true, source: 'dynamic', pulse: 100, rotation: 0 },
    })
    window.audioAnalysisData = { ...SILENT, mid: 200, treble: 100 }
    out = render(mode)
    expect(out.fill.stops).toEqual(['#ff0000', '#0000ff']) // Farbe nicht
    expect(out.fill.a[5]).toBeLessThan(half) // Puls reagiert
  })

  // vor den Schleifen-Tests: Lautstärke/Bass hier noch unbenutzt (Hüllkurve leer)
  it('Stille und Stärke 0: Farben unverändert', () => {
    show(mode, { fill: fx('bass', { hue: 0, brightness: 0 }) })
    window.audioAnalysisData = { ...SILENT, bass: 255 }
    expect(render(mode).fill.stops).toEqual(['#ff0000', '#0000ff'])
    show(mode, { fill: fx('volume') })
    window.audioAnalysisData = { ...SILENT }
    expect(render(mode).fill.stops).toEqual(['#ff0000', '#0000ff'])
  })

  it.each(Object.keys(HIT))(
    'Farbton: beide Verlaufsfarben verschieben sich gleich (%s)',
    (source) => {
      show(mode, { fill: fx(source) })
      window.audioAnalysisData = { ...SILENT, ...HIT[source] }
      const [c1, c2] = render(mode).fill.stops.map(hsl)
      const shift1 = c1[0] // Rot: 0°
      const shift2 = (c2[0] - 240 + 360) % 360 // Blau: 240°
      expect(shift1).toBeGreaterThan(0)
      expect(shift1).toBeLessThanOrEqual(180)
      expect(shift2).toBeCloseTo(shift1, 0)
      expect([c1[1], c1[2], c2[1], c2[2]]).toEqual([100, 50, 100, 50])
    },
  )

  it.each(Object.keys(HIT))('Aufhellen: beide Verlaufsfarben hellen gleich auf (%s)', (source) => {
    show(mode, {
      color: '#000000',
      color2: '#333333',
      fill: fx(source, { brightness: 100, hue: 0 }),
    })
    window.audioAnalysisData = { ...SILENT, ...HIT[source] }
    const [c1, c2] = render(mode).fill.stops.map(hsl)
    expect(c1[2]).toBeGreaterThan(0)
    expect(c1[2]).toBeLessThanOrEqual(50)
    expect(c2[2]).toBeGreaterThan(20) // #333333 = 20 % Helligkeit
    // gleicher Anteil Richtung Weiß: (l - l0) / (100 - l0)
    const k1 = c1[2] / 100
    const k2 = (c2[2] - 20) / 80
    expect(k2).toBeCloseTo(k1, 2)
  })

  it('Farbe-Audio der anderen Fläche wirkt nicht', () => {
    const m = show(mode)
    m.setBaseFillAudio(mode === 'canvas' ? 'workspace' : 'canvas', fx('bass', { brightness: 100 }))
    window.audioAnalysisData = { ...SILENT, bass: 255, onsetAll: 1 }
    expect(render(mode).fill.stops).toEqual(['#ff0000', '#0000ff'])
  })
})
