import { describe, it, expect, vi } from 'vitest'
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

const AR = { enabled: true, source: 'bass', effects: { scale: { enabled: true, intensity: 40 } } }

function fakeVideo(src = 'blob:v', paused = true) {
  return {
    src,
    paused,
    muted: true,
    loop: true,
    currentTime: 3,
    play: vi.fn(function () {
      this.paused = false
      return Promise.resolve()
    }),
    pause: vi.fn(function () {
      this.paused = true
    }),
  }
}

function fakeCm({ workspace = false } = {}) {
  const cm = {
    workspacePreset: workspace ? { id: 'ws' } : null,
    background: null,
    workspaceBackground: null,
    videoBackground: null,
    workspaceVideoBackground: null,
    activeObject: null,
    redrawCallback: vi.fn(),
    updateUICallback: vi.fn(),
    setVideoBackground: vi.fn((v) => {
      cm.videoBackground = { videoElement: v, fotoSettings: { audioReactive: null } }
      if (typeof cm.background === 'object') cm.background = '#ffffff'
    }),
    setWorkspaceVideoBackground: vi.fn((v) => {
      cm.workspaceVideoBackground = { videoElement: v, fotoSettings: {} }
      cm.workspaceBackground = null
    }),
  }
  return cm
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('markerBackgroundVideo – Vorgaben', () => {
  it('übernimmt Format und Audio-Reaktiv vom Bild, sonst vom Video-Hintergrund', () => {
    expect(captureBackgroundMediaDefaults(fakeCm())).toBeNull()

    const withImage = fakeCm()
    withImage.background = { imageObject: { src: 'a.png' }, fotoSettings: { audioReactive: AR } }
    expect(captureBackgroundMediaDefaults(withImage)).toEqual({
      target: 'background',
      audioReactive: AR,
    })

    const withVideo = fakeCm({ workspace: true })
    withVideo.workspaceVideoBackground = {
      videoElement: fakeVideo('blob:ws'),
      fotoSettings: { audioReactive: AR },
    }
    const d = captureBackgroundMediaDefaults(withVideo)
    expect(d).toEqual({ target: 'workspace', audioReactive: AR })
    expect(d.audioReactive).not.toBe(AR)
  })

  it('nutzt gespeicherte Vorgaben, wenn nichts sichtbar ist, sonst Normal', () => {
    const stored = { target: 'workspace', audioReactive: { enabled: false } }
    expect(resolveBackgroundMediaDefaults(fakeCm(), stored)).toEqual(stored)
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
    expect(setBackgroundVideoWithDefaults(cm, v, { target: 'background', audioReactive: AR })).toBe(
      'background',
    )
    expect(cm.videoBackground.videoElement).toBe(v)
    expect(cm.videoBackground.fotoSettings.audioReactive).toEqual(AR)
    expect(v.currentTime).toBe(0)
    await flush()
    expect(v.play).toHaveBeenCalled()
    expect(cm.redrawCallback).toHaveBeenCalled()
  })

  it('Workspace-Ziel nur mit aktivem Workspace', () => {
    const ws = fakeCm({ workspace: true })
    expect(setBackgroundVideoWithDefaults(ws, fakeVideo(), { target: 'workspace' })).toBe(
      'workspace',
    )
    expect(ws.setVideoBackground).not.toHaveBeenCalled()

    const noWs = fakeCm()
    expect(setBackgroundVideoWithDefaults(noWs, fakeVideo(), { target: 'workspace' })).toBe(
      'background',
    )
    expect(setBackgroundVideoWithDefaults(null, fakeVideo(), null)).toBeNull()
    expect(setBackgroundVideoWithDefaults(noWs, null, null)).toBeNull()
  })
})

describe('Basis-Hintergrund mit Videos', () => {
  it('hängt Basis-Videos nur ab und setzt sie beim Wiederherstellen fort', async () => {
    const cm = fakeCm()
    const userVideo = fakeVideo('blob:user', false)
    const userEntry = { videoElement: userVideo, fotoSettings: {} }
    cm.videoBackground = userEntry
    cm.background = '#ffffff'

    const base = captureBaseBackground(cm)
    releaseVideoBackgrounds(cm, base)
    expect(cm.videoBackground).toBeNull()
    expect(userVideo.pause).toHaveBeenCalled()
    expect(userVideo.src).toBe('blob:user')

    // Marker-Video läuft …
    const markerVideo = fakeVideo('blob:marker')
    setBackgroundVideoWithDefaults(cm, markerVideo, null)
    // … und wird beim Wiederherstellen freigegeben
    expect(restoreBaseBackground(cm, base)).toBe(true)
    expect(markerVideo.src).toBe('')
    expect(cm.videoBackground).toBe(userEntry)
    await flush()
    expect(userVideo.play).toHaveBeenCalled()
  })

  it('gibt Nicht-Basis-Videos beim Abräumen frei', () => {
    const cm = fakeCm()
    const v = fakeVideo('blob:marker')
    cm.videoBackground = { videoElement: v }
    releaseVideoBackgrounds(cm, captureBaseBackground(fakeCm()))
    expect(cm.videoBackground).toBeNull()
    expect(v.src).toBe('')
  })

  it('pausierte Basis-Videos bleiben beim Wiederherstellen pausiert', async () => {
    const cm = fakeCm()
    const v = fakeVideo('blob:user', true)
    cm.videoBackground = { videoElement: v }
    const base = captureBaseBackground(cm)
    releaseVideoBackgrounds(cm, base)
    restoreBaseBackground(cm, base)
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
    discardBaseBackground(cm, base)
    expect(onCanvas.src).toBe('blob:a')
    expect(parked.src).toBe('')
    expect(() => discardBaseBackground(cm, null)).not.toThrow()
  })
})
