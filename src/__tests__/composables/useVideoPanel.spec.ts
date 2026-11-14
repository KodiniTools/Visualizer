// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, ref, nextTick, type Ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useVideoPanel } from '../../composables/useVideoPanel'
import type { VideoObject } from '../../lib/videoManager'
import { registerAudioEngine } from '../../lib/audioEngineBridge'
import { stub } from '../helpers/canvasStubs'

/**
 * Verhaltenstest für useVideoPanel: protokolliert alle Zugriffe auf
 * Video-Elemente (Property-Zuweisungen + Methoden), Manager und die
 * Aufnahme-Anbindung (Audio-Engine connectVideoToRecording …) in exakter Reihenfolge.
 */

const log: string[] = []
const L = (...parts: unknown[]) => log.push(parts.map(fmt).join(' '))

function fmt(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undef'
  if (typeof v === 'function') return 'fn'
  if (typeof v === 'object') {
    const o = v as { __label?: string }
    if (o.__label) return `<${o.__label}>`
    return JSON.stringify(v, (k, x) =>
      x && typeof x === 'object' && x.__label ? `<${x.__label}>` : x,
    )
  }
  return String(v)
}

let videoSeq = 0
let unregisterEngine = () => {}
/** Video-Element-Attrappe, wie die Specs sie lesen und auslösen */
interface FakeVideo {
  __label: string
  src: string
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  loop: boolean
  paused: boolean
  onloadedmetadata: () => void
  onloadeddata: () => void
  onerror: () => void
}

