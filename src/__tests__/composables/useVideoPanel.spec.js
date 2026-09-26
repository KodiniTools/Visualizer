// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useVideoPanel } from '../../composables/useVideoPanel.js'

/**
 * Verhaltenstest für useVideoPanel: protokolliert alle Zugriffe auf
 * Video-Elemente (Property-Zuweisungen + Methoden), Manager und die
 * Aufnahme-Anbindung (window.connectVideoToRecording …) in exakter Reihenfolge.
 */

const log = []
const L = (...parts) => log.push(parts.map(fmt).join(' '))

function fmt(v) {
  if (v === null) return 'null'
  if (v === undefined) return 'undef'
  if (typeof v === 'function') return 'fn'
  if (typeof v === 'object') {
    if (v.__label) return `<${v.__label}>`
    return JSON.stringify(v, (k, x) =>
      x && typeof x === 'object' && x.__label ? `<${x.__label}>` : x,
    )
  }
  return String(v)
}

let videoSeq = 0
/** Video-Element-Attrappe: protokolliert Zuweisungen und Aufrufe. */
function fakeVideo(label = `v${++videoSeq}`, init = {}) {
  const state = {
    __label: label,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    paused: true,
    loop: false,
    videoWidth: 640,
    videoHeight: 360,
    ...init,
  }
  const methods = {
    play: () => {
      L(`${label}.play`)
      state.paused = false
      return Promise.resolve()
    },
    pause: () => {
      L(`${label}.pause`)
      state.paused = true
    },
    load: () => L(`${label}.load`),
  }
  return new Proxy(state, {
    get(t, p) {
      if (p in methods) return methods[p]
      return t[p]
    },
    set(t, p, v) {
      t[p] = v
      if (typeof v !== 'function') L(`${label}.${String(p)}=`, v)
      else L(`${label}.${String(p)}=fn`)
      return true
    },
  })
}

let created
function makeManagers() {
  const videoManager = {
    videos: [],
    getAllVideos() {
      return this.videos
    },
    addVideo: (el, opts) => L('vm.addVideo', el, opts),
    pauseVideo: (id) => L('vm.pauseVideo', id),
    playVideo: (id) => L('vm.playVideo', id),
    removeVideo: (id) => L('vm.removeVideo', id),
    playAll: () => L('vm.playAll'),
    pauseAll: () => L('vm.pauseAll'),
  }
  const canvasManager = {
    activeObject: null,
    videoBackground: null,
    workspaceVideoBackground: null,
    workspacePreset: null,
    setActiveObject(o) {
      L('cm.setActiveObject', o)
      this.activeObject = o
    },
    setVideoBackground: (v) => L('cm.setVideoBackground', v),
    setWorkspaceVideoBackground: (v) => L('cm.setWorkspaceVideoBackground', v),
    redrawCallback: () => L('cm.redraw'),
  }
  return { videoManager, canvasManager }
}

let wrapper
let vp
let cmRef
let vmRef

function mountPanel({ noVm = false } = {}) {
  const m = makeManagers()
  cmRef = ref(m.canvasManager)
  vmRef = ref(noVm ? null : m.videoManager)
  const Host = defineComponent({
    setup() {
      vp = useVideoPanel()
      return () => h('div')
    },
  })
  wrapper = mount(Host, {
    global: { provide: { canvasManager: cmRef, videoManager: vmRef } },
  })
  return { cm: cmRef.value, vm: vmRef.value }
}

function file(name, type = 'video/mp4') {
  return { name, type }
}

async function uploadVideo(name, duration = 12.5) {
  vp.processVideoFile(file(name))
  const el = created.at(-1)
  el.duration = duration
  el.onloadedmetadata()
  await nextTick()
  return el
}

