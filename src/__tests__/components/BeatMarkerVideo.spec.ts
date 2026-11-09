// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, provide, ref, nextTick } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stub } from '../helpers/canvasStubs'
import { type FakeBg, type FakeBgEntry, type FakeVideoEl } from '../helpers/markerStubs'
import BeatMarkerPopover from '../../components/sticky-player-bar/BeatMarkerPopover.vue'
import { useBeatMarkers } from '../../composables/useBeatMarkers'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore'
import {
  useBackgroundBridgeStore,
  type BackgroundSnapshot,
} from '../../stores/backgroundBridgeStore'
import { useImageGallery } from '../../composables/useImageGallery'
import type { GalleryVideoEntry, MarkerVideoRef } from '../../lib/background/markerBackgroundVideo'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const AR = { enabled: true, source: 'mid', effects: { hue: { enabled: true, intensity: 70 } } }

function fakeVideoEl(): FakeVideoEl {
  return {
    src: '',
    paused: true,
    muted: false,
    loop: false,
    currentTime: 5,
    load: vi.fn(),
    play: vi.fn(function (this: FakeVideoEl) {
      this.paused = false
      return Promise.resolve()
    }),
    pause: vi.fn(function (this: FakeVideoEl) {
      this.paused = true
    }),
  }
}

function fakeCm() {
  const cm = {
    workspacePreset: null,
    background: null as FakeBg,
    workspaceBackground: null,
    videoBackground: null as FakeBgEntry | null,
    workspaceVideoBackground: null as FakeBgEntry | null,
    textManager: { textObjects: [] },
    redrawCallback: vi.fn(),
    updateUICallback: vi.fn(),
    setBackground: vi.fn((img: unknown) => {
      cm.background = { imageObject: img, fotoSettings: { audioReactive: null } }
    }),
    setWorkspaceBackground: vi.fn(() => false),
    setVideoBackground: vi.fn((v: unknown) => {
      cm.videoBackground = { videoElement: v, fotoSettings: { audioReactive: null } }
      if (cm.background && typeof cm.background === 'object') cm.background = '#ffffff'
    }),
    setWorkspaceVideoBackground: vi.fn((v: unknown) => {
      cm.workspaceVideoBackground = { videoElement: v, fotoSettings: {} }
    }),
  }
  return cm
}

let wrapper: VueWrapper | null
let api: ReturnType<typeof useBeatMarkers>
let playerStore: ReturnType<typeof usePlayerStore>
let markerStore: ReturnType<typeof useBeatMarkerStore>
let cm: ReturnType<typeof fakeCm>
let created: FakeVideoEl[]
const videoGallery = ref<GalleryVideoEntry[]>([])
const imageGallery = useImageGallery().imageGallery
const imgA = { src: 'data:image/png;base64,AAA' }

const Host = defineComponent({
  setup() {
    api = useBeatMarkers(() => {}, { videoGallery })
    provide('playerBar', {
      popover: { closePopover: vi.fn(), cascadeOffset: () => ({ x: 0, y: 0 }) },
      markers: api,
    })
    return () => h('div')
  },
})

const PopoverHost = defineComponent({
  setup() {
    api = useBeatMarkers(() => {}, { videoGallery })
    provide('playerBar', {
      popover: { closePopover: vi.fn(), cascadeOffset: () => ({ x: 0, y: 0 }) },
      markers: api,
    })
    return () => h(BeatMarkerPopover)
  },
})

function frame(time: number) {
  playerStore.audioRef!.currentTime = time
  playerStore.notifyFrame()
}

/** Marker bei `time` überschreiten und das Marker-Video fertig laden lassen. */
function crossAndLoad(time: number) {
  frame(time - 0.01)
  frame(time + 0.01)
  const el = created.at(-1)
  el?.onloadeddata?.()
  return el!
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  created = []
  const origCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag, opts) => {
    if (tag !== 'video') return origCreate(tag, opts)
    const el = fakeVideoEl()
    created.push(el)
    return stub<HTMLVideoElement>(el)
  })
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = stub({ currentTime: 0 })
  videoGallery.value = [
    { id: 101, name: 'intro', src: 'blob:intro' },
    { id: 202, name: 'drop', src: 'blob:drop' },
  ]
  imageGallery.value = [stub({ id: 11, name: 'wald.jpg', img: imgA })]
  cm = fakeCm()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  videoGallery.value = []
  imageGallery.value = []
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

