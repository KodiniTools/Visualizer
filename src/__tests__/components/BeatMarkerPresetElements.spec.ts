// Ein Beat-Marker mit Canvas-Preset als „Hintergrund“ setzt nur den
// Hintergrund-Teil. Die im Preset gespeicherten Elemente (Bilder, Videos,
// Texte, Lauftext) sind ein alter Stand: Sie würden gelöschte Elemente
// zurückholen und Änderungen an den Elementen überschreiben.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stub } from '../helpers/canvasStubs'
import { useBeatMarkers } from '../../composables/useBeatMarkers'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore'
import {
  useBackgroundBridgeStore,
  type BackgroundSnapshot,
} from '../../stores/backgroundBridgeStore'

const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {})
  },
  template: '<div />',
})

type HostVm = InstanceType<typeof Host>

/** Elemente, wie sie ein Canvas-Preset beim Speichern erfasst */
const OLD_ELEMENTS = {
  images: [{ src: 'data:image/png;base64,ALT', relX: 0.1, relY: 0.1 }],
  videos: [],
  texts: [{ id: 1, content: 'Alter Text', fontSize: 20 }],
  ticker: null,
}

let wrapper: VueWrapper<HostVm>
let vm: HostVm
let playerStore: ReturnType<typeof usePlayerStore>
let markerStore: ReturnType<typeof useBeatMarkerStore>
let applied: BackgroundSnapshot[]

function frame(time: number) {
  playerStore.audioRef!.currentTime = time
  playerStore.notifyFrame()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = stub({ currentTime: 0 })
  applied = []
  useBackgroundBridgeStore().register(
    () => ({}),
    (snap) => applied.push(snap),
  )
  const canvasManager = ref({ textManager: { textObjects: [] }, redrawCallback: () => {} })
  wrapper = mount(Host, { global: { provide: { canvasManager } } })
  vm = wrapper.vm
  playerStore.audioRef!.currentTime = 2
  playerStore.currentTime = 2
  playerStore.isPlaying = true
  await nextTick()
})

afterEach(() => {
  wrapper?.unmount()
})

describe('Beat-Marker mit Canvas-Preset als Hintergrund', () => {
  it('setzt beim Auslösen nur den Hintergrund, nicht die Elemente aus dem Preset', () => {
    localStorage.setItem(
      'visualizer-canvas-presets',
      JSON.stringify([
        { id: 7, name: 'Szene', backgroundColor: '#112233', elements: OLD_ELEMENTS },
      ]),
    )
    markerStore.addMarker(5, { backgroundKey: 'user:7', background: null })
    frame(4.99)
    frame(5.01)
    expect(applied).toHaveLength(1)
    expect(applied[0]!.backgroundColor).toBe('#112233')
    expect(applied[0]!.elements).toBeNull()
  })

  it('ältere Marker mit Elementen im gespeicherten Snapshot setzen sie ebenfalls nicht', () => {
    markerStore.addMarker(5, { background: { backgroundColor: '#445566', elements: OLD_ELEMENTS } })
    frame(4.99)
    frame(5.01)
    expect(applied).toHaveLength(1)
    expect(applied[0]!.backgroundColor).toBe('#445566')
    expect(applied[0]!.elements).toBeNull()
    // Der gespeicherte Marker bleibt unverändert
    expect(markerStore.markers[0]!.action.background).toHaveProperty('elements', OLD_ELEMENTS)
  })

  it('speichert beim Anlegen keine Elemente im Marker', () => {
    localStorage.setItem(
      'visualizer-canvas-presets',
      JSON.stringify([
        { id: 7, name: 'Szene', backgroundColor: '#112233', elements: OLD_ELEMENTS },
      ]),
    )
    vm.addMarkerAtCurrentTime()
    vm.newMarkerBackgroundKey = 'user:7'
    vm.confirmAddMarker()
    const action = markerStore.markers.at(-1)!.action
    expect(action.backgroundKey).toBe('user:7')
    expect(action.background).toMatchObject({ backgroundColor: '#112233', elements: null })
    expect(JSON.stringify(action)).not.toContain('Alter Text')
  })

  it('Presets ohne Elemente bleiben unverändert', () => {
    markerStore.addMarker(5, { background: { backgroundColor: '#00ff00' } })
    frame(4.99)
    frame(5.01)
    expect(applied[0]).toEqual({ backgroundColor: '#00ff00' })
  })
})
