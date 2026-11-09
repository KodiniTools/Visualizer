// @vitest-environment jsdom
/**
 * Audio-Quellen des eigenen Flächenbildes im Workspace-Modus der Slideshow:
 * Bild liegt im Workspace-Bereich (beschnitten, über der Workspace-Farbe),
 * reagiert nur auf die gewählte Quelle; Canvas-Hintergrund und
 * Canvas-Flächenbild bleiben unberührt.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BackgroundRenderer } from '../../lib/canvasManager/rendering/BackgroundRenderer'
import { SlideshowManager } from '../../lib/slideshowManager'
import { setSlideshowManager } from '../../lib/slideshowManagerBridge'
import { setAudioAnalysisData } from '../helpers/audioStubs'
import { stub, type Call, fakeImage } from '../helpers/canvasStubs'

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
const ALL_BUT = (source: string) =>
  Object.assign(
    {},
    ...Object.entries(HIT)
      .filter(([k]) => k !== source && k !== 'dynamic')
      .map(([, v]) => v),
  )

// Workspace 40×80 bei (20,10) im Canvas 200×100; Bild 100×100:
// eingepasst 40×40 bei (20,30), gefüllt 80×80 bei (0,10)
const WS = { x: 20, y: 10, width: 40, height: 80 }
const IMG = fakeImage({ width: 100, height: 100 })
const CONTAIN = [20, 30, 40, 40]

afterEach(() => {
  setSlideshowManager(null)
  setAudioAnalysisData(null)
  vi.restoreAllMocks()
})

function workspaceShow(fill: object) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const m = new SlideshowManager(stub({ canvas: { width: 200, height: 100 } }), stub(null))
  m.isActive = true
  m.activeImages = [stub()]
  m.setBackgroundMode('workspace')
  m.setWorkspaceColor('#336699')
  m.setBaseImage('workspace', fill, IMG)
  setSlideshowManager(m)
  return m
}

type Preset = { width: number; height: number } | null

function renderWorkspace({ preset = { width: 9, height: 16 } }: { preset?: Preset } = {}) {
  const calls: Call[] = []
  const manager = {
    background: '#ffffff',
    videoBackground: null,
    workspacePreset: preset,
    workspaceBackground: null,
    getWorkspaceBounds: () => ({ ...WS }),
    backgroundTilesStore: null,
  }
  const r = new BackgroundRenderer(stub(manager))
  r._drawColorBackground = stub(() => calls.push(['canvas-color']))
  r.drawBackgroundTiles = stub(() => {})
  const ctx = {
    canvas: { width: 200, height: 100 },
    filter: 'none',
    save() {},
    restore() {},
    beginPath() {},
    clip: () => calls.push(['clip']),
    rect: (...a: unknown[]) => calls.push(['rect', ...a]),
    fillStyle: '',
    fillRect: (...a: unknown[]) => calls.push(['fill', ctx.fillStyle, ...a]),
    drawImage: (img: unknown, ...a: unknown[]) => calls.push(['image', img, ctx.filter, ...a]),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }
  r.drawBackground(stub(ctx))
  return calls
}

/** Aufgezeichneter drawImage-Aufruf: ['image', Bild, Filter, x, y, w, h] */
type ImageCall = [name: string, img: unknown, filter: string, ...rect: number[]]
const imageCall = (calls: Call[]) => calls.find((c) => c[0] === 'image') as ImageCall | undefined
const audio = (source: string, over = {}) => ({
  enabled: true,
  source,
  brightness: 100,
  hue: 100,
  zoom: 100,
  ...over,
})

