import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore.js'
import { useShapeStore } from '../../stores/shapeStore.js'

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
let shapes
let star
let heart

function frame(time) {
  playerStore.audioRef.currentTime = time
  playerStore.notifyFrame()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  shapes = useShapeStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = { currentTime: 0 }
  star = shapes.addShape('star', 800, 600)
  heart = shapes.addShape('emojiHeart', 800, 600)

  wrapper = mount(Host, { global: { provide: { canvasManager: ref(null) } } })
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

describe('Beat-Marker mit Formen & Symbolen', () => {
  it('bietet alle eingefügten Formen im Marker-Formular an', () => {
    const list = vm.getMarkerShapes()
    expect(list.map((s) => s.id)).toEqual([star.id, heart.id])
    expect(list[0]).toMatchObject({ number: 1, name: 'Stern' })
    expect(list[1].extra).toBe(heart.emoji)
  })

  it('speichert die gewählte Form samt Bezeichnung im Marker', () => {
    vm.addMarkerAtCurrentTime()
    vm.newMarkerShapeId = star.id
    vm.confirmAddMarker()
    const marker = markerStore.markers.at(-1)
    expect(marker.action.shapeId).toBe(star.id)
    expect(marker.action.shapeLabel).toBe('Stern')
    expect(vm.newMarkerShapeId).toBe('')
  })

  it('lädt die Form beim Bearbeiten ins Formular', () => {
    const marker = markerStore.addMarker(4, { shapeId: heart.id })
    vm.startEditMarker(marker)
    expect(vm.newMarkerShapeId).toBe(heart.id)
  })

  it('blendet zugewiesene Formen beim Start aus und zum Marker-Zeitpunkt ein', async () => {
    markerStore.addMarker(5, { shapeId: star.id })
    markerStore.addMarker(8, { shapeId: heart.id })
    await startPlaybackAtZero()
    expect(shapes.isMarkerHidden(star.id)).toBe(true)
    expect(shapes.isMarkerHidden(heart.id)).toBe(true)

    frame(4.99)
    frame(5.01)
    expect(shapes.isMarkerHidden(star.id)).toBe(false)
    expect(shapes.isMarkerHidden(heart.id)).toBe(true)

    // Nächster Marker: nur noch dessen Form sichtbar (wie bei Texten)
    frame(7.99)
    frame(8.01)
    expect(shapes.isMarkerHidden(star.id)).toBe(true)
    expect(shapes.isMarkerHidden(heart.id)).toBe(false)
  })

  it('lässt Formen ohne Marker unberührt', async () => {
    markerStore.addMarker(5, { shapeId: star.id })
    await startPlaybackAtZero()
    expect(shapes.isMarkerHidden(heart.id)).toBe(false)
  })

  it('blendet die Form wieder ein, wenn ihr Marker gelöscht wird', async () => {
    const marker = markerStore.addMarker(5, { shapeId: star.id })
    await startPlaybackAtZero()
    expect(shapes.isMarkerHidden(star.id)).toBe(true)
    vm.removeMarker(marker.id)
    expect(shapes.isMarkerHidden(star.id)).toBe(false)
  })

  it('blendet alles wieder ein, wenn Marker deaktiviert werden', async () => {
    markerStore.addMarker(5, { shapeId: star.id })
    await startPlaybackAtZero()
    markerStore.toggleEnabled()
    await nextTick()
    expect(shapes.isMarkerHidden(star.id)).toBe(false)
  })

  it('das Ausblenden landet nicht im Verlaufs-Snapshot', async () => {
    markerStore.addMarker(5, { shapeId: star.id })
    await startPlaybackAtZero()
    const snap = shapes.captureSnapshot()
    expect(JSON.stringify(snap)).not.toContain('markerHidden')
    expect(snap.shapes).toHaveLength(2)
  })
  it('bietet die ganze Galerie (ohne Zeichenwerkzeuge) nach Kategorien an', () => {
    const groups = vm.getMarkerShapeGallery()
    expect(groups.map((g) => g.category)).toEqual([
      'basic',
      'arrows',
      'lines',
      'symbols',
      'annotate',
      'stickers',
    ])
    const stickers = groups.find((g) => g.category === 'stickers')
    expect(stickers.label).toBe('Sticker')
    expect(stickers.items.find((i) => i.value === 'gallery:emojiFire').name).toContain('🔥')
    expect(groups.flatMap((g) => g.items).every((i) => i.value.startsWith('gallery:'))).toBe(true)
  })

  it('ein Galerie-Eintrag legt beim Speichern eine neue Form an und weist sie zu', () => {
    vm.addMarkerAtCurrentTime()
    vm.newMarkerShapeId = 'gallery:arrow'
    vm.confirmAddMarker()
    expect(shapes.shapes).toHaveLength(3)
    const created = shapes.shapes.at(-1)
    expect(created.galleryId).toBe('arrow')
    expect(created).toMatchObject({ x: 400, y: 300 })
    expect(shapes.selectedShapeId).toBeNull()
    const marker = markerStore.markers.at(-1)
    expect(marker.action.shapeId).toBe(created.id)
    expect(marker.action.shapeLabel).toBe('Pfeil')
  })

  it('während der Wiedergabe erscheint die neue Form erst zum Marker-Zeitpunkt', async () => {
    playerStore.audioRef.currentTime = 2
    playerStore.currentTime = 2
    playerStore.isPlaying = true
    await nextTick()
    vm.addMarkerAtCurrentTime()
    vm.pendingMarkerTimeInput = '0:06.00'
    vm.updateMarkerTimeFromInput()
    vm.newMarkerShapeId = 'gallery:emojiFire'
    vm.confirmAddMarker()
    const created = shapes.shapes.at(-1)
    expect(shapes.isMarkerHidden(created.id)).toBe(true)
    frame(5.99)
    frame(6.01)
    expect(shapes.isMarkerHidden(created.id)).toBe(false)
  })
})
