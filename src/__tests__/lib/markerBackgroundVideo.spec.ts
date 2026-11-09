import { describe, it, expect, vi, type Mock } from 'vitest'
import {
  captureBackgroundMediaDefaults,
  findGalleryVideo,
  resolveBackgroundMediaDefaults,
  setBackgroundVideoWithDefaults,
} from '../../lib/background/markerBackgroundVideo'
import {
  captureBaseBackground,
  discardBaseBackground,
  releaseVideoBackgrounds,
  restoreBaseBackground,
} from '../../lib/background/markerBackgroundImage'
import { stub } from '../helpers/canvasStubs'

const AR = { enabled: true, source: 'bass', effects: { scale: { enabled: true, intensity: 40 } } }

interface FakeVideo {
  src: string
  paused: boolean
  muted: boolean
  loop: boolean
  currentTime: number
  play: Mock
  pause: Mock
}

interface FakeVideoEntry {
  videoElement: FakeVideo
  fotoSettings?: { audioReactive?: unknown }
  loop?: boolean
}

interface FakeCm {
  workspacePreset: { id: string } | null
  background:
    | string
    | { imageObject: { src: string }; fotoSettings: { audioReactive: unknown } }
    | null
  workspaceBackground: null
  videoBackground: FakeVideoEntry | null
  workspaceVideoBackground: FakeVideoEntry | null
  activeObject: null
  redrawCallback: Mock
  updateUICallback: Mock
  setVideoBackground: Mock<(v: FakeVideo) => void>
  setWorkspaceVideoBackground: Mock<(v: FakeVideo) => void>
}

function fakeVideo(src = 'blob:v', paused = true): FakeVideo {
  return {
    src,
    paused,
    muted: true,
    loop: true,
    currentTime: 3,
    play: vi.fn(function (this: FakeVideo) {
      this.paused = false
      return Promise.resolve()
    }),
    pause: vi.fn(function (this: FakeVideo) {
      this.paused = true
    }),
  }
}