async function mountHost() {
  wrapper = mount(Host, { global: { provide: { canvasManager: ref(cm) } } })
  playerStore.audioRef!.currentTime = 2
  playerStore.currentTime = 2
  playerStore.isPlaying = true
  await nextTick()
}

describe('Beat-Marker mit Video – Formular', () => {
  it('bietet die hochgeladenen Videos an', async () => {
    await mountHost()
    expect(api.getMarkerGalleryVideos()).toEqual([
      { id: 101, number: 1, name: 'intro' },
      { id: 202, number: 2, name: 'drop' },
    ])
  })

  it('speichert nur einen Verweis plus Vorgaben des aktuellen Hintergrunds', async () => {
    await mountHost()
    cm.background = { imageObject: { src: 'alt.png' }, fotoSettings: { audioReactive: AR } }
    api.addMarkerAtCurrentTime()
    api.newMarkerVideoId.value = 202
    api.confirmAddMarker()
    const action = markerStore.markers.at(-1)!.action
    expect(action.video).toEqual({
      galleryId: 202,
      name: 'drop',
      defaults: { target: 'background', audioReactive: AR },
      loop: true,
    })
    expect(JSON.stringify(action)).not.toContain('blob:')
    expect(api.newMarkerVideoId.value).toBe('')

    api.startEditMarker(markerStore.markers.at(-1)!)
    expect(api.newMarkerVideoId.value).toBe(202)
    api.addMarkerAtCurrentTime()
    expect(api.newMarkerVideoId.value).toBe('')
  })

  it('ohne Auswahl bleibt action.video null', async () => {
    await mountHost()
    api.addMarkerAtCurrentTime()
    api.confirmAddMarker()
    expect(markerStore.markers.at(-1)!.action.video).toBeNull()
  })
})

