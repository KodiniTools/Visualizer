import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stub } from '../helpers/canvasStubs'
import { useBeatMarkers } from '../../composables/useBeatMarkers'
import type { CanvasVideoPlacement } from '../../composables/beatMarkers/useMarkerCanvasVideos'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore'
import { VideoManager, type VideoObject } from '../../lib/videoManager'
import type { GalleryVideoEntry } from '../../lib/background/markerBackgroundVideo'
import { registerAudioEngine } from '../../lib/audioEngineBridge'
import { createPlayerDuck } from '../../composables/beatMarkers/playerDuck'

/** Video-Element-Attrappe: Wiedergabe-Zustand und `ended`-Ereignis */
class FakeVideo extends EventTarget {
  readyState = 4
  videoWidth = 640
  videoHeight = 360
  duration = 6
  currentTime = 0
  paused = true
  loop = true
  muted = true
  volume = 1
  ended = false
  playbackRate = 1
  crossOrigin = ''
  src = 'blob:video'
  load() {}
  play() {
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
}

const CANVAS = stub<HTMLCanvasElement>({ width: 1000, height: 500 })

const gallery = ref<GalleryVideoEntry[]>([])
let placed: VideoObject | null = null
const place = vi.fn<CanvasVideoPlacement['place']>()
const connectAudio = vi.fn()
const placementLoop = ref(true)

const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {}, {
      videoGallery: gallery,
      canvasVideoPlacement: { place, loop: placementLoop, connectAudio },
    })
  },
  template: '<div />',
})

type HostVm = InstanceType<typeof Host>

let wrapper: VueWrapper<HostVm> | null
let vm: HostVm
let playerStore: ReturnType<typeof usePlayerStore>
let markerStore: ReturnType<typeof useBeatMarkerStore>
let mgr: VideoManager
let looped: VideoObject
let once: VideoObject

const el = (video: VideoObject) => video.videoElement as unknown as FakeVideo

function addVideo(name: string, options: { loop?: boolean; animation?: string } = {}) {
  return mgr.addVideo(new FakeVideo() as unknown as HTMLVideoElement, {
    name,
    loop: options.loop ?? true,
    animation: options.animation,
    animationDuration: 500,
  }) as VideoObject
}

function frame(time: number) {
  playerStore.audioRef!.currentTime = time
  playerStore.notifyFrame()
}

async function startPlaybackAtZero() {
  playerStore.audioRef!.currentTime = 0
  playerStore.currentTime = 0
  playerStore.isPlaying = true
  await nextTick()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = stub({ currentTime: 0 })

  const managerRef = ref(new VideoManager(CANVAS, { redrawCallback: () => {} }))
  mgr = managerRef.value
  looped = addVideo('intro', { animation: 'fade' })
  once = addVideo('drop', { loop: false })
  mgr.setSelectedVideo(null)

  gallery.value = [{ id: 42, name: 'clip', src: 'blob:clip', duration: 6 }]
  placed = null
  place.mockReset()
  place.mockImplementation(async (entry, { select }) => {
    placed = mgr.addVideo(new FakeVideo() as unknown as HTMLVideoElement, {
      name: entry.name,
      loop: placementLoop.value,
      select,
    }) as VideoObject
    return placed
  })
  connectAudio.mockReset()
  placementLoop.value = true

  wrapper = mount(Host, {
    global: { provide: { canvasManager: ref(null), videoManager: managerRef } },
  })
  vm = wrapper.vm
  await nextTick()
})

afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('Beat-Marker „Video auf Canvas“: Auswahl und Speichern', () => {
  it('bietet Canvas-Videos (Ebene, Name) und hochgeladene Videos an', () => {
    expect(vm.getMarkerCanvasVideos()).toEqual([
      { id: looped.id, layer: 1, name: 'intro', loop: true },
      { id: once.id, layer: 2, name: 'drop', loop: false },
    ])
    expect(vm.getMarkerVideoGallery()).toEqual([{ value: 'gallery:42', number: 1, name: 'clip' }])
  })

  it('speichert ein Canvas-Video samt Bezeichnung und lädt es beim Bearbeiten', () => {
    vm.addMarkerAtCurrentTime()
    expect(vm.newMarkerCanvasVideoId).toBe('')
    vm.newMarkerCanvasVideoId = once.id
    vm.confirmAddMarker()
    const marker = markerStore.markers.at(-1)!
    expect(marker.action.canvasVideoId).toBe(once.id)
    expect(marker.action.canvasVideoLabel).toBe('Video 2 — drop')
    expect(vm.newMarkerCanvasVideoId).toBe('')

    vm.startEditMarker(marker)
    expect(vm.newMarkerCanvasVideoId).toBe(once.id)
  })

  it('beim Bearbeiten eines Markers mit gelöschtem Video bleibt die Auswahl leer', () => {
    const marker = markerStore.addMarker(4, { canvasVideoId: 12345 })
    vm.startEditMarker(marker)
    expect(vm.newMarkerCanvasVideoId).toBe('')
  })

  it('ein hochgeladenes Video wird beim Speichern platziert (nicht ausgewählt) und eingetragen', async () => {
    vm.addMarkerAtCurrentTime()
    vm.newMarkerCanvasVideoId = 'gallery:42'
    vm.confirmAddMarker()
    expect(place).toHaveBeenCalledWith(gallery.value[0], { select: false })
    const marker = markerStore.markers.at(-1)!
    expect(marker.action.canvasVideoId).toBeNull()

    await vi.waitFor(() => expect(marker.action.canvasVideoId).toBe(placed!.id))
    expect(marker.action.canvasVideoLabel).toBe('Video 3 — clip')
    expect(mgr.getSelectedVideo()).toBeNull()
  })

  it('läuft die Wiedergabe, erscheint das neu platzierte Video erst am Marker', async () => {
    playerStore.currentTime = 2
    playerStore.isPlaying = true
    await nextTick()
    vm.addMarkerAtCurrentTime()
    vm.pendingMarkerTimeInput = '0:10.00'
    vm.updateMarkerTimeFromInput()
    vm.newMarkerCanvasVideoId = 'gallery:42'
    vm.confirmAddMarker()
    await vi.waitFor(() => expect(placed).not.toBeNull())
    await vi.waitFor(() => expect(mgr.isMarkerHidden(placed!.id)).toBe(true))
  })

  it('Gesamtdauer: einmal laufendes Video zählt mit seiner Länge, Schleife bleibt dauerhaft', () => {
    expect(vm.getMarkerDuration({ action: stub({ canvasVideoId: once.id }) })).toEqual({
      seconds: 6,
      hasPermanent: false,
      count: 1,
    })
    expect(vm.getMarkerDuration({ action: stub({ canvasVideoId: looped.id }) })).toEqual({
      seconds: null,
      hasPermanent: true,
      count: 1,
    })

    vm.addMarkerAtCurrentTime()
    placementLoop.value = false
    vm.newMarkerCanvasVideoId = 'gallery:42'
    expect(vm.getPendingMarkerDuration()).toEqual({ seconds: 6, hasPermanent: false, count: 1 })
  })
})