/** Video-Element-Attrappe: protokolliert Zuweisungen und Aufrufe. */
function fakeVideo(label = `v${++videoSeq}`, init: Record<string, unknown> = {}): FakeVideo {
  const state: Record<string | symbol, unknown> = {
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
  const methods: Record<string | symbol, unknown> = {
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
    getAttribute: (name: string) => (name === 'src' ? (state.src ?? null) : null),
  }
  return stub(
    new Proxy(state, {
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
    }),
  )
}

/** Manager-Attrappen: bekannte Felder plus beliebige Zuweisungen der Specs */
type FakeCm = Record<string, unknown> & { activeObject: unknown; setActiveObject(o: unknown): void }
type FakeVm = {
  videos: Record<string, unknown>[]
  getAllVideos(): Record<string, unknown>[]
} & Record<string, unknown>

let created: FakeVideo[]
function makeManagers() {
  const videoManager: FakeVm = {
    videos: [],
    getAllVideos() {
      return this.videos
    },
    addVideo: (el: unknown, opts: unknown) => L('vm.addVideo', el, opts),
    pauseVideo: (id: unknown) => L('vm.pauseVideo', id),
    playVideo: (id: unknown) => L('vm.playVideo', id),
    removeVideo: (id: unknown) => L('vm.removeVideo', id),
    playAll: () => L('vm.playAll'),
    pauseAll: () => L('vm.pauseAll'),
  }
  const canvasManager: FakeCm = {
    activeObject: null,
    videoBackground: null,
    workspaceVideoBackground: null,
    workspacePreset: null,
    setActiveObject(o: unknown) {
      L('cm.setActiveObject', o)
      this.activeObject = o
    },
    setVideoBackground: (v: unknown) => L('cm.setVideoBackground', v),
    setWorkspaceVideoBackground: (v: unknown) => L('cm.setWorkspaceVideoBackground', v),
    redrawCallback: () => L('cm.redraw'),
  }
  return { videoManager, canvasManager }
}

let wrapper: VueWrapper | null
let vp: ReturnType<typeof useVideoPanel>
let cmRef: Ref<FakeCm | null>
let vmRef: Ref<FakeVm | null>

function mountPanel({ noVm = false }: { noVm?: boolean } = {}) {
  const m = makeManagers()
  cmRef = ref(m.canvasManager) as Ref<FakeCm | null>
  vmRef = ref(noVm ? null : m.videoManager) as Ref<FakeVm | null>
  const Host = defineComponent({
    setup() {
      vp = useVideoPanel()
      return () => h('div')
    },
  })
  wrapper = mount(Host, {
    global: { provide: { canvasManager: cmRef, videoManager: vmRef } },
  })
  return { cm: cmRef.value!, vm: vmRef.value }
}

function file(name: string, type = 'video/mp4') {
  return stub<File>({ name, type })
}

async function uploadVideo(name: string, duration = 12.5) {
  vp.processVideoFile(file(name))
  const el = created.at(-1)!
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
    createObjectURL: (f: File) => {
      L('URL.create', f.name)
      return `blob:${++urlSeq}`
    },
    revokeObjectURL: (u: string) => L('URL.revoke', u),
  })
  const origCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(
    stub((tag: string) => {
      if (tag !== 'video') return origCreate(tag)
      const el = fakeVideo()
      created.push(el)
      L('createVideo', el)
      return el
    }),
  )
  unregisterEngine = registerAudioEngine(
    stub({
      connectVideoToRecording: (el: unknown, vol: unknown) => L('rec.connect', el, vol),
      disconnectVideoFromRecording: (el: unknown) => L('rec.disconnect', el),
      setVideoVolume: (el: unknown, vol: unknown) => L('rec.setVolume', el, vol),
    }),
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  unregisterEngine()
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
    created.at(-1)!.onerror()
    expect(log).toMatchSnapshot()
  })

  it('Löschen vor der Auswahl verschiebt den Auswahl-Index', async () => {
    mountPanel()
    for (const n of ['a.mp4', 'b.mp4', 'c.mp4', 'd.mp4']) await uploadVideo(n)
    vp.selectVideo(3)
    vp.deleteVideo(0)
    expect(vp.selectedVideoIndex.value).toBe(2)
    expect(vp.videoGallery.value[2]!.name).toBe('d')
    vp.deleteVideo(2) // ausgewähltes Video → erstes wird ausgewählt
    expect(vp.selectedVideoIndex.value).toBe(0)
    vp.deleteVideo(1) // nach der Auswahl → unverändert
    expect(vp.selectedVideoIndex.value).toBe(0)
  })

  it('Eingabe, Drop, Datei-Dialog, Vorschaubild', async () => {
    mountPanel()
    const input = { click: () => L('input.click'), value: 'C:\\x.mp4' }
    vp.fileInputRef.value = stub(input)
    vp.triggerFileInput()
    vp.handleVideoUpload(stub({ target: { files: [file('a.mp4')] } }))
    expect(input.value).toBe('')
    vp.handleVideoUpload(stub({ target: { files: [] } }))
    vp.handleDrop(stub({ dataTransfer: { files: [file('b.mov', 'video/quicktime')] } }))
    vp.handleDrop(stub({ dataTransfer: { files: [] } }))
    const thumb = fakeVideo('thumb')
    vp.generateThumbnail(stub({ target: thumb }), 0)
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
    created.at(-1)!.onloadeddata()
    created.at(-1)!.onerror()

    vp.setVideoAsBackground()
    created.at(-1)!.onloadeddata()
    created.at(-1)!.onerror()

    vp.setVideoAsWorkspaceBackground() // ohne Workspace-Format → Warnung
    cm.workspacePreset = 'ig'
    vp.videoMuted.value = true
    await nextTick()
    vp.setVideoAsWorkspaceBackground()
    created.at(-1)!.onloadeddata()
    created.at(-1)!.onerror()
    expect(log).toMatchSnapshot()
  })

  it("Entfernen (src = '') meldet keinen Ladefehler, echter Fehler schon", async () => {
    const { cm } = mountPanel()
    await uploadVideo('a.mp4')
    cm.workspacePreset = { width: 1080, height: 1920 }
    for (const [place, key, remove] of [
      ['setVideoAsBackground', 'videoBackground', 'removeVideoBackground'],
      ['setVideoAsWorkspaceBackground', 'workspaceVideoBackground', 'removeWsVideoBackground'],
    ] as const) {
      vp[place]()
      const el = created.at(-1)
      el!.onloadeddata()
      cm[key] = { videoElement: el } // Fake-cm.set…Background protokolliert nur
      vi.mocked(console.error).mockClear()
      vp[remove]()
      expect(el!.src).toBe('')
      el!.onerror()
      expect(console.error).not.toHaveBeenCalled()
    }
    vp.addVideoToCanvas()
    const canvasEl = created.at(-1)!
    canvasEl.src = ''
    canvasEl.onerror()
    expect(console.error).not.toHaveBeenCalled()

    vp.setVideoAsBackground()
    created.at(-1)!.onerror() // src gesetzt → echter Ladefehler
    expect(console.error).toHaveBeenCalledWith('❌ Fehler beim Laden des Video-Hintergrunds')
  })

  it('placeVideoOnCanvas: Galerie-Video mit Platzierungs-Einstellungen, ohne Auswahl (Beat-Marker)', async () => {
    const { vm } = mountPanel()
    await uploadVideo('clip.mp4')
    const placedObj = { id: 'cv' }
    vm!.addVideo = (el: unknown, opts: unknown) => {
      L('vm.addVideo', el, opts)
      return placedObj
    }
    vp.videoLoop.value = false
    await nextTick()
    log.length = 0
    const pending = vp.placeVideoOnCanvas(vp.videoGallery.value[0], { select: false })
    created.at(-1)!.onloadeddata()
    await expect(pending).resolves.toBe(placedObj)
    expect(log.find((l) => l.startsWith('vm.addVideo'))).toContain('"loop":false')
    expect(log.find((l) => l.startsWith('vm.addVideo'))).toContain('"name":"clip","select":false')

    // Ladefehler bzw. fehlendes Video → null
    const failing = vp.placeVideoOnCanvas(vp.videoGallery.value[0])
    created.at(-1)!.onerror()
    await expect(failing).resolves.toBeNull()
    await expect(vp.placeVideoOnCanvas(null)).resolves.toBeNull()
  })

  it('ohne Video-Manager', async () => {
    mountPanel({ noVm: true })
    await uploadVideo('a.mp4')
    log.length = 0
    vp.addVideoDirectly()
    expect(created.at(-1)!.__label).toBe('v1')
    expect(console.error).toHaveBeenCalledWith('VideoManager nicht verfügbar')
  })
})