describe('Beat-Marker mit Video – Auslösen', () => {
  it('setzt das Video beim Drop als Hintergrund und startet es von vorne', async () => {
    await mountHost()
    cm.background = { imageObject: { src: 'vorher.png' }, fotoSettings: { audioReactive: AR } }
    markerStore.addMarker(5, { video: { galleryId: 202, name: 'drop', defaults: null } })
    const el = crossAndLoad(5)
    expect(el.src).toBe('blob:drop')
    expect(el.muted).toBe(true)
    expect(el.loop).toBe(true)
    expect(cm.videoBackground!.videoElement).toBe(el)
    expect(cm.videoBackground!.fotoSettings.audioReactive).toEqual(AR)
    expect(el.currentTime).toBe(0)
    await flushPromises()
    expect(el.play).toHaveBeenCalled()
  })

  it('findet das Video nach erneutem Hochladen über den Namen', async () => {
    await mountHost()
    markerStore.addMarker(5, { video: { galleryId: 999, name: 'intro' } })
    const el = crossAndLoad(5)
    expect(el.src).toBe('blob:intro')
    expect(cm.videoBackground!.videoElement).toBe(el)
  })

  it('überspringt Videos, die nicht mehr hochgeladen sind', async () => {
    await mountHost()
    const before = cm.background
    markerStore.addMarker(5, { video: { galleryId: 999, name: 'weg' } })
    crossAndLoad(5)
    expect(created).toHaveLength(0)
    expect(cm.setVideoBackground).not.toHaveBeenCalled()
    expect(cm.background).toBe(before)
  })

  it('Video gewinnt gegen ein Hintergrund-Bild im selben Marker', async () => {
    await mountHost()
    markerStore.addMarker(5, {
      backgroundImage: { galleryId: 11, name: 'wald.jpg' },
      video: { galleryId: 101, name: 'intro' },
    })
    const el = crossAndLoad(5)
    expect(cm.setBackground).not.toHaveBeenCalled()
    expect(cm.videoBackground!.videoElement).toBe(el)
  })

  it('mit Hintergrund-Preset im selben Marker liefert das Preset kein eigenes Video', async () => {
    await mountHost()
    const applied: BackgroundSnapshot[] = []
    useBackgroundBridgeStore().register(
      () => ({}),
      (snap) => applied.push(snap),
    )
    markerStore.addMarker(5, {
      background: { backgroundColor: '#000000', backgroundVideo: { src: 'blob:preset' } },
      video: { galleryId: 101, name: 'intro' },
    })
    crossAndLoad(5)
    expect(applied).toHaveLength(1)
    expect(applied[0]!.backgroundVideo).toBeNull()
    expect(applied[0]!.backgroundColor).toBe('#000000')
  })

  it('ein Marker ohne Bild/Video stellt den Hintergrund von vorher wieder her', async () => {
    await mountHost()
    const userVideo = fakeVideoEl()
    userVideo.src = 'blob:user'
    userVideo.paused = false
    const userEntry = { videoElement: userVideo, fotoSettings: {} }
    cm.background = '#123456'
    cm.videoBackground = userEntry
    markerStore.addMarker(5, { video: { galleryId: 101, name: 'intro' } })
    markerStore.addMarker(8, { video: { galleryId: 202, name: 'drop' } })
    markerStore.addMarker(12, { visualizer: null })

    const first = crossAndLoad(5)
    expect(cm.videoBackground.videoElement).toBe(first)
    expect(userVideo.pause).toHaveBeenCalled()
    expect(userVideo.src).toBe('blob:user')

    const second = crossAndLoad(8)
    expect(cm.videoBackground.videoElement).toBe(second)
    expect(first.src).toBe('')

    frame(11.99)
    frame(12.01)
    expect(cm.videoBackground).toBe(userEntry)
    expect(cm.background).toBe('#123456')
    expect(second.src).toBe('')
    await flushPromises()
    expect(userVideo.play).toHaveBeenCalled()
  })

  it('Bild-Marker nach Video-Marker gibt das Marker-Video frei', async () => {
    await mountHost()
    markerStore.addMarker(5, { video: { galleryId: 101, name: 'intro' } })
    markerStore.addMarker(8, { backgroundImage: { galleryId: 11, name: 'wald.jpg' } })
    const el = crossAndLoad(5)
    frame(7.99)
    frame(8.01)
    expect(cm.videoBackground).toBeNull()
    expect(el.src).toBe('')
    expect(cm.background!.imageObject).toBe(imgA)
  })

  it('verwirft ein Marker-Video, das erst nach dem nächsten Wechsel fertig lädt', async () => {
    await mountHost()
    cm.background = '#222222'
    markerStore.addMarker(5, { video: { galleryId: 101, name: 'intro' } })
    markerStore.addMarker(6, { visualizer: null })
    frame(4.99)
    frame(5.01)
    const late = created.at(-1)
    frame(5.99)
    frame(6.01)
    late!.onloadeddata!()
    expect(cm.setVideoBackground).not.toHaveBeenCalled()
    expect(late!.src).toBe('')
    expect(cm.background).toBe('#222222')
  })

  it('Zurückspulen an den Anfang entfernt das Marker-Video', async () => {
    await mountHost()
    markerStore.addMarker(5, { video: { galleryId: 101, name: 'intro' } })
    const el = crossAndLoad(5)
    playerStore.currentTime = 0
    await nextTick()
    expect(cm.videoBackground).toBeNull()
    expect(el.src).toBe('')
  })
})

