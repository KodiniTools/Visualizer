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