describe('useVideoPanel – Canvas-Videos', () => {
  it('Auswahl, Zeit/Lautstärke, Steuerung, Entfernen', async () => {
    const { cm, vm } = mountPanel()
    const el1 = fakeVideo('cv1', { currentTime: 5, duration: 20, volume: 0.4 })
    const el2 = fakeVideo('cv2', { muted: true })
    const v1 = stub<VideoObject>({
      __label: 'video1',
      id: 1,
      type: 'video',
      videoElement: el1,
      isPlaying: false,
    })
    const v2 = stub<VideoObject>({
      __label: 'video2',
      id: 2,
      type: 'video',
      videoElement: el2,
      isPlaying: true,
    })
    vm!.videos.push(v1, v2)

    expect(vp.canvasVideos.value).toHaveLength(2)
    expect(vp.selectedCanvasVideo.value).toBeNull()
    expect(vp.selectedVideoCurrentTime.value).toBe(0)
    expect(vp.selectedVideoVolume.value).toBe(1)

    vp.selectCanvasVideo(v1)
    await nextTick()
    expect(vp.selectedCanvasVideo.value!.id).toBe(1)
    expect(vp.isVideoActive(v1)).toBe(true)
    expect(vp.isVideoActive(v2)).toBe(false)
    expect(vp.selectedVideoCurrentTime.value).toBe(5)
    expect(vp.selectedVideoDuration.value).toBe(20)
    expect(vp.selectedVideoVolume.value).toBe(0.4)

    cmRef.value!.activeObject = { type: 'text' }
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
    vp.connectVideoAudioForRecording(stub({}))
    vp.removeCanvasVideo(v1)
    expect(cm.activeObject).toBeNull()
    vp.updateVideoVolume('0.3') // ohne Auswahl → nichts
    expect(log).toMatchSnapshot()
  })
})

describe('useVideoPanel – Position & Größe', () => {
  it('videoBoundsApi: Canvas des VideoManagers, Workspace als Füll-Fläche', () => {
    const { cm, vm } = mountPanel()
    expect(vp.videoBoundsApi.getCanvas!()).toBe(vm!.canvas ?? null)
    const ws = { x: 10, y: 20, width: 300, height: 400 }
    cm.getWorkspaceBounds = () => ws
    expect(vp.videoBoundsApi.getFitArea!()).toBe(ws)
    const before = vp.videoTimeUpdateKey.value
    vp.videoBoundsApi.redraw!()
    expect(vp.videoTimeUpdateKey.value).toBe(before + 1)
  })
})