describe('Beat-Marker-Popover – Video-Auswahl', () => {
  function mountPopover() {
    wrapper = mount(PopoverHost, {
      attachTo: document.body,
      global: { provide: { canvasManager: ref(cm) } },
    })
  }

  const selectWith = (text: string) =>
    [...document.body.querySelectorAll('select')].find((s) =>
      [...s.options].some((o) => o.textContent!.trim() === text),
    )

  it('zeigt „Kein Video“ und die hochgeladenen Videos; Auswahl zeigt den Hinweis', async () => {
    mountPopover()
    api.addMarkerAtCurrentTime()
    await flushPromises()
    const select = selectWith(de.player.noMarkerVideo)
    expect(select).toBeTruthy()
    expect([...select!.options].map((o) => o.textContent!.trim())).toEqual([
      de.player.noMarkerVideo,
      '1. intro',
      '2. drop',
    ])
    expect(document.body.textContent).not.toContain(de.player.markerVideoHint)
    select!.value = select!.options[2]!.value
    select!.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(document.body.textContent).toContain(de.player.markerVideoHint)
  })

  it('zeigt einen deaktivierten Hinweis ohne hochgeladene Videos', async () => {
    videoGallery.value = []
    mountPopover()
    api.addMarkerAtCurrentTime()
    await flushPromises()
    const select = selectWith(de.player.noMarkerVideo)
    const empty = [...select!.options].find(
      (o) => o.textContent!.trim() === de.player.emptyVideoGallery,
    )
    expect(empty?.disabled).toBe(true)
  })

  it('zeigt das Video in der Marker-Liste', async () => {
    markerStore.addMarker(5, { video: { galleryId: 202, name: 'drop' } })
    mountPopover()
    await flushPromises()
    expect(document.body.textContent).toContain('🎬 drop')
  })

  it('hat Texte in Deutsch und Englisch', () => {
    for (const key of [
      'markerVideo',
      'noMarkerVideo',
      'emptyVideoGallery',
      'markerVideoHint',
      'markerVideoLoop',
      'markerVideoOnce',
      'markerVideoLoopHint',
    ]) {
      expect(de.player[key as keyof typeof de.player]).toBeTruthy()
      expect(en.player[key as keyof typeof en.player]).toBeTruthy()
    }
  })
})