describe('Beat-Marker „Video auf Canvas“: Wiedergabe', () => {
  it('blendet zugewiesene Videos beim Start aus und startet sie am Marker von vorn', async () => {
    markerStore.addMarker(5, { canvasVideoId: looped.id })
    el(looped).currentTime = 3
    looped.animation.active = false
    looped.animation.progress = 1

    await startPlaybackAtZero()
    expect(mgr.isMarkerHidden(looped.id)).toBe(true)
    expect(mgr.isMarkerHidden(once.id)).toBe(false) // ohne Marker unberührt

    frame(4.99)
    frame(5.01)
    expect(mgr.isMarkerHidden(looped.id)).toBe(false)
    expect(el(looped).currentTime).toBe(0)
    expect(el(looped).paused).toBe(false)
    // Einblend-Effekt der Platzierung startet neu
    expect(looped.animation).toMatchObject({ active: true, progress: 0 })
  })

  it('Video mit Ton wird für die Aufnahme verbunden, stummes nicht', async () => {
    looped.muted = false
    markerStore.addMarker(5, { canvasVideoId: looped.id })
    markerStore.addMarker(6, { canvasVideoId: once.id })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    frame(6.01)
    expect(connectAudio).toHaveBeenCalledTimes(1)
    expect(connectAudio).toHaveBeenCalledWith(looped)
  })

  it('ein späterer Marker löst ein Video in Schleife ab', async () => {
    markerStore.addMarker(5, { canvasVideoId: looped.id })
    markerStore.addMarker(8, { visualizer: null })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    frame(7.99)
    frame(8.01)
    expect(mgr.isMarkerHidden(looped.id)).toBe(true)
    expect(el(looped).paused).toBe(true)
  })

  it('ein einmal laufendes Video läuft weiter und verschwindet nach seinem Ende', async () => {
    markerStore.addMarker(5, { canvasVideoId: once.id })
    markerStore.addMarker(8, { canvasVideoId: looped.id })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    frame(7.99)
    frame(8.01)
    expect(mgr.isMarkerHidden(once.id)).toBe(false)
    expect(mgr.isMarkerHidden(looped.id)).toBe(false)

    el(once).dispatchEvent(new Event('ended'))
    expect(mgr.isMarkerHidden(once.id)).toBe(true)
  })

  it('Pause: alle Marker-Videos sichtbar und angehalten', async () => {
    markerStore.addMarker(5, { canvasVideoId: looped.id })
    markerStore.addMarker(20, { canvasVideoId: once.id })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    playerStore.isPlaying = false
    await nextTick()
    expect(mgr.markerHiddenIds.size).toBe(0)
    expect(el(looped).paused).toBe(true)

    // Ende eines Videos bei Pause blendet nichts aus
    el(once).dispatchEvent(new Event('ended'))
    expect(mgr.isMarkerHidden(once.id)).toBe(false)
  })

  it('Fortsetzen nach Sprung: Video an der passenden Stelle, abgelaufenes einmaliges bleibt weg', async () => {
    markerStore.addMarker(5, { canvasVideoId: looped.id })
    markerStore.addMarker(8, { canvasVideoId: once.id })
    markerStore.addMarker(30, { canvasVideoId: once.id })
    playerStore.currentTime = 10
    playerStore.audioRef!.currentTime = 10
    playerStore.isPlaying = true
    await nextTick()
    // 10 s: looped (Schleife) wurde von once abgelöst, once läuft seit 2 s
    expect(mgr.isMarkerHidden(looped.id)).toBe(true)
    expect(mgr.isMarkerHidden(once.id)).toBe(false)
    expect(el(once).currentTime).toBe(2)
    expect(el(once).paused).toBe(false)

    playerStore.isPlaying = false
    await nextTick()
    playerStore.currentTime = 15
    playerStore.isPlaying = true
    await nextTick()
    // once ist seit 7 s > 6 s Länge fertig
    expect(mgr.isMarkerHidden(once.id)).toBe(true)
  })

  it('Video in Schleife: Position modulo Länge', async () => {
    markerStore.addMarker(5, { canvasVideoId: looped.id })
    playerStore.currentTime = 19
    playerStore.audioRef!.currentTime = 19
    playerStore.isPlaying = true
    await nextTick()
    expect(el(looped).currentTime).toBe(2) // (19 − 5) % 6
    expect(looped.animation.active).toBe(false) // Einblenden längst vorbei
  })

  it('Marker löschen oder deaktivieren blendet das Video wieder ein', async () => {
    const marker = markerStore.addMarker(5, { canvasVideoId: looped.id })
    markerStore.addMarker(9, { canvasVideoId: once.id })
    await startPlaybackAtZero()
    vm.removeMarker(marker.id)
    expect(mgr.isMarkerHidden(looped.id)).toBe(false)
    expect(mgr.isMarkerHidden(once.id)).toBe(true)

    markerStore.toggleEnabled()
    await nextTick()
    expect(mgr.isMarkerHidden(once.id)).toBe(false)
  })

  it('beim Verlassen werden alle Videos wieder eingeblendet', async () => {
    markerStore.addMarker(5, { canvasVideoId: looped.id })
    await startPlaybackAtZero()
    wrapper!.unmount()
    wrapper = null
    expect(mgr.isMarkerHidden(looped.id)).toBe(false)
  })
})

