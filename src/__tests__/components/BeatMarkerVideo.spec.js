// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, provide, ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BeatMarkerPopover from '../../components/sticky-player-bar/BeatMarkerPopover.vue'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore'
import { useBackgroundBridgeStore } from '../../stores/backgroundBridgeStore'
import { useImageGallery } from '../../composables/useImageGallery.js'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const AR = { enabled: true, source: 'mid', effects: { hue: { enabled: true, intensity: 70 } } }

function fakeVideoEl() {
  return {
    src: '',
    paused: true,
    muted: false,
    loop: false,
    currentTime: 5,
    load: vi.fn(),
    play: vi.fn(function () {
      this.paused = false
      return Promise.resolve()
    }),
    pause: vi.fn(function () {
      this.paused = true
    }),
  }
}

function fakeCm() {
  const cm = {
    workspacePreset: null,
    background: null,
    workspaceBackground: null,
    videoBackground: null,
    workspaceVideoBackground: null,
    textManager: { textObjects: [] },
    redrawCallback: vi.fn(),
    updateUICallback: vi.fn(),
    setBackground: vi.fn((img) => {
      cm.background = { imageObject: img, fotoSettings: { audioReactive: null } }
    }),
    setWorkspaceBackground: vi.fn(() => false),
    setVideoBackground: vi.fn((v) => {
      cm.videoBackground = { videoElement: v, fotoSettings: { audioReactive: null } }
      if (cm.background && typeof cm.background === 'object') cm.background = '#ffffff'
    }),
    setWorkspaceVideoBackground: vi.fn((v) => {
      cm.workspaceVideoBackground = { videoElement: v, fotoSettings: {} }
    }),
  }
  return cm
}

let wrapper
let api
let playerStore
let markerStore
let cm
let created
const videoGallery = ref([])
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

function frame(time) {
  playerStore.audioRef.currentTime = time
  playerStore.notifyFrame()
}

/** Marker bei `time` überschreiten und das Marker-Video fertig laden lassen. */
function crossAndLoad(time) {
  frame(time - 0.01)
  frame(time + 0.01)
  const el = created.at(-1)
  el?.onloadeddata?.()
  return el
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
    return el
  })
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = { currentTime: 0 }
  videoGallery.value = [
    { id: 101, name: 'intro', src: 'blob:intro' },
    { id: 202, name: 'drop', src: 'blob:drop' },
  ]
  imageGallery.value = [{ id: 11, name: 'wald.jpg', img: imgA }]
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
  playerStore.audioRef.currentTime = 2
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
    const action = markerStore.markers.at(-1).action
    expect(action.video).toEqual({
      galleryId: 202,
      name: 'drop',
      defaults: { target: 'background', audioReactive: AR },
    })
    expect(JSON.stringify(action)).not.toContain('blob:')
    expect(api.newMarkerVideoId.value).toBe('')

    api.startEditMarker(markerStore.markers.at(-1))
    expect(api.newMarkerVideoId.value).toBe(202)
    api.addMarkerAtCurrentTime()
    expect(api.newMarkerVideoId.value).toBe('')
  })

  it('ohne Auswahl bleibt action.video null', async () => {
    await mountHost()
    api.addMarkerAtCurrentTime()
    api.confirmAddMarker()
    expect(markerStore.markers.at(-1).action.video).toBeNull()
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
    expect(cm.videoBackground.videoElement).toBe(el)
    expect(cm.videoBackground.fotoSettings.audioReactive).toEqual(AR)
    expect(el.currentTime).toBe(0)
    await flushPromises()
    expect(el.play).toHaveBeenCalled()
  })

  it('findet das Video nach erneutem Hochladen über den Namen', async () => {
    await mountHost()
    markerStore.addMarker(5, { video: { galleryId: 999, name: 'intro' } })
    const el = crossAndLoad(5)
    expect(el.src).toBe('blob:intro')
    expect(cm.videoBackground.videoElement).toBe(el)
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
    expect(cm.videoBackground.videoElement).toBe(el)
  })

  it('mit Hintergrund-Preset im selben Marker liefert das Preset kein eigenes Video', async () => {
    await mountHost()
    const applied = []
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
    expect(applied[0].backgroundVideo).toBeNull()
    expect(applied[0].backgroundColor).toBe('#000000')
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
    expect(cm.background.imageObject).toBe(imgA)
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
    late.onloadeddata()
    expect(cm.setVideoBackground).not.toHaveBeenCalled()
    expect(late.src).toBe('')
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

  const selectWith = (text) =>
    [...document.body.querySelectorAll('select')].find((s) =>
      [...s.options].some((o) => o.textContent.trim() === text),
    )

  it('zeigt „Kein Video“ und die hochgeladenen Videos; Auswahl zeigt den Hinweis', async () => {
    mountPopover()
    api.addMarkerAtCurrentTime()
    await flushPromises()
    const select = selectWith(de.player.noMarkerVideo)
    expect(select).toBeTruthy()
    expect([...select.options].map((o) => o.textContent.trim())).toEqual([
      de.player.noMarkerVideo,
      '1. intro',
      '2. drop',
    ])
    expect(document.body.textContent).not.toContain(de.player.markerVideoHint)
    select.value = select.options[2].value
    select.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(document.body.textContent).toContain(de.player.markerVideoHint)
  })

  it('zeigt einen deaktivierten Hinweis ohne hochgeladene Videos', async () => {
    videoGallery.value = []
    mountPopover()
    api.addMarkerAtCurrentTime()
    await flushPromises()
    const select = selectWith(de.player.noMarkerVideo)
    const empty = [...select.options].find(
      (o) => o.textContent.trim() === de.player.emptyVideoGallery,
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
    for (const key of ['markerVideo', 'noMarkerVideo', 'emptyVideoGallery', 'markerVideoHint']) {
      expect(de.player[key]).toBeTruthy()
      expect(en.player[key]).toBeTruthy()
    }
  })
})
