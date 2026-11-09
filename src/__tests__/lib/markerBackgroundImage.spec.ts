import { describe, it, expect, vi, type Mock } from 'vitest'
import {
  captureBackgroundImageDefaults,
  findGalleryImage,
  resolveBackgroundImageDefaults,
  setBackgroundImageWithDefaults,
} from '../../lib/background/markerBackgroundImage'
import { stub } from '../helpers/canvasStubs'

const AR = { enabled: true, source: 'bass', effects: { scale: { enabled: true, intensity: 60 } } }

interface FakeImg {
  src: string
}

interface FakeBgEntry {
  type?: string
  imageObject: FakeImg
  fotoSettings: { audioReactive?: unknown }
}

type FakeBg = FakeBgEntry | string | null

interface FakeCm {
  workspacePreset: { id: string } | null
  background: FakeBg
  workspaceBackground: FakeBg
  videoBackground: { videoElement: object } | null
  workspaceVideoBackground: null
  redrawCallback: Mock
  updateUICallback: Mock
  setBackground: Mock<(img: FakeImg) => void>
  setWorkspaceBackground: Mock<(img: FakeImg) => boolean>
}

function fakeCm({
  workspace = false,
  bg = null,
  wsBg = null,
}: { workspace?: boolean; bg?: FakeBg; wsBg?: FakeBg } = {}) {
  const cm: FakeCm = {
    workspacePreset: workspace ? { id: 'ws' } : null,
    background: bg,
    workspaceBackground: wsBg,
    videoBackground: null,
    workspaceVideoBackground: null,
    redrawCallback: vi.fn(),
    updateUICallback: vi.fn(),
    setBackground: vi.fn((img: FakeImg) => {
      cm.background = {
        type: 'background',
        imageObject: img,
        fotoSettings: { audioReactive: null },
      }
    }),
    setWorkspaceBackground: vi.fn((img: FakeImg) => {
      if (!cm.workspacePreset) return false
      cm.workspaceBackground = { type: 'workspace-background', imageObject: img, fotoSettings: {} }
      return true
    }),
  }
  return cm
}

const imageBg = (src: string, ar: unknown = AR): FakeBgEntry => ({
  imageObject: { src },
  fotoSettings: { audioReactive: ar },
})

describe('markerBackgroundImage', () => {
  it('erfasst Format und Audio-Reaktiv des aktuellen Hintergrund-Bildes', () => {
    expect(captureBackgroundImageDefaults(stub(fakeCm()))).toBeNull()
    const normal = captureBackgroundImageDefaults(stub(fakeCm({ bg: imageBg('a.png') })))
    expect(normal).toEqual({ target: 'background', audioReactive: AR })
    expect(normal!.audioReactive).not.toBe(AR)
    const ws = captureBackgroundImageDefaults(
      stub(fakeCm({ workspace: true, bg: imageBg('a.png', null), wsBg: imageBg('b.png') })),
    )
    expect(ws!.target).toBe('workspace')
  })

  it('bevorzugt das sichtbare Bild, sonst die gespeicherten Vorgaben, sonst Normal', () => {
    const stored = { target: 'workspace', audioReactive: { enabled: false } }
    expect(resolveBackgroundImageDefaults(stub(fakeCm({ bg: imageBg('a.png') })), stored)).toEqual({
      target: 'background',
      audioReactive: AR,
    })
    expect(resolveBackgroundImageDefaults(stub(fakeCm({ bg: 'rgba(0,0,0,1)' })), stored)).toEqual(
      stored,
    )
    expect(resolveBackgroundImageDefaults(null, null)).toEqual({
      target: 'background',
      audioReactive: null,
    })
  })

  it('setzt das Bild als normalen Hintergrund und übernimmt Audio-Reaktiv', () => {
    const cm = fakeCm({ bg: imageBg('alt.png') })
    const img = { src: 'neu.png' }
    const target = setBackgroundImageWithDefaults(stub(cm), stub(img), {
      target: 'background',
      audioReactive: AR,
    })
    expect(target).toBe('background')
    expect((cm.background as FakeBgEntry).imageObject).toBe(img)
    expect((cm.background as FakeBgEntry).fotoSettings.audioReactive).toEqual(AR)
    expect((cm.background as FakeBgEntry).fotoSettings.audioReactive).not.toBe(AR)
    expect(cm.redrawCallback).toHaveBeenCalled()
  })

  it('setzt das Bild als Workspace-Hintergrund, wenn das vorherige dort lag', () => {
    const cm = fakeCm({ workspace: true })
    const img = { src: 'neu.png' }
    expect(
      setBackgroundImageWithDefaults(stub(cm), stub(img), {
        target: 'workspace',
        audioReactive: AR,
      }),
    ).toBe('workspace')
    expect((cm.workspaceBackground as FakeBgEntry).imageObject).toBe(img)
    expect((cm.workspaceBackground as FakeBgEntry).fotoSettings.audioReactive).toEqual(AR)
    expect(cm.setBackground).not.toHaveBeenCalled()
  })

  it('fällt ohne aktiven Workspace auf den normalen Hintergrund zurück', () => {
    const cm = fakeCm({ workspace: false })
    expect(
      setBackgroundImageWithDefaults(stub(cm), stub({ src: 'x' }), { target: 'workspace' }),
    ).toBe('background')
    expect((cm.background as FakeBgEntry).imageObject.src).toBe('x')
  })

  it('entfernt laufende Video-Hintergründe', () => {
    const cm = fakeCm()
    const pause = vi.fn()
    cm.videoBackground = {
      videoElement: { pause, src: 'v.mp4', removeAttribute: vi.fn(), load: vi.fn() },
    }
    setBackgroundImageWithDefaults(stub(cm), stub({ src: 'x' }), {
      target: 'background',
      audioReactive: null,
    })
    expect(cm.videoBackground).toBeNull()
  })

  it('findet Galerie-Bilder per id, sonst per Name', () => {
    const gallery = [
      { id: 1, name: 'a.png', img: {} },
      { id: 2, name: 'b.png', img: {} },
    ]
    expect(findGalleryImage(stub(gallery), { galleryId: 2 })).toBe(gallery[1])
    expect(findGalleryImage(stub(gallery), { galleryId: 99, name: 'a.png' })).toBe(gallery[0])
    expect(findGalleryImage(stub(gallery), { galleryId: 99, name: 'c.png' })).toBeNull()
    expect(findGalleryImage(null, { galleryId: 1 })).toBeNull()
  })
})