describe('Workspace-Modus – Flächenbild', () => {
  it('ohne Audio: Canvas-Farbe bleibt, Workspace-Farbe + Bild im Workspace-Bereich', () => {
    workspaceShow({ enabled: true, fit: 'contain' })
    expect(renderWorkspace()).toEqual([
      ['canvas-color'],
      ['fill', '#336699', 20, 10, 40, 80],
      ['rect', 20, 10, 40, 80],
      ['clip'],
      ['image', IMG, 'none', ...CONTAIN],
    ])
  })

  it('Füllen: Bild deckt den Workspace ab (auf den Bereich beschnitten)', () => {
    workspaceShow({ enabled: true, fit: 'cover' })
    expect(imageCall(renderWorkspace())!.slice(3)).toEqual([0, 10, 80, 80])
  })

  it('ohne Workspace-Format: kein Flächenbild', () => {
    workspaceShow({ enabled: true, fit: 'contain' })
    expect(imageCall(renderWorkspace({ preset: null }))).toBeUndefined()
  })

  // Nicht gewählte Quelle zuerst: Hüllkurve noch leer → exakt neutral
  it('reagiert nicht auf andere Quellen (alles außer Bass-Onset angeschlagen)', () => {
    workspaceShow({ enabled: true, fit: 'contain', audio: audio('bassOnset') })
    setAudioAnalysisData({ ...SILENT, ...ALL_BUT('bassOnset') })
    expect(imageCall(renderWorkspace())!.slice(2)).toEqual(['none', ...CONTAIN])
  })

  // vor den Schleifen-Tests: Höhen-Onset hier noch unbenutzt (Hüllkurve leer)
  it('Quelle live ändern: gilt beim nächsten Frame, Bild bleibt', () => {
    const m = workspaceShow({ enabled: true, fit: 'contain', audio: audio('trebleOnset') })
    setAudioAnalysisData({ ...SILENT, onsetMid: 1 })
    expect(imageCall(renderWorkspace())![2]).toBe('none') // Höhen-Onset still
    m.setBaseImage('workspace', { audio: audio('midOnset') })
    expect(m.getBaseImage('workspace')!.image).toBe(IMG)
    expect(imageCall(renderWorkspace())![2]).toMatch(/^brightness/)
  })

  it.each(Object.keys(HIT))('reagiert im Workspace auf %s (Aufhellen, Farbton, Zoom)', (source) => {
    workspaceShow({ enabled: true, fit: 'contain', audio: audio(source) })
    setAudioAnalysisData({ ...SILENT, ...HIT[source as keyof typeof HIT] })
    const calls = renderWorkspace()
    // weiterhin auf den Workspace beschnitten
    expect(calls).toContainEqual(['rect', 20, 10, 40, 80])
    const [, img, filter, x, y, w, h] = imageCall(calls)!
    expect(img).toBe(IMG)
    const [, bright, hue] = filter.match(/^brightness\(([\d.]+)%\) hue-rotate\(([\d.]+)deg\)$/)!
    expect(Number(bright)).toBeGreaterThan(100)
    expect(Number(hue)).toBeGreaterThan(0)
    // Puls-Zoom um die Mitte des Workspace
    expect(w).toBeGreaterThan(40)
    expect(x! + w! / 2).toBeCloseTo(40)
    expect(y! + h! / 2).toBeCloseTo(50)
  })

  it('einzelne Effekte: Stärke 0 schaltet ab', () => {
    workspaceShow({
      enabled: true,
      fit: 'contain',
      audio: audio('allOnset', { brightness: 0, hue: 0 }),
    })
    setAudioAnalysisData({ ...SILENT, onsetAll: 1 })
    const [, , filter, , , w] = imageCall(renderWorkspace())!
    expect(filter).toBe('none')
    expect(w).toBeGreaterThan(40) // nur Zoom
  })

  it('Canvas-Flächenbild und dessen Quelle wirken im Workspace-Modus nicht', () => {
    const m = workspaceShow({ enabled: true, fit: 'contain' }) // Workspace: ohne Audio
    m.setBaseImage(
      'canvas',
      { enabled: true, audio: audio('bass') },
      fakeImage({ width: 1, height: 1 }),
    )
    setAudioAnalysisData({ ...SILENT, bass: 255, onsetAll: 1 })
    const calls = renderWorkspace()
    expect(calls[0]).toEqual(['canvas-color']) // Canvas-Hintergrund unverändert
    expect(calls.filter((c) => c[0] === 'image')).toHaveLength(1)
    expect(imageCall(calls)!.slice(1)).toEqual([IMG, 'none', ...CONTAIN])
  })
})