describe('Beat-Marker „Video auf Canvas“: Ducking', () => {
  const setPlayerDuck = vi.fn()
  let unregister = () => {}

  /** Video mit Ton (Element und Objekt), wie nach „Stumm“ aus */
  const unmute = (video: VideoObject) => {
    video.muted = false
    el(video).muted = false
  }
  const fire = (video: VideoObject, type: string) => el(video).dispatchEvent(new Event(type))

  beforeEach(() => {
    setPlayerDuck.mockReset()
    unregister = registerAudioEngine(stub({ setPlayerDuck }))
  })
  afterEach(() => unregister())

  it('neuer Marker: Ducking ist vorgeschlagen (30 %) und wird mit dem Video gespeichert', () => {
    vm.addMarkerAtCurrentTime()
    expect(vm.newMarkerCanvasVideoDuck).toBe(true)
    expect(vm.newMarkerCanvasVideoDuckLevel).toBe(30)
    vm.newMarkerCanvasVideoId = once.id
    vm.newMarkerCanvasVideoDuckLevel = 20
    vm.confirmAddMarker()
    const marker = markerStore.markers.at(-1)!
    expect(marker.action.canvasVideoDuck).toBe(0.2)

    vm.startEditMarker(marker)
    expect(vm.newMarkerCanvasVideoDuck).toBe(true)
    expect(vm.newMarkerCanvasVideoDuckLevel).toBe(20)
  })

  it('ohne Video oder mit ausgeschaltetem Ducking wird nichts gespeichert', () => {
    vm.addMarkerAtCurrentTime()
    vm.confirmAddMarker()
    expect(markerStore.markers.at(-1)!.action.canvasVideoDuck).toBeNull()

    vm.addMarkerAtCurrentTime()
    vm.newMarkerCanvasVideoId = once.id
    vm.newMarkerCanvasVideoDuck = false
    vm.confirmAddMarker()
    const marker = markerStore.markers.at(-1)!
    expect(marker.action.canvasVideoDuck).toBeNull()
    // Bestehender Marker mit Video, aber ohne Ducking: Schalter bleibt aus
    vm.startEditMarker(marker)
    expect(vm.newMarkerCanvasVideoDuck).toBe(false)
  })

  it('Video mit Ton senkt den Song ab, solange es läuft; nach dem Ende wieder 100 %', async () => {
    unmute(once)
    markerStore.addMarker(5, { canvasVideoId: once.id, canvasVideoDuck: 0.3 })
    await startPlaybackAtZero()
    frame(4.99)
    expect(setPlayerDuck).not.toHaveBeenCalled()
    frame(5.01)
    expect(setPlayerDuck).toHaveBeenLastCalledWith(0.3)

    el(once).paused = true
    el(once).ended = true
    fire(once, 'ended')
    expect(setPlayerDuck).toHaveBeenLastCalledWith(1)
    expect(setPlayerDuck).toHaveBeenCalledTimes(2)
  })

  it('stummes Video senkt nicht ab; „Stumm“ aus/an während der Wiedergabe wirkt sofort', async () => {
    markerStore.addMarker(5, { canvasVideoId: looped.id, canvasVideoDuck: 0.3 })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    expect(setPlayerDuck).not.toHaveBeenCalled()

    unmute(looped)
    fire(looped, 'volumechange')
    expect(setPlayerDuck).toHaveBeenLastCalledWith(0.3)

    el(looped).volume = 0
    fire(looped, 'volumechange')
    expect(setPlayerDuck).toHaveBeenLastCalledWith(1)
  })

  it('Marker ohne Ducking lässt den Song unverändert', async () => {
    unmute(once)
    markerStore.addMarker(5, { canvasVideoId: once.id })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    expect(setPlayerDuck).not.toHaveBeenCalled()
  })

  it('Pause hebt den Song wieder an; ein späterer Marker, der das Video ablöst, ebenfalls', async () => {
    unmute(looped)
    markerStore.addMarker(5, { canvasVideoId: looped.id, canvasVideoDuck: 0.4 })
    markerStore.addMarker(8, { visualizer: null })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    expect(setPlayerDuck).toHaveBeenLastCalledWith(0.4)
    frame(7.99)
    frame(8.01)
    expect(setPlayerDuck).toHaveBeenLastCalledWith(1)

    setPlayerDuck.mockClear()
    playerStore.audioRef!.currentTime = 0
    playerStore.isPlaying = false
    await nextTick()
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    expect(setPlayerDuck).toHaveBeenLastCalledWith(0.4)
    playerStore.isPlaying = false
    await nextTick()
    expect(setPlayerDuck).toHaveBeenLastCalledWith(1)
  })
})