beforeEach(() => {
  setActivePinia(createPinia())
  log.length = 0
  videoSeq = 0
  created = []
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(Date, 'now').mockReturnValue(1000)
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  let urlSeq = 0
  vi.stubGlobal('URL', {
    createObjectURL: (f) => {
      L('URL.create', f.name)
      return `blob:${++urlSeq}`
    },
    revokeObjectURL: (u) => L('URL.revoke', u),
  })
  const origCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag !== 'video') return origCreate(tag)
    const el = fakeVideo()
    created.push(el)
    L('createVideo', el)
    return el
  })
  window.connectVideoToRecording = (el, vol) => L('rec.connect', el, vol)
  window.disconnectVideoFromRecording = (el) => L('rec.disconnect', el)
  window.setVideoVolume = (el, vol) => L('rec.setVolume', el, vol)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete window.connectVideoToRecording
  delete window.disconnectVideoFromRecording
  delete window.setVideoVolume
})

describe('useVideoPanel – API', () => {
  it('liefert unverändert alle Schlüssel', () => {
    mountPanel()
    expect(Object.keys(vp).sort()).toMatchSnapshot()
  })

  it('Zeitformat', () => {
    mountPanel()
    for (const f of [vp.formatTime, vp.formatDuration]) {
      expect(f(0)).toBe('0:00')
      expect(f(NaN)).toBe('0:00')
      expect(f(Infinity)).toBe('0:00')
      expect(f(65.9)).toBe('1:05')
      expect(f(600)).toBe('10:00')
    }
  })
})

describe('useVideoPanel – Galerie', () => {
  it('Upload, Auswahl, Löschen, Leeren', async () => {
    mountPanel()
    vp.processVideoFile(file('x.avi', 'video/avi'))
    expect(created).toHaveLength(0)

    await uploadVideo('Clip A.mp4')
    await uploadVideo('b.mp4', 3)
    await uploadVideo('c.mp4', 4)
    expect(vp.videoGallery.value.map((v) => v.name)).toEqual(['Clip A', 'b', 'c'])
    expect(vp.selectedVideoIndex.value).toBe(2)

    vp.selectVideo(1)
    vp.deleteVideo(0)
    expect(vp.selectedVideoIndex.value).toBe(0)
    vp.deleteVideo(0)
    expect(vp.selectedVideoIndex.value).toBe(0)
    vp.selectVideo(0)
    await uploadVideo('d.mp4')
    vp.selectVideo(0)
    vp.deleteVideo(1)
    expect(vp.selectedVideoIndex.value).toBe(0)
    vp.clearAllVideos()
    expect(vp.videoGallery.value).toEqual([])
    expect(vp.selectedVideoIndex.value).toBeNull()

    // Ladefehler gibt die URL wieder frei
    vp.processVideoFile(file('kaputt.webm', 'video/webm'))
    created.at(-1).onerror()
    expect(log).toMatchSnapshot()
  })

  it('Löschen vor der Auswahl verschiebt den Auswahl-Index', async () => {
    mountPanel()
    for (const n of ['a.mp4', 'b.mp4', 'c.mp4', 'd.mp4']) await uploadVideo(n)
    vp.selectVideo(3)
    vp.deleteVideo(0)
    expect(vp.selectedVideoIndex.value).toBe(2)
    expect(vp.videoGallery.value[2].name).toBe('d')
    vp.deleteVideo(2) // ausgewähltes Video → erstes wird ausgewählt
    expect(vp.selectedVideoIndex.value).toBe(0)
    vp.deleteVideo(1) // nach der Auswahl → unverändert
    expect(vp.selectedVideoIndex.value).toBe(0)
  })

  it('Eingabe, Drop, Datei-Dialog, Vorschaubild', async () => {
    mountPanel()
    const input = { click: () => L('input.click'), value: 'C:\\x.mp4' }
    vp.fileInputRef.value = input
    vp.triggerFileInput()
    vp.handleVideoUpload({ target: { files: [file('a.mp4')] } })
    expect(input.value).toBe('')
    vp.handleVideoUpload({ target: { files: [] } })
    vp.handleDrop({ dataTransfer: { files: [file('b.mov', 'video/quicktime')] } })
    vp.handleDrop({ dataTransfer: { files: [] } })
    const thumb = fakeVideo('thumb')
    vp.generateThumbnail({ target: thumb }, 0)
    expect(log).toMatchSnapshot()
  })
})