describe('Beat-Marker mit Video – einmal oder in Schleife', () => {
  it('speichert die Wahl und lädt sie beim Bearbeiten; neue Marker starten mit Schleife', async () => {
    await mountHost()
    api.addMarkerAtCurrentTime()
    expect(api.newMarkerVideoLoop.value).toBe(true)
    api.newMarkerVideoId.value = 101
    api.newMarkerVideoLoop.value = false
    api.confirmAddMarker()
    const marker = markerStore.markers.at(-1)
    expect((marker!.action.video as MarkerVideoRef).loop).toBe(false)
    expect(api.newMarkerVideoLoop.value).toBe(true)

    api.startEditMarker(marker!)
    expect(api.newMarkerVideoLoop.value).toBe(false)
    // Alte Marker ohne Feld laufen in Schleife
    api.startEditMarker(stub({ id: 99, time: 1, label: '', action: { video: { galleryId: 101 } } }))
    expect(api.newMarkerVideoLoop.value).toBe(true)
  })

  it('Schleife bleibt Standard für Marker ohne loop-Feld', async () => {
    await mountHost()
    markerStore.addMarker(5, { video: { galleryId: 101, name: 'intro' } })
    const el = crossAndLoad(5)
    expect(el.loop).toBe(true)
    expect(cm.videoBackground!.loop).toBe(true)
  })

  it('einmal: nach dem Video-Ende kommt der Hintergrund von vor dem Video zurück', async () => {
    await mountHost()
    const before = { imageObject: { src: 'vorher.png' }, fotoSettings: { audioReactive: AR } }
    cm.background = before
    markerStore.addMarker(5, { backgroundImage: { galleryId: 11, name: 'wald.jpg' } })
    markerStore.addMarker(8, { video: { galleryId: 101, name: 'intro', loop: false } })
    frame(4.99)
    frame(5.01)
    const markerImage = cm.background
    expect(markerImage!.imageObject).toBe(imgA)

    const el = crossAndLoad(8)
    expect(el.loop).toBe(false)
    expect(cm.videoBackground!.videoElement).toBe(el)
    expect(cm.background).toBe('#ffffff')

    el.onended!()
    // Zustand direkt vor dem Video (Bild des vorherigen Markers), nicht die Basis
    expect(cm.background).toBe(markerImage)
    expect(cm.videoBackground).toBeNull()
    expect(el.src).toBe('')
  })

  it('einmal nach einem Schleifen-Video: das vorherige Video läuft danach weiter', async () => {
    await mountHost()
    markerStore.addMarker(5, { video: { galleryId: 101, name: 'intro' } })
    markerStore.addMarker(8, { video: { galleryId: 202, name: 'drop', loop: false } })
    const loopVideo = crossAndLoad(5)
    const loopEntry = cm.videoBackground
    const once = crossAndLoad(8)
    expect(loopVideo.pause).toHaveBeenCalled()
    expect(loopVideo.src).toBe('blob:intro')
    expect(cm.videoBackground!.videoElement).toBe(once)

    loopVideo.play.mockClear()
    once.onended!()
    expect(cm.videoBackground).toBe(loopEntry)
    await flushPromises()
    expect(loopVideo.play).toHaveBeenCalled()
  })

  it('ein späterer Marker vor dem Video-Ende hat Vorrang; geparkte Marker-Videos werden freigegeben', async () => {
    await mountHost()
    cm.background = '#111111'
    markerStore.addMarker(5, { video: { galleryId: 101, name: 'intro' } })
    markerStore.addMarker(8, { video: { galleryId: 202, name: 'drop', loop: false } })
    markerStore.addMarker(10, { backgroundImage: { galleryId: 11, name: 'wald.jpg' } })
    const loopVideo = crossAndLoad(5)
    const once = crossAndLoad(8)
    frame(9.99)
    frame(10.01)
    expect(cm.background!.imageObject).toBe(imgA)
    expect(loopVideo.src).toBe('')
    expect(once.src).toBe('')

    once.onended!()
    expect(cm.background!.imageObject).toBe(imgA)
  })

  it('Basis-Video des Nutzers bleibt erhalten, wenn ein Marker das einmalige Video ablöst', async () => {
    await mountHost()
    const userVideo = fakeVideoEl()
    userVideo.src = 'blob:user'
    const userEntry = { videoElement: userVideo, fotoSettings: {} }
    cm.videoBackground = userEntry
    markerStore.addMarker(5, { video: { galleryId: 202, name: 'drop', loop: false } })
    markerStore.addMarker(7, { visualizer: null })
    crossAndLoad(5)
    frame(6.99)
    frame(7.01)
    expect(cm.videoBackground).toBe(userEntry)
    expect(userVideo.src).toBe('blob:user')
  })
})

describe('Beat-Marker-Popover – Schleife', () => {
  function mountPopover() {
    wrapper = mount(PopoverHost, {
      attachTo: document.body,
      global: { provide: { canvasManager: ref(cm) } },
    })
  }

  it('zeigt den Schalter nur mit gewähltem Video und den Hinweis bei einmaligem Abspielen', async () => {
    mountPopover()
    api.addMarkerAtCurrentTime()
    await flushPromises()
    const hasSwitch = () => document.body.textContent!.includes(de.player.markerVideoLoop)
    expect(hasSwitch()).toBe(false)
    api.newMarkerVideoId.value = 101
    await flushPromises()
    expect(hasSwitch()).toBe(true)
    expect(document.body.textContent).not.toContain(de.player.markerVideoLoopHint)
    api.newMarkerVideoLoop.value = false
    await flushPromises()
    expect(document.body.textContent).toContain(de.player.markerVideoLoopHint)
  })

  it('kennzeichnet einmalige Videos in der Marker-Liste', async () => {
    markerStore.addMarker(5, { video: { galleryId: 202, name: 'drop', loop: false } })
    markerStore.addMarker(9, { video: { galleryId: 101, name: 'intro' } })
    mountPopover()
    await flushPromises()
    expect(document.body.textContent).toContain('🎬 drop (1×)')
    expect(document.body.textContent).not.toContain('🎬 intro (1×)')
  })
})