describe('useVideoPanel – hinter dem Visualizer', () => {
  it('Platzierung übergibt die Voreinstellung an addVideo', async () => {
    const { vm } = mountPanel()
    await uploadVideo('clip.mp4')
    const opts: unknown[] = []
    vm!.addVideo = (_el: unknown, o: unknown) => {
      opts.push(o)
      return { id: 'cv' }
    }
    vp.videoBehindVisualizer.value = true
    const pending = vp.placeVideoOnCanvas(vp.videoGallery.value[0])
    created.at(-1)!.onloadeddata()
    await pending
    expect(opts.at(-1)).toMatchObject({ renderBehindVisualizer: true })
  })

  it('ausgewähltes Canvas-Video umschalten', async () => {
    const { vm } = mountPanel()
    const v1 = stub<VideoObject>({
      id: 1,
      type: 'video',
      videoElement: fakeVideo('cv1'),
      isPlaying: false,
      fotoSettings: { renderBehindVisualizer: false },
    })
    vm!.videos.push(v1)
    expect(vp.selectedVideoBehindVisualizer.value).toBe(false)
    vp.setVideoBehindVisualizer(true) // ohne Auswahl → nichts
    expect(v1.fotoSettings!.renderBehindVisualizer).toBe(false)

    vp.selectCanvasVideo(v1)
    await nextTick()
    vp.setVideoBehindVisualizer(true)
    expect(v1.fotoSettings!.renderBehindVisualizer).toBe(true)
    expect(vp.selectedVideoBehindVisualizer.value).toBe(true)
    vp.setVideoBehindVisualizer(false)
    expect(vp.selectedVideoBehindVisualizer.value).toBe(false)
  })

  /** Canvas-Video mit Ebene (wie vom VideoManager angelegt) */
  const canvasVideo = (id: number, behind = false) =>
    stub<VideoObject>({
      id,
      type: 'video',
      videoElement: fakeVideo(`cv${id}`),
      isPlaying: true,
      fotoSettings: { renderBehindVisualizer: behind },
    })
  const layers = (vm: FakeVm) =>
    (vm.videos as unknown as VideoObject[]).map((v) => v.fotoSettings!.renderBehindVisualizer)

  it('gemeinsamer Schalter gilt sofort für alle Canvas-Videos – bei jedem Umschalten', () => {
    const { vm } = mountPanel()
    // direkt platziert, von einem Beat-Marker angelegt (nicht ausgewählt) und gemischt
    vm!.videos.push(canvasVideo(1), canvasVideo(2, true), canvasVideo(3))
    for (const value of [true, false, true, true, false, false, true]) {
      vp.videoBehindVisualizer.value = value
      expect(layers(vm!)).toEqual([value, value, value])
    }
  })

  it('wirkt auch ohne Auswahl und legt fehlende Foto-Einstellungen an', () => {
    const { vm } = mountPanel()
    const bare = stub<VideoObject>({ id: 9, type: 'video', videoElement: fakeVideo('cv9') })
    vm!.videos.push(bare)
    vm!.initializeVideoSettings = (v: VideoObject) => {
      v.fotoSettings = stub({ renderBehindVisualizer: false })
    }
    expect(cmRef.value!.activeObject).toBeNull()
    vp.videoBehindVisualizer.value = true
    expect(bare.fotoSettings!.renderBehindVisualizer).toBe(true)
  })

  it('ein einzelnes Video umschalten; sind dann alle gleich, folgt der gemeinsame Schalter', async () => {
    const { vm } = mountPanel()
    const v1 = canvasVideo(1)
    const v2 = canvasVideo(2)
    vm!.videos.push(v1, v2)

    vp.selectCanvasVideo(v1)
    await nextTick()
    vp.setVideoBehindVisualizer(true) // nur v1, Ebenen gemischt
    expect(layers(vm!)).toEqual([true, false])
    expect(vp.videoBehindVisualizer.value).toBe(false)

    vp.selectCanvasVideo(v2)
    await nextTick()
    vp.setVideoBehindVisualizer(true) // jetzt alle hinten
    expect(layers(vm!)).toEqual([true, true])
    expect(vp.videoBehindVisualizer.value).toBe(true)

    // Gemeinsamer Schalter aus → alle wieder davor
    vp.videoBehindVisualizer.value = false
    expect(layers(vm!)).toEqual([false, false])
  })

  it('neu platzierte Videos (auch vom Beat-Marker) übernehmen den aktuellen Schalter', async () => {
    const { vm } = mountPanel()
    await uploadVideo('clip.mp4')
    const opts: unknown[] = []
    vm!.addVideo = (_el: unknown, o: unknown) => {
      opts.push(o)
      return { id: 'cv' }
    }
    for (const value of [true, false]) {
      vp.videoBehindVisualizer.value = value
      // Beat-Marker platzieren ohne Auswahl
      const pending = vp.placeVideoOnCanvas(vp.videoGallery.value[0], { select: false })
      created.at(-1)!.onloadeddata()
      await pending
      expect(opts.at(-1)).toMatchObject({ renderBehindVisualizer: value, select: false })
    }
  })

  it('ohne VideoManager wirft der Schalter nicht', () => {
    mountPanel({ noVm: true })
    expect(() => {
      vp.videoBehindVisualizer.value = true
    }).not.toThrow()
  })
})