describe('createPlayerDuck', () => {
  it('der niedrigste Wert aller Quellen gilt; apply nur bei Änderung', () => {
    const apply = vi.fn()
    const duck = createPlayerDuck(apply)
    duck.set('tracks', 1)
    expect(apply).not.toHaveBeenCalled()
    duck.set('tracks', 0.5)
    duck.set('videos', 0.3)
    duck.set('tracks', 1)
    expect(apply.mock.calls).toEqual([[0.5], [0.3]])
    duck.set('videos', 1)
    expect(apply).toHaveBeenLastCalledWith(1)
  })
})

describe('VideoManager: Marker-Ausblendung', () => {
  it('ausgeblendete Videos werden nicht gezeichnet und sind nicht anklickbar', () => {
    const drawn: VideoObject['id'][] = []
    mgr._drawSingleVideo = (_ctx, video) => void drawn.push(video.id)
    mgr.setMarkerHidden(looped.id, true)
    mgr.drawVideos(stub({ canvas: CANVAS }))
    expect(drawn).toEqual([once.id])

    const b = mgr.getVideoBounds(looped)!
    expect(mgr.findVideoAt(b.x + 1, b.y + 1)?.id).not.toBe(looped.id)
  })

  it('Ausblenden pausiert, removeVideo und clear vergessen ausgeblendete Videos', () => {
    mgr.playVideo(looped.id)
    mgr.setMarkerHidden(looped.id, true)
    expect(el(looped).paused).toBe(true)
    expect(looped.isPlaying).toBe(false)

    mgr.removeVideo(looped.id)
    expect(mgr.isMarkerHidden(looped.id)).toBe(false)
    mgr.setMarkerHidden(once.id, true)
    mgr.clear()
    expect(mgr.markerHiddenIds.size).toBe(0)
  })

  it('playVideoFrom: einmal laufendes Video nach seinem Ende bleibt stehen', () => {
    expect(mgr.playVideoFrom(once.id, 9)).toBe(true)
    expect(el(once).currentTime).toBe(6)
    expect(el(once).paused).toBe(true)
    expect(mgr.playVideoFrom('fehlt', 0)).toBe(false)
  })

  it('addVideo mit select: false wählt das Video nicht aus, Name bleibt erhalten', () => {
    const v = mgr.addVideo(new FakeVideo() as unknown as HTMLVideoElement, {
      name: 'x',
      select: false,
    }) as VideoObject
    expect(mgr.getSelectedVideo()).toBeNull()
    expect(v.name).toBe('x')
  })
})