describe('useVideoPanel – Platzieren', () => {
  it('auf Canvas, als Hintergrund, als Workspace-Hintergrund', async () => {
    const { cm } = mountPanel()
    vp.addVideoToCanvas()
    vp.setVideoAsBackground()
    vp.setVideoAsWorkspaceBackground()
    await uploadVideo('a.mp4')
    log.length = 0

    vp.videoScale.value = 6
    vp.selectedAnimation.value = 'fade'
    vp.animationDuration.value = 800
    vp.videoLoop.value = false
    await nextTick()
    vp.addVideoToCanvas()
    created.at(-1).onloadeddata()
    created.at(-1).onerror()

    vp.setVideoAsBackground()
    created.at(-1).onloadeddata()
    created.at(-1).onerror()

    vp.setVideoAsWorkspaceBackground() // ohne Workspace-Format → Warnung
    cm.workspacePreset = 'ig'
    vp.videoMuted.value = true
    await nextTick()
    vp.setVideoAsWorkspaceBackground()
    created.at(-1).onloadeddata()
    created.at(-1).onerror()
    expect(log).toMatchSnapshot()
  })

  it('ohne Video-Manager', async () => {
    mountPanel({ noVm: true })
    await uploadVideo('a.mp4')
    log.length = 0
    vp.addVideoDirectly()
    expect(created.at(-1).__label).toBe('v1')
    expect(console.error).toHaveBeenCalledWith('VideoManager nicht verfügbar')
  })
})

describe('useVideoPanel – Canvas-Videos', () => {
  it('Auswahl, Zeit/Lautstärke, Steuerung, Entfernen', async () => {
    const { cm, vm } = mountPanel()
    const el1 = fakeVideo('cv1', { currentTime: 5, duration: 20, volume: 0.4 })
    const el2 = fakeVideo('cv2', { muted: true })
    const v1 = { __label: 'video1', id: 1, type: 'video', videoElement: el1, isPlaying: false }
    const v2 = { __label: 'video2', id: 2, type: 'video', videoElement: el2, isPlaying: true }
    vm.videos.push(v1, v2)

    expect(vp.canvasVideos.value).toHaveLength(2)
    expect(vp.selectedCanvasVideo.value).toBeNull()
    expect(vp.selectedVideoCurrentTime.value).toBe(0)
    expect(vp.selectedVideoVolume.value).toBe(1)

    vp.selectCanvasVideo(v1)
    await nextTick()
    expect(vp.selectedCanvasVideo.value.id).toBe(1)
    expect(vp.isVideoActive(v1)).toBe(true)
    expect(vp.isVideoActive(v2)).toBe(false)
    expect(vp.selectedVideoCurrentTime.value).toBe(5)
    expect(vp.selectedVideoDuration.value).toBe(20)
    expect(vp.selectedVideoVolume.value).toBe(0.4)

    cmRef.value.activeObject = { type: 'text' }
    await nextTick()
    expect(vp.selectedCanvasVideo.value).toBeNull()
    vp.selectCanvasVideo(v1)
    await nextTick()

    vp.togglePlayVideo(v1)
    vp.togglePlayVideo(v2)
    vp.playAllVideos()
    vp.pauseAllVideos()
    vp.seekToTime(v1, '7.5')
    vp.seekBackward(v1, 10)
    vp.seekForward(v1, 30)
    vp.seekToTime(null, 1)
    vp.updateVideoVolume('0.5')
    vp.updateVideoVolume('0')
    vp.connectVideoAudioForRecording(v2)
    vp.connectVideoAudioForRecording({})
    vp.removeCanvasVideo(v1)
    expect(cm.activeObject).toBeNull()
    vp.updateVideoVolume('0.3') // ohne Auswahl → nichts
    expect(log).toMatchSnapshot()
  })
})

