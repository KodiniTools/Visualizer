// Beat-Marker übernehmen Bearbeitungen sofort: Ein vom Marker bis zu seinem
// Zeitpunkt ausgeblendetes Element wird beim Bearbeiten sichtbar, und die
// Bezeichnungen in der Marker-Liste folgen dem aktuellen Inhalt.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stub } from '../helpers/canvasStubs'
import { useBeatMarkers } from '../../composables/useBeatMarkers'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore'
import { TextManager } from '../../lib/textManager'
import { MultiImageManager, type CanvasImage } from '../../lib/multiImageManager'
import { notifyMarkerTargetEdited } from '../../lib/markerTargetEdits'
import type { TextObject } from '../../lib/textManager/types'

const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {})
  },
  template: '<div />',
})

type HostVm = InstanceType<typeof Host>

let wrapper: VueWrapper<HostVm> | null
let vm: HostVm
let playerStore: ReturnType<typeof usePlayerStore>
let markerStore: ReturnType<typeof useBeatMarkerStore>
let tm: TextManager
let text: TextObject
let mim: MultiImageManager
let image: CanvasImage

async function startPlaybackAtZero() {
  playerStore.audioRef!.currentTime = 0
  playerStore.currentTime = 0
  playerStore.isPlaying = true
  await nextTick()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = stub({ currentTime: 0 })

  tm = new TextManager({})
  text = tm.add('Snovi moji')
  text.id = 1
  text.opacity = 80

  const managerRef = ref(
    new MultiImageManager(stub({ width: 1000, height: 500 }), { redrawCallback: () => {} }),
  )
  mim = managerRef.value as MultiImageManager
  image = mim.addImage(stub({ width: 10, height: 10 }))!

  const canvasManager = ref({ textManager: tm, redrawCallback: () => {} })
  wrapper = mount(Host, {
    global: { provide: { canvasManager, multiImageManager: managerRef } },
  })
  vm = wrapper.vm
  await nextTick()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('Beat-Marker übernehmen Bearbeitungen sofort', () => {
  it('Bearbeiten eines vom Marker ausgeblendeten Textes zeigt ihn mit seiner Deckkraft', async () => {
    markerStore.addMarker(5, { textId: 1 })
    await startPlaybackAtZero()
    expect(text.opacity).toBe(0)

    notifyMarkerTargetEdited({ kind: 'text', id: 1 })
    expect(text.opacity).toBe(80)

    // Beim Zurücksetzen bleibt die Deckkraft erhalten
    markerStore.toggleEnabled()
    await nextTick()
    expect(text.opacity).toBe(80)
  })

  it('Bearbeiten eines vom Marker ausgeblendeten Bildes blendet es ein', async () => {
    markerStore.addMarker(5, { imageId: image.id })
    await startPlaybackAtZero()
    expect(mim.isMarkerHidden(image.id)).toBe(true)
    notifyMarkerTargetEdited({ kind: 'image', id: image.id })
    expect(mim.isMarkerHidden(image.id)).toBe(false)
  })

  it('nicht ausgeblendete Elemente bleiben unverändert', () => {
    notifyMarkerTargetEdited({ kind: 'text', id: 1 })
    expect(text.opacity).toBe(80)
    notifyMarkerTargetEdited({ kind: 'image', id: 'gibt-es-nicht' })
    expect(mim.isMarkerHidden(image.id)).toBe(false)
  })

  it('nach dem Verlassen hört der Marker nicht mehr zu', async () => {
    markerStore.addMarker(5, { textId: 1 })
    await startPlaybackAtZero()
    wrapper!.unmount()
    wrapper = null
    text.opacity = 0
    notifyMarkerTargetEdited({ kind: 'text', id: 1 })
    expect(text.opacity).toBe(0)
  })

  it('Bezeichnungen in der Marker-Liste folgen dem aktuellen Text bzw. Bild', () => {
    expect(vm.getMarkerTextLabel(1)).toBe('Snovi moji')
    text.content = 'Neuer Titel'
    expect(vm.getMarkerTextLabel(1)).toBe('Neuer Titel')
    expect(vm.getMarkerTextLabel(999)).toBeNull()
    expect(vm.getMarkerImageLabel(image.id)).toBe('Ebene 1')
    expect(vm.getMarkerImageLabel('weg')).toBeNull()
  })
})

describe('Marker greifen nur während der Wiedergabe ein', () => {
  async function setPlaying(playing: boolean, time?: number) {
    if (time !== undefined) {
      playerStore.audioRef!.currentTime = time
      playerStore.currentTime = time
      await nextTick()
    }
    playerStore.isPlaying = playing
    await nextTick()
  }

  it('Pause blendet alle vom Marker ausgeblendeten Texte und Bilder ein', async () => {
    markerStore.addMarker(5, { textId: 1 })
    markerStore.addMarker(8, { imageId: image.id })
    await startPlaybackAtZero()
    expect(text.opacity).toBe(0)
    expect(mim.isMarkerHidden(image.id)).toBe(true)

    await setPlaying(false)
    expect(text.opacity).toBe(80)
    expect(mim.isMarkerHidden(image.id)).toBe(false)
  })

  it('Fortsetzen mitten im Track stellt den Marker-Stand her, ohne Animationen neu zu starten', async () => {
    markerStore.addMarker(5, { textId: 1 })
    markerStore.addMarker(8, { imageId: image.id })
    await startPlaybackAtZero()
    await setPlaying(false, 6)
    // Stand der Text-Animation, den der Nutzer gerade sieht
    const state = { startTime: 42, isPlaying: true, currentIndex: 3 }
    text.animation!._state = { ...text.animation!._state, ...state }

    await setPlaying(true)
    // Marker bei 5 s ist erreicht: Text sichtbar, Bild (Marker bei 8 s) noch nicht
    expect(text.opacity).toBe(80)
    expect(text.animation!._state).toMatchObject(state)
    expect(mim.isMarkerHidden(image.id)).toBe(true)
  })

  it('Fortsetzen vor dem ersten Marker blendet dessen Elemente aus', async () => {
    markerStore.addMarker(5, { textId: 1 })
    await setPlaying(false, 3)
    expect(text.opacity).toBe(80)
    await setPlaying(true)
    expect(text.opacity).toBe(0)
  })

  it('Sprung während der Wiedergabe übernimmt den Marker-Stand der neuen Position', async () => {
    markerStore.addMarker(5, { textId: 1 })
    markerStore.addMarker(8, { imageId: image.id })
    await startPlaybackAtZero()
    playerStore.currentTime = 9
    await nextTick()
    // Ein Marker ohne Text lässt den Text des vorherigen Markers stehen
    expect(text.opacity).toBe(80)
    expect(mim.isMarkerHidden(image.id)).toBe(false)
  })

  it('deaktivierte Marker blenden beim Fortsetzen nichts aus', async () => {
    markerStore.addMarker(5, { textId: 1 })
    markerStore.toggleEnabled()
    await setPlaying(false, 3)
    await setPlaying(true)
    expect(text.opacity).toBe(80)
  })
})

describe('Text-Marker respektieren die Anzeigedauer des Textes', () => {
  function frame(time: number) {
    playerStore.audioRef!.currentTime = time
    playerStore.notifyFrame()
  }

  it('ein späterer Text-Marker blendet einen Text mit eigener Anzeigedauer nicht aus', async () => {
    const second = tm.add('Dinko Ramić')
    second.id = 2
    Object.assign(text.animation!.fade!, {
      enabled: true,
      permanent: false,
      displayDuration: 20000,
    })
    markerStore.addMarker(5, { textId: 1 })
    markerStore.addMarker(8, { textId: 2 })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    expect(text.opacity).toBe(80)
    frame(7.99)
    frame(8.01)
    expect(second.opacity).toBeGreaterThan(0)
    // Text 1 läuft nach seiner Anzeigedauer aus, nicht nach dem Marker
    expect(text.opacity).toBe(80)
  })

  it('ein permanenter Text wird vom nächsten Text-Marker abgelöst', async () => {
    const second = tm.add('Dinko Ramić')
    second.id = 2
    markerStore.addMarker(5, { textId: 1 })
    markerStore.addMarker(8, { textId: 2 })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    frame(7.99)
    frame(8.01)
    expect(text.opacity).toBe(0)
    expect(second.opacity).toBeGreaterThan(0)
  })
})