/** Lose Sicht auf die API für Zugriffe über Namen aus der Tabelle */
type LooseApi = Record<string, ((...args: unknown[]) => unknown) & { value: unknown }>

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
  ] as const) {
    it(`${key}: Zustand und Steuerung`, async () => {
      vi.useFakeTimers()
      mountPanel()
      const api = vp as unknown as LooseApi
      // Ohne Hintergrund: Standardwerte, Aktionen ohne Wirkung
      expect(vp.hasVideoBackground.value).toBeFalsy()
      expect(api[fns.playing]!.value).toBe(false)
      expect(api[fns.time]!.value).toBe(0)
      expect(api[fns.duration]!.value).toBe(0)
      expect(api[fns.volume]!.value).toBe(1)
      for (const f of ['toggle', 'seek', 'back', 'fwd', 'setVolume', 'remove'] as const)
        api[fns[f]]!(1)
      expect(log).toEqual([])

      const el = fakeVideo(prefix, { currentTime: 4, duration: 10, volume: 0.6 })
      cmRef.value![key] = { videoElement: el }
      await nextTick()
      expect(vp.hasVideoBackground.value).toBeTruthy()
      expect(api[fns.time]!.value).toBe(4)
      expect(api[fns.duration]!.value).toBe(10)
      expect(api[fns.volume]!.value).toBe(0.6)

      api[fns.toggle]!()
      await nextTick()
      vi.advanceTimersByTime(250) // Zeit-Tick → Computeds neu lesen
      await nextTick()
      expect(api[fns.playing]!.value).toBe(true)
      api[fns.toggle]!()
      api[fns.seek]!('2.5')
      api[fns.back]!(5)
      api[fns.fwd]!(20)
      api[fns.setVolume]!('0.8')
      api[fns.setVolume]!('0')
      await nextTick()
      expect(api[fns.volume]!.value).toBe(0)
      api[fns.remove]!()
      expect(cmRef.value![key]).toBeNull()
      expect(log).toMatchSnapshot()
    })
  }
})

describe('useVideoPanel – Stumm/Wiederholen für alle Videos', () => {
  it('überträgt Einstellungen auf Canvas- und Hintergrund-Videos', async () => {
    const { vm } = mountPanel()
    const cv = fakeVideo('cv', { volume: 0 })
    vm!.videos.push({ __label: 'video1', id: 1, videoElement: cv }, { id: 2 })
    cmRef.value!.videoBackground = { videoElement: fakeVideo('bg', { volume: 0 }) }
    cmRef.value!.workspaceVideoBackground = { videoElement: fakeVideo('ws', { volume: 0.3 }) }
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
    expect(vm!.videos[0]!.muted).toBe(false)
    expect(vm!.videos[0]!.loop).toBe(true)
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
    wrapper!.unmount()
    wrapper = null
    vi.advanceTimersByTime(1000)
    expect(vp.videoTimeUpdateKey.value).toBe(start + 4)
  })
})