describe('useVideoPanel – Hintergrund-Videos', () => {
  for (const [key, prefix, fns] of [
    [
      'videoBackground',
      'bg',
      {
        playing: 'isVideoBackgroundPlaying',
        time: 'videoBackgroundTime',
        duration: 'videoBackgroundDuration',
        volume: 'videoBackgroundVolume',
        toggle: 'toggleVideoBackground',
        seek: 'seekVideoBackground',
        back: 'seekBackwardBg',
        fwd: 'seekForwardBg',
        setVolume: 'updateBgVideoVolume',
        remove: 'removeVideoBackground',
      },
    ],
    [
      'workspaceVideoBackground',
      'ws',
      {
        playing: 'isWsVideoBackgroundPlaying',
        time: 'wsVideoBackgroundTime',
        duration: 'wsVideoBackgroundDuration',
        volume: 'wsVideoBackgroundVolume',
        toggle: 'toggleWsVideoBackground',
        seek: 'seekWsVideoBackground',
        back: 'seekBackwardWsBg',
        fwd: 'seekForwardWsBg',
        setVolume: 'updateWsBgVideoVolume',
        remove: 'removeWsVideoBackground',
      },
    ],
  ]) {
    it(`${key}: Zustand und Steuerung`, async () => {
      vi.useFakeTimers()
      mountPanel()
      // Ohne Hintergrund: Standardwerte, Aktionen ohne Wirkung
      expect(vp.hasVideoBackground.value).toBeFalsy()
      expect(vp[fns.playing].value).toBe(false)
      expect(vp[fns.time].value).toBe(0)
      expect(vp[fns.duration].value).toBe(0)
      expect(vp[fns.volume].value).toBe(1)
      for (const f of ['toggle', 'seek', 'back', 'fwd', 'setVolume', 'remove']) vp[fns[f]](1)
      expect(log).toEqual([])

      const el = fakeVideo(prefix, { currentTime: 4, duration: 10, volume: 0.6 })
      cmRef.value[key] = { videoElement: el }
      await nextTick()
      expect(vp.hasVideoBackground.value).toBeTruthy()
      expect(vp[fns.time].value).toBe(4)
      expect(vp[fns.duration].value).toBe(10)
      expect(vp[fns.volume].value).toBe(0.6)

      vp[fns.toggle]()
      await nextTick()
      vi.advanceTimersByTime(250) // Zeit-Tick → Computeds neu lesen
      await nextTick()
      expect(vp[fns.playing].value).toBe(true)
      vp[fns.toggle]()
      vp[fns.seek]('2.5')
      vp[fns.back](5)
      vp[fns.fwd](20)
      vp[fns.setVolume]('0.8')
      vp[fns.setVolume]('0')
      await nextTick()
      expect(vp[fns.volume].value).toBe(0)
      vp[fns.remove]()
      expect(cmRef.value[key]).toBeNull()
      expect(log).toMatchSnapshot()
    })
  }
})

describe('useVideoPanel – Stumm/Wiederholen für alle Videos', () => {
  it('überträgt Einstellungen auf Canvas- und Hintergrund-Videos', async () => {
    const { vm } = mountPanel()
    const cv = fakeVideo('cv', { volume: 0 })
    vm.videos.push({ __label: 'video1', id: 1, videoElement: cv }, { id: 2 })
    cmRef.value.videoBackground = { videoElement: fakeVideo('bg', { volume: 0 }) }
    cmRef.value.workspaceVideoBackground = { videoElement: fakeVideo('ws', { volume: 0.3 }) }
    await nextTick()
    log.length = 0

    vp.videoMuted.value = true
    await nextTick()
    vp.videoMuted.value = false
    await nextTick()
    vp.videoLoop.value = false
    await nextTick()
    vp.videoLoop.value = true
    await nextTick()
    expect(vm.videos[0].muted).toBe(false)
    expect(vm.videos[0].loop).toBe(true)
    expect(log).toMatchSnapshot()
  })

  it('ohne Manager passiert nichts', async () => {
    mountPanel({ noVm: true })
    cmRef.value = null
    await nextTick()
    vp.videoMuted.value = true
    vp.videoLoop.value = false
    await nextTick()
    expect(log).toEqual([])
  })
})

describe('useVideoPanel – Zeit-Tick', () => {
  it('erhöht den Update-Schlüssel alle 250 ms und stoppt beim Unmount', () => {
    vi.useFakeTimers()
    mountPanel()
    const start = vp.videoTimeUpdateKey.value
    vi.advanceTimersByTime(1000)
    expect(vp.videoTimeUpdateKey.value).toBe(start + 4)
    wrapper.unmount()
    wrapper = null
    vi.advanceTimersByTime(1000)
    expect(vp.videoTimeUpdateKey.value).toBe(start + 4)
  })
})
