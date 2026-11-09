// @vitest-environment jsdom
/**
 * Farbverlauf-Quelle zusammen mit dem eigenen Flächenbild – Canvas und Workspace:
 * - Verlauf liegt unter dem Bild (beim Einpassen an den Rändern sichtbar)
 * - Verlauf (Puls) und Bild (Zoom/Aufhellen) reagieren je auf ihre Quelle
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BackgroundRenderer } from '../../lib/canvasManager/rendering/BackgroundRenderer'
import { SlideshowManager } from '../../lib/slideshowManager'
import { setSlideshowManager } from '../../lib/slideshowManagerBridge'
import { setAudioAnalysisData } from '../helpers/audioStubs'
import { fakeImage, stub, type Call } from '../helpers/canvasStubs'

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
const ALL_BUT = (...sources: unknown[]) =>
  Object.assign(
    {},
    ...Object.entries(HIT)
      .filter(([k]) => !sources.includes(k) && k !== 'dynamic')
      .map(([, v]) => v),
  )

// Canvas 200×100: Bild 50×100 eingepasst bei x=75
// Workspace 40×80 bei (20,10): Bild 100×100 eingepasst 40×40 bei (20,30)
const MODES = {
  canvas: {
    area: [0, 0, 200, 100],
    center: [100, 50],
    half: Math.hypot(200, 100) / 2,
    image: fakeImage({ width: 50, height: 100 }),
    contain: [75, 0, 50, 100],
  },
  workspace: {
    area: [20, 10, 40, 80],
    center: [40, 50],
    half: Math.hypot(40, 80) / 2,
    image: fakeImage({ width: 100, height: 100 }),
    contain: [20, 30, 40, 40],
  },
}
type Mode = keyof typeof MODES

afterEach(() => {
  setSlideshowManager(null)
  setAudioAnalysisData(null)
  vi.restoreAllMocks()
})

type ShowOptions = { gradientSource?: string | null; imageSource?: string | null; fit?: string }
/** Aufgezeichneter Verlauf: Argumente von create*Gradient */
type RecordedGradient = { kind: string; a: number[] }

function show(
  mode: Mode,
  { gradientSource = null, imageSource = null, fit = 'contain' }: ShowOptions = {},
) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const m = new SlideshowManager(stub({ canvas: { width: 200, height: 100 } }), stub(null))
  m.isActive = true
  m.activeImages = [stub()]
  m.setBackgroundMode(mode)
  m.setBaseGradient(mode, {
    enabled: true,
    type: 'radial',
    color2: '#ffffff',
    audio: gradientSource
      ? { enabled: true, source: gradientSource, pulse: 100, rotation: 0 }
      : { enabled: false },
  })
  m.setBaseImage(
    mode,
    {
      enabled: true,
      fit,
      audio: imageSource
        ? { enabled: true, source: imageSource, zoom: 100, brightness: 100, hue: 0 }
        : { enabled: false },
    },
    MODES[mode].image,
  )
  setSlideshowManager(m)
  return m
}

function render(mode: Mode) {
  const calls: Call[] = []
  const [x, y, w, h] = MODES[mode].area
  const manager = {
    background: '#ffffff',
    videoBackground: null,
    workspacePreset: mode === 'workspace' ? { width: 9, height: 16 } : null,
    workspaceBackground: null,
    getWorkspaceBounds: () => ({ x, y, width: w, height: h }),
    backgroundTilesStore: null,
  }
  const r = new BackgroundRenderer(stub(manager))
  r._drawColorBackground = stub(() => calls.push(['canvas-color']))
  r.drawBackgroundTiles = stub(() => {})
  const gradient =
    (kind: string) =>
    (...a: unknown[]) => ({ kind, a, addColorStop() {} })
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
    createLinearGradient: gradient('linear'),
    createRadialGradient: gradient('radial'),
  }
  r.drawBackground(stub(ctx))
  const fill = calls.find((c) => c[0] === 'fill')
  const image = calls.find((c) => c[0] === 'image')
  const grad = fill![1] as RecordedGradient
  return {
    calls,
    radius: grad.a[5],
    gradientCenter: grad.a.slice(0, 2),
    fillRect: fill!.slice(2) as number[],
    image: image && {
      img: image[1],
      filter: image[2] as string,
      rect: image.slice(3) as number[],
    },
  }
}