describe('useVideoPanel – Galerie-Video löschen nimmt es vom Canvas', () => {
  /** VideoManager-Attrappe, die removeVideo wirklich ausführt */
  function realRemove(vm: FakeVm) {
    vm.removeVideo = (id: unknown) => {
      L('vm.removeVideo', id)
      vm.videos = vm.videos.filter((v) => v.id !== id)
    }
  }

  it('deleteVideo entfernt Canvas-Videos und Hintergründe dieser Quelle, andere bleiben', async () => {
    const { cm, vm } = mountPanel()
    realRemove(vm!)
    await uploadVideo('a.mp4') // blob:1
    await uploadVideo('b.mp4') // blob:2
    const fromA = { id: 'ca', videoElement: fakeVideo('ca', { src: 'blob:1' }) }
    const fromB = { id: 'cb', videoElement: fakeVideo('cb', { src: 'blob:2' }) }
    const fromA2 = { id: 'ca2', videoElement: fakeVideo('ca2', { src: 'blob:1' }) }
    vm!.videos = [fromA, fromB, fromA2]
    cm.activeObject = fromB // Auswahl eines anderen Videos bleibt erhalten
    const bgEl = fakeVideo('bg', { src: 'blob:1' })
    const wsEl = fakeVideo('ws', { src: 'blob:2' })
    cm.videoBackground = { videoElement: bgEl }
    cm.workspaceVideoBackground = { videoElement: wsEl }
    log.length = 0

    vp.deleteVideo(0)

    expect(vm!.videos.map((v) => v.id)).toEqual(['cb'])
    expect((cm.activeObject as { id: string }).id).toBe('cb')
    expect(cm.videoBackground).toBeNull()
    expect(bgEl.src).toBe('')
    expect(cm.workspaceVideoBackground).toEqual({ videoElement: wsEl })
    expect(vp.videoGallery.value.map((v) => v.name)).toEqual(['b'])
    expect(log).toEqual([
      'rec.disconnect <ca>',
      'vm.removeVideo ca',
      'rec.disconnect <ca2>',
      'vm.removeVideo ca2',
      'bg.pause',
      'bg.src= ',
      'cm.redraw',
      'URL.revoke blob:1',
    ])
  })

  it('hebt die Auswahl auf, wenn das ausgewählte Video entfernt wird', async () => {
    const { cm, vm } = mountPanel()
    realRemove(vm!)
    await uploadVideo('a.mp4')
    const fromA = { id: 'ca', videoElement: fakeVideo('ca', { src: 'blob:1' }) }
    vm!.videos = [fromA]
    cm.activeObject = fromA

    vp.deleteVideo(0)

    expect(vm!.videos).toEqual([])
    expect(cm.activeObject).toBeNull()
  })

  it('clearAllVideos entfernt alle Videos aus der Galerie vom Canvas', async () => {
    const { cm, vm } = mountPanel()
    realRemove(vm!)
    await uploadVideo('a.mp4')
    await uploadVideo('b.mp4')
    vm!.videos = [
      { id: 'ca', videoElement: fakeVideo('ca', { src: 'blob:1' }) },
      { id: 'cb', videoElement: fakeVideo('cb', { src: 'blob:2' }) },
      { id: 'fremd', videoElement: fakeVideo('fremd', { src: 'blob:99' }) },
    ]
    cm.workspaceVideoBackground = { videoElement: fakeVideo('ws', { src: 'blob:2' }) }

    vp.clearAllVideos()

    expect(vm!.videos.map((v) => v.id)).toEqual(['fremd'])
    expect(cm.workspaceVideoBackground).toBeNull()
    expect(vp.videoGallery.value).toEqual([])
  })

  it('ohne Video-Manager löscht nur die Galerie', async () => {
    mountPanel({ noVm: true })
    await uploadVideo('a.mp4')
    vp.deleteVideo(0)
    expect(vp.videoGallery.value).toEqual([])
  })
})

describe('useVideoPanel – Stumm aus nach stummem Start', () => {
  it('hebt die Aufnahme-Lautstärke wieder an (sonst bleibt das Video stumm)', async () => {
    const { vm } = mountPanel()
    const cv = fakeVideo('cv', { volume: 1 })
    const video = { id: 1, videoElement: cv, isPlaying: false }
    vm!.videos.push(video)

    vp.videoMuted.value = true
    await nextTick()
    // Abspielen im stummen Zustand verbindet das Video mit Lautstärke 0
    vp.togglePlayVideo(stub<VideoObject>(video))
    log.length = 0

    vp.videoMuted.value = false
    await nextTick()

    expect(cv.muted).toBe(false)
    expect(log).toContain('rec.setVolume <cv> 1')
  })
})
