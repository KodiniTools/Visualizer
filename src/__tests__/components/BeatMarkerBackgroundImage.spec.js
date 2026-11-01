import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore.js'
import { useBackgroundBridgeStore } from '../../stores/backgroundBridgeStore.js'
import { useImageGallery } from '../../composables/useImageGallery.js'

const AR = { enabled: true, source: 'mid', effects: { hue: { enabled: true, intensity: 70 } } }

const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {})
  },
  template: '<div />',
})

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
      cm.background =
        typeof img === 'string' ? img : { imageObject: img, fotoSettings: { audioReactive: null } }
    }),
    setWorkspaceBackground: vi.fn((img) => {
      if (!cm.workspacePreset) return false
      cm.workspaceBackground = { imageObject: img, fotoSettings: {} }
      return true
    }),
  }
  return cm
}

let wrapper
let vm
let playerStore
let markerStore
let cm
const gallery = useImageGallery().imageGallery
const imgA = { src: 'data:image/png;base64,AAA' }
const imgB = { src: 'data:image/png;base64,BBB' }

function frame(time) {
  playerStore.audioRef.currentTime = time
  playerStore.notifyFrame()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = { currentTime: 0 }
  gallery.value = [
    { id: 11, name: 'wald.jpg', img: imgA },
    { id: 22, name: 'stadt.jpg', img: imgB },
  ]
  cm = fakeCm()
  wrapper = mount(Host, { global: { provide: { canvasManager: ref(cm) } } })
  vm = wrapper.vm
  playerStore.audioRef.currentTime = 2
  playerStore.currentTime = 2
  playerStore.isPlaying = true
  await nextTick()
})

afterEach(() => {
  wrapper?.unmount()
  gallery.value = []
})

