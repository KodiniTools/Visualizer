import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore.js'
import { TextManager } from '../../lib/textManager.js'

const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {})
  },
  template: '<div />',
})

let wrapper
let vm
let playerStore
let markerStore
let tm
let kept
let removed

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

  tm = new TextManager({})
  kept = tm.add('Bleibt')
  removed = tm.add('Snovi moji', { fontSize: 84 })
  // Feste IDs: add() erzeugt Date.now() + Zufall – Reihenfolge sonst instabil
  kept.id = 1
  removed.id = 2
  tm.removeFromCanvas(removed)

  const canvasManager = ref({ textManager: tm, redrawCallback: () => {} })
  wrapper = mount(Host, { global: { provide: { canvasManager } } })
  vm = wrapper.vm
  await nextTick()
})

afterEach(() => wrapper?.unmount())

async function startPlaybackAtZero() {
  playerStore.audioRef.currentTime = 0
  playerStore.currentTime = 0
  playerStore.isPlaying = true
  await nextTick()
}

describe('Beat-Marker mit vom Canvas entfernten Texten', () => {
  it('bietet entfernte Texte weiter im Dropdown an (markiert)', () => {
    const list = vm.getMarkerTexts()
    expect(list.map((x) => x.id)).toEqual([kept.id, removed.id])
    expect(list[0].offCanvas).toBe(false)
    expect(list[1]).toMatchObject({ number: 2, content: 'Snovi moji', offCanvas: true })
  })

  it('lädt den entfernten Text beim Bearbeiten ins Formular', () => {
    const marker = markerStore.addMarker(4, { textId: removed.id, textLabel: 'Snovi moji' })
    vm.startEditMarker(marker)
    expect(vm.newMarkerTextId).toBe(removed.id)
  })

  it('zeigt den entfernten Text zum Marker-Zeitpunkt, ohne ihn auf den Canvas zurückzuholen', async () => {
    markerStore.addMarker(5, { textId: removed.id })
    markerStore.addMarker(8, { textId: kept.id })
    await startPlaybackAtZero()
    expect(tm.isDrawable(removed)).toBe(false)

    frame(4.99)
    frame(5.01)
    expect(tm.isDrawable(removed)).toBe(true)
    expect(removed.offCanvas).toBe(true)
    expect(removed.opacity).toBe(100)

    // Nächster Text-Marker blendet ihn wieder aus
    frame(7.99)
    frame(8.01)
    expect(tm.isDrawable(removed)).toBe(false)
  })

  it('setzt die Einblendung beim Deaktivieren der Marker zurück', async () => {
    markerStore.addMarker(5, { textId: removed.id })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    expect(tm.isDrawable(removed)).toBe(true)
    markerStore.toggleEnabled()
    await nextTick()
    expect(tm.isDrawable(removed)).toBe(false)
  })

  it('setzt die Einblendung zurück, wenn der Marker gelöscht wird', async () => {
    const marker = markerStore.addMarker(5, { textId: removed.id })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    vm.removeMarker(marker.id)
    expect(tm.isDrawable(removed)).toBe(false)
  })
})

describe('beatMarkerStore.clearTextReference', () => {
  it('setzt nur Marker zurück, die den Text verwenden', () => {
    const a = markerStore.addMarker(1, { textId: removed.id, textLabel: 'Snovi moji' })
    const b = markerStore.addMarker(2, { textId: kept.id, textLabel: 'Bleibt' })
    expect(markerStore.clearTextReference(removed.id)).toBe(1)
    const byId = (id) => markerStore.markers.find((m) => m.id === id)
    expect(byId(a.id).action.textId).toBeNull()
    expect(byId(a.id).action.textLabel).toBeNull()
    expect(byId(b.id).action.textId).toBe(kept.id)
  })

  it('ignoriert leere IDs', () => {
    markerStore.addMarker(1, { textId: null })
    expect(markerStore.clearTextReference(null)).toBe(0)
    expect(markerStore.clearTextReference('')).toBe(0)
  })
})