function fakeCm({ workspace = false } = {}) {
  const cm: FakeCm = {
    workspacePreset: workspace ? { id: 'ws' } : null,
    background: null,
    workspaceBackground: null,
    videoBackground: null,
    workspaceVideoBackground: null,
    activeObject: null,
    redrawCallback: vi.fn(),
    updateUICallback: vi.fn(),
    setVideoBackground: vi.fn((v: FakeVideo) => {
      cm.videoBackground = { videoElement: v, fotoSettings: { audioReactive: null } }
      if (typeof cm.background === 'object') cm.background = '#ffffff'
    }),
    setWorkspaceVideoBackground: vi.fn((v: FakeVideo) => {
      cm.workspaceVideoBackground = { videoElement: v, fotoSettings: {} }
      cm.workspaceBackground = null
    }),
  }
  return cm
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('markerBackgroundVideo – Vorgaben', () => {
  it('übernimmt Format und Audio-Reaktiv vom Bild, sonst vom Video-Hintergrund', () => {
    expect(captureBackgroundMediaDefaults(stub(fakeCm()))).toBeNull()

    const withImage = fakeCm()
    withImage.background = { imageObject: { src: 'a.png' }, fotoSettings: { audioReactive: AR } }
    expect(captureBackgroundMediaDefaults(stub(withImage))).toEqual({
      target: 'background',
      audioReactive: AR,
    })

    const withVideo = fakeCm({ workspace: true })
    withVideo.workspaceVideoBackground = {
      videoElement: fakeVideo('blob:ws'),
      fotoSettings: { audioReactive: AR },
    }
    const d = captureBackgroundMediaDefaults(stub(withVideo))
    expect(d).toEqual({ target: 'workspace', audioReactive: AR })
    expect(d!.audioReactive).not.toBe(AR)
  })

  it('nutzt gespeicherte Vorgaben, wenn nichts sichtbar ist, sonst Normal', () => {
    const stored = { target: 'workspace', audioReactive: { enabled: false } }
    expect(resolveBackgroundMediaDefaults(stub(fakeCm()), stored)).toEqual(stored)
    expect(resolveBackgroundMediaDefaults(null, null)).toEqual({
      target: 'background',
      audioReactive: null,
    })
  })

  it('findet Videos per id, sonst per Name', () => {
    const gallery = [
      { id: 1, name: 'intro', src: 'blob:1' },
      { id: 2, name: 'drop', src: 'blob:2' },
    ]
    expect(findGalleryVideo(gallery, { galleryId: 2 })?.src).toBe('blob:2')
    expect(findGalleryVideo(gallery, { galleryId: 9, name: 'intro' })?.src).toBe('blob:1')
    expect(findGalleryVideo(gallery, { galleryId: 9, name: 'weg' })).toBeNull()
    expect(findGalleryVideo(null, { galleryId: 1 })).toBeNull()
    expect(findGalleryVideo(gallery, null)).toBeNull()
  })
})

describe('markerBackgroundVideo – Setzen', () => {
  it('setzt das Video als Hintergrund, übernimmt Audio-Reaktiv und startet von vorne', async () => {
    const cm = fakeCm()
    const v = fakeVideo()
    expect(
      setBackgroundVideoWithDefaults(stub(cm), stub(v), {
        target: 'background',
        audioReactive: AR,
      }),
    ).toBe('background')
    expect(cm.videoBackground!.videoElement).toBe(v)
    expect(cm.videoBackground!.fotoSettings!.audioReactive).toEqual(AR)
    expect(v.currentTime).toBe(0)
    await flush()
    expect(v.play).toHaveBeenCalled()
    expect(cm.redrawCallback).toHaveBeenCalled()
  })

  it('loop: false spielt das Video nur einmal ab', () => {
    const cm = fakeCm()
    const v = fakeVideo()
    setBackgroundVideoWithDefaults(stub(cm), stub(v), null, { loop: false })
    expect(v.loop).toBe(false)
    expect(cm.videoBackground!.loop).toBe(false)
    const v2 = fakeVideo()
    v2.loop = false
    setBackgroundVideoWithDefaults(stub(cm), stub(v2), null)
    expect(v2.loop).toBe(true)
  })

  it('Workspace-Ziel nur mit aktivem Workspace', () => {
    const ws = fakeCm({ workspace: true })
    expect(
      setBackgroundVideoWithDefaults(stub(ws), stub(fakeVideo()), { target: 'workspace' }),
    ).toBe('workspace')
    expect(ws.setVideoBackground).not.toHaveBeenCalled()

    const noWs = fakeCm()
    expect(
      setBackgroundVideoWithDefaults(stub(noWs), stub(fakeVideo()), { target: 'workspace' }),
    ).toBe('background')
    expect(setBackgroundVideoWithDefaults(null, stub(fakeVideo()), null)).toBeNull()
    expect(setBackgroundVideoWithDefaults(stub(noWs), null, null)).toBeNull()
  })
})

describe('Basis-Hintergrund mit Videos', () => {
  it('hängt Basis-Videos nur ab und setzt sie beim Wiederherstellen fort', async () => {
    const cm = fakeCm()
    const userVideo = fakeVideo('blob:user', false)
    const userEntry = { videoElement: userVideo, fotoSettings: {} }
    cm.videoBackground = userEntry
    cm.background = '#ffffff'

    const base = captureBaseBackground(stub(cm))
    releaseVideoBackgrounds(stub(cm), base)
    expect(cm.videoBackground).toBeNull()
    expect(userVideo.pause).toHaveBeenCalled()
    expect(userVideo.src).toBe('blob:user')

    // Marker-Video läuft …
    const markerVideo = fakeVideo('blob:marker')
    setBackgroundVideoWithDefaults(stub(cm), stub(markerVideo), null)
    // … und wird beim Wiederherstellen freigegeben
    expect(restoreBaseBackground(stub(cm), base)).toBe(true)
    expect(markerVideo.src).toBe('')
    expect(cm.videoBackground).toBe(userEntry)
    await flush()
    expect(userVideo.play).toHaveBeenCalled()
  })

  it('gibt Nicht-Basis-Videos beim Abräumen frei', () => {
    const cm = fakeCm()
    const v = fakeVideo('blob:marker')
    cm.videoBackground = { videoElement: v }
    releaseVideoBackgrounds(stub(cm), captureBaseBackground(stub(fakeCm())))
    expect(cm.videoBackground).toBeNull()
    expect(v.src).toBe('')
  })

  it('pausierte Basis-Videos bleiben beim Wiederherstellen pausiert', async () => {
    const cm = fakeCm()
    const v = fakeVideo('blob:user', true)
    cm.videoBackground = { videoElement: v }
    const base = captureBaseBackground(stub(cm))
    releaseVideoBackgrounds(stub(cm), base)
    restoreBaseBackground(stub(cm), base)
    await flush()
    expect(v.play).not.toHaveBeenCalled()
  })

  it('discardBaseBackground gibt nur Videos frei, die nicht mehr auf dem Canvas liegen', () => {
    const cm = fakeCm()
    const onCanvas = fakeVideo('blob:a')
    const parked = fakeVideo('blob:b')
    cm.videoBackground = { videoElement: onCanvas }
    const base = {
      background: null,
      workspaceBackground: null,
      videoBackground: cm.videoBackground,
      workspaceVideoBackground: { videoElement: parked },
    }
    discardBaseBackground(stub(cm), stub(base))
    expect(onCanvas.src).toBe('blob:a')
    expect(parked.src).toBe('')
    expect(() => discardBaseBackground(stub(cm), null)).not.toThrow()

    const kept = fakeVideo('blob:keep')
    const keepEntry = { videoElement: kept }
    discardBaseBackground(
      stub(fakeCm()),
      stub({ videoBackground: keepEntry }),
      stub({ videoBackground: keepEntry }),
    )
    expect(kept.src).toBe('blob:keep')
  })
})