describe.each(Object.keys(MODES) as Mode[])(
  '%s-Modus – Farbverlauf-Quelle mit Flächenbild',
  (mode) => {
    const { area, center, half, image, contain } = MODES[mode]

    it('Reihenfolge: erst Verlauf über den Bereich, dann Bild darüber (beschnitten)', () => {
      show(mode)
      const out = render(mode)
      const order = out.calls.filter((c) => c[0] !== 'canvas-color').map((c) => c[0])
      expect(order).toEqual(['fill', 'rect', 'clip', 'image'])
      expect(out.fillRect).toEqual(area)
      expect(out.gradientCenter).toEqual(center)
      expect(out.radius).toBe(half)
      expect(out.image).toEqual({ img: image, filter: 'none', rect: contain })
    })

    it('Füllen: Bild deckt den Bereich ab, Verlauf wird trotzdem darunter gezeichnet', () => {
      show(mode, { fit: 'cover', gradientSource: 'bass' })
      const out = render(mode)
      expect(out.fillRect).toEqual(area)
      expect(out.image!.rect[2]).toBeGreaterThanOrEqual(area[2]!)
      expect(out.image!.rect[3]).toBeGreaterThanOrEqual(area[3]!)
    })

    // Nicht gewählte Quellen zuerst: Hüllkurven noch leer → exakt neutral
    it('Verlauf (Höhen-Onset) und Bild (Mitten-Onset) reagieren nicht auf andere Quellen', () => {
      show(mode, { gradientSource: 'trebleOnset', imageSource: 'midOnset' })
      setAudioAnalysisData({ ...SILENT, ...ALL_BUT('trebleOnset', 'midOnset') })
      const out = render(mode)
      expect(out.radius).toBe(half)
      expect(out.image).toEqual({ img: image, filter: 'none', rect: contain })
    })

    it('Quellen sind unabhängig: nur Verlauf-Quelle → nur Puls; nur Bild-Quelle → nur Bild', () => {
      show(mode, { gradientSource: 'bassOnset', imageSource: 'allOnset' })
      setAudioAnalysisData({ ...SILENT, onsetBass: 1 })
      let out = render(mode)
      expect(out.radius).toBeLessThan(half)
      expect(out.image!.rect).toEqual(contain)
      expect(out.image!.filter).toBe('none')

      show(mode, { gradientSource: 'volume', imageSource: 'mid' })
      setAudioAnalysisData({ ...SILENT, mid: 255 })
      out = render(mode)
      expect(out.radius).toBe(half)
      expect(out.image!.rect[2]).toBeGreaterThan(contain[2]!) // Puls-Zoom
      expect(out.image!.filter).toMatch(/^brightness/)
    })

    it.each(Object.keys(HIT))('Verlauf-Puls reagiert unter dem Bild auf %s', (source) => {
      show(mode, { gradientSource: source })
      setAudioAnalysisData({ ...SILENT, ...HIT[source as keyof typeof HIT] })
      const out = render(mode)
      expect(out.radius).toBeLessThan(half)
      expect(out.radius).toBeGreaterThanOrEqual(half * 0.4 - 1e-9)
      expect(out.gradientCenter).toEqual(center)
      // Bild ohne eigenes Audio bleibt unverändert
      expect(out.image).toEqual({ img: image, filter: 'none', rect: contain })
    })

    it('Bild ausgeschaltet: nur der (reagierende) Verlauf', () => {
      const m = show(mode, { gradientSource: 'allOnset' })
      m.setBaseImage(mode, { enabled: false })
      setAudioAnalysisData({ ...SILENT, onsetAll: 1 })
      const out = render(mode)
      expect(out.image).toBeUndefined()
      expect(out.radius).toBeLessThan(half)
    })
  },
)