describe('Beat-Marker mit Hintergrund-Bild aus der Galerie', () => {
  it('bietet die Bilder der eigenen Galerie an', () => {
    expect(vm.getMarkerGalleryImages()).toEqual([
      { id: 11, number: 1, name: 'wald.jpg' },
      { id: 22, number: 2, name: 'stadt.jpg' },
    ])
  })

  it('speichert nur einen Verweis plus Vorgaben des aktuellen Hintergrund-Bildes', () => {
    cm.background = { imageObject: { src: 'alt.png' }, fotoSettings: { audioReactive: AR } }
    vm.addMarkerAtCurrentTime()
    vm.newMarkerBgImageId = 22
    vm.confirmAddMarker()
    const action = markerStore.markers.at(-1).action
    expect(action.backgroundImage).toEqual({
      galleryId: 22,
      name: 'stadt.jpg',
      defaults: { target: 'background', audioReactive: AR },
    })
    expect(JSON.stringify(action)).not.toContain('base64')
    expect(vm.newMarkerBgImageId).toBe('')

    vm.startEditMarker(markerStore.markers.at(-1))
    expect(vm.newMarkerBgImageId).toBe(22)
  })

  it('setzt das Bild beim Auslösen und übernimmt Audio-Reaktiv vom vorherigen Bild', () => {
    markerStore.addMarker(5, {
      backgroundImage: { galleryId: 11, name: 'wald.jpg', defaults: null },
    })
    cm.background = { imageObject: { src: 'vorher.png' }, fotoSettings: { audioReactive: AR } }
    frame(4.99)
    frame(5.01)
    expect(cm.background.imageObject).toBe(imgA)
    expect(cm.background.fotoSettings.audioReactive).toEqual(AR)
  })

  it('übernimmt das Workspace-Format vom vorherigen Bild', () => {
    cm.workspacePreset = { id: 'ws' }
    cm.workspaceBackground = { imageObject: { src: 'ws.png' }, fotoSettings: { audioReactive: AR } }
    markerStore.addMarker(5, { backgroundImage: { galleryId: 22, name: 'stadt.jpg' } })
    frame(4.99)
    frame(5.01)
    expect(cm.workspaceBackground.imageObject).toBe(imgB)
    expect(cm.workspaceBackground.fotoSettings.audioReactive).toEqual(AR)
    expect(cm.setBackground).not.toHaveBeenCalled()
  })

  it('nutzt die gespeicherten Vorgaben, wenn gerade kein Hintergrund-Bild zu sehen ist', () => {
    cm.workspacePreset = { id: 'ws' }
    markerStore.addMarker(5, {
      backgroundImage: {
        galleryId: 11,
        name: 'wald.jpg',
        defaults: { target: 'workspace', audioReactive: AR },
      },
    })
    frame(4.99)
    frame(5.01)
    expect(cm.workspaceBackground.imageObject).toBe(imgA)
    expect(cm.workspaceBackground.fotoSettings.audioReactive).toEqual(AR)
  })

  it('überspringt Bilder, die nicht mehr in der Galerie sind', () => {
    markerStore.addMarker(5, { backgroundImage: { galleryId: 99, name: 'weg.jpg' } })
    frame(4.99)
    frame(5.01)
    expect(cm.setBackground).not.toHaveBeenCalled()
  })

  it('mit Hintergrund-Preset im selben Marker liefert das Preset kein eigenes Bild', () => {
    const bridge = useBackgroundBridgeStore()
    const applied = []
    bridge.register(
      () => ({}),
      (snap) => applied.push(snap),
    )
    markerStore.addMarker(5, {
      background: { backgroundColor: '#000000', backgroundImage: { src: 'preset.png' } },
      backgroundImage: { galleryId: 11, name: 'wald.jpg' },
    })
    frame(4.99)
    frame(5.01)
    expect(applied).toHaveLength(1)
    expect(applied[0].backgroundImage).toBeNull()
    expect(applied[0].backgroundColor).toBe('#000000')
    expect(cm.background.imageObject).toBe(imgA)
  })

  it('ein Marker ohne Hintergrund-Bild stellt den Hintergrund von vorher wieder her', () => {
    const before = { imageObject: { src: 'vorher.png' }, fotoSettings: { audioReactive: AR } }
    cm.background = before
    markerStore.addMarker(5, { backgroundImage: { galleryId: 11, name: 'wald.jpg' } })
    markerStore.addMarker(8, { backgroundImage: { galleryId: 22, name: 'stadt.jpg' } })
    markerStore.addMarker(12, { visualizer: null })
    frame(4.99)
    frame(5.01)
    expect(cm.background.imageObject).toBe(imgA)
    frame(7.99)
    frame(8.01)
    expect(cm.background.imageObject).toBe(imgB)
    frame(11.99)
    frame(12.01)
    expect(cm.background).toBe(before)
  })

  it('ohne vorheriges Bild wird der Hintergrund wieder geleert', () => {
    cm.background = '#123456'
    markerStore.addMarker(5, { backgroundImage: { galleryId: 11, name: 'wald.jpg' } })
    markerStore.addMarker(8, { visualizer: null })
    frame(4.99)
    frame(5.01)
    expect(cm.background.imageObject).toBe(imgA)
    frame(7.99)
    frame(8.01)
    expect(cm.background).toBe('#123456')
  })

  it('ein Marker mit Hintergrund-Preset ersetzt das Bild ohne Zurücksetzen', () => {
    const bridge = useBackgroundBridgeStore()
    bridge.register(
      () => ({}),
      () => {
        cm.background = '#00ff00'
      },
    )
    cm.background = null
    markerStore.addMarker(5, { backgroundImage: { galleryId: 11, name: 'wald.jpg' } })
    markerStore.addMarker(8, { background: { backgroundColor: '#00ff00' } })
    markerStore.addMarker(10, { visualizer: null })
    frame(4.99)
    frame(5.01)
    frame(7.99)
    frame(8.01)
    expect(cm.background).toBe('#00ff00')
    frame(9.99)
    frame(10.01)
    expect(cm.background).toBe('#00ff00')
  })

  it('Zurückspulen an den Anfang stellt den Hintergrund von vorher wieder her', async () => {
    cm.background = null
    markerStore.addMarker(5, { backgroundImage: { galleryId: 11, name: 'wald.jpg' } })
    frame(4.99)
    frame(5.01)
    expect(cm.background.imageObject).toBe(imgA)
    playerStore.currentTime = 0
    await nextTick()
    expect(cm.background).toBeNull()
  })
})
