import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore.js'

const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {})
  },
  template: '<div />',
})

let wrapper
let playerStore
let markerStore
let visualizerStore

// Simuliert einen Render-Frame bei der angegebenen Audio-Position.
function frame(time) {
  playerStore.audioRef.currentTime = time
  playerStore.notifyFrame()
}

// Simuliert das timeupdate-Ereignis (~4x/s) des Audio-Elements.
async function timeupdate(time) {
  playerStore.currentTime = time
  await nextTick()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  visualizerStore = useVisualizerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = { currentTime: 0 }
  wrapper = mount(Host, { global: { provide: { canvasManager: ref(null) } } })
  // Wiedergabe ab 2.0s starten (kein Start-Marker-Sonderfall bei < 0.5s)
  playerStore.audioRef.currentTime = 2
  playerStore.currentTime = 2
  playerStore.isPlaying = true
  await nextTick()
})

afterEach(() => wrapper?.unmount())

describe('Beat-Marker Auslösung über die Render-Schleife', () => {
  it('feuert beim Überschreiten der Marker-Zeit zwischen zwei Frames', () => {
    markerStore.addMarker(5.37, { color: '#123456', visualizerVisible: true }, 'A')
    frame(5.36)
    expect(visualizerStore.visualizerColor).not.toBe('#123456')
    frame(5.38)
    expect(visualizerStore.visualizerColor).toBe('#123456')
    expect(markerStore.markers[0].triggered).toBe(true)
  })

  it('feuert mehrere Marker innerhalb eines Frames in zeitlicher Reihenfolge', () => {
    const order = []
    const spy = vi.spyOn(visualizerStore, 'setColor').mockImplementation((c) => order.push(c))
    markerStore.addMarker(5.02, { color: '#bbbbbb', visualizerVisible: true }, 'B')
    markerStore.addMarker(5.0, { color: '#aaaaaa', visualizerVisible: true }, 'A')
    frame(4.99)
    frame(5.03)
    expect(order).toEqual(['#aaaaaa', '#bbbbbb'])
    spy.mockRestore()
  })

  it('feuert beim Rückwärts-Seek erneut, bei großem Vorwärtssprung nicht nachträglich', () => {
    const spy = vi.spyOn(visualizerStore, 'setColor')
    markerStore.addMarker(5, { color: '#111111', visualizerVisible: true }, 'A')
    markerStore.addMarker(20, { color: '#222222', visualizerVisible: true }, 'B')

    frame(4.99)
    frame(5.01)
    expect(spy).toHaveBeenCalledTimes(1)

    // Rückwärts-Seek → Trigger zurückgesetzt, A feuert beim erneuten Überschreiten
    frame(3)
    frame(4.99)
    frame(5.01)
    expect(spy).toHaveBeenCalledTimes(2)

    // Vorwärts-Seek über B hinweg → B wird nicht nachträglich gefeuert
    frame(25)
    frame(25.02)
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('timeupdate-Fallback bleibt stumm, solange Frames ankommen', async () => {
    const spy = vi.spyOn(visualizerStore, 'setColor')
    markerStore.addMarker(5, { color: '#333333', visualizerVisible: true }, 'A')

    frame(4.9) // Schleife ist aktiv
    await timeupdate(4.9)
    await timeupdate(5.05) // hätte den Marker überschritten, aber Fallback ist gesperrt
    expect(spy).not.toHaveBeenCalled()

    frame(5.01) // Frame-Pfad feuert exakt beim Überschreiten
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('timeupdate-Fallback greift bei pausierter Schleife, aber nie zu früh', async () => {
    const spy = vi.spyOn(visualizerStore, 'setColor')
    markerStore.addMarker(5, { color: '#444444', visualizerVisible: true }, 'A')
    markerStore.addMarker(5.03, { color: '#555555', visualizerVisible: true }, 'B')

    frame(4.5)
    // Render-Schleife pausiert (z.B. Tab im Hintergrund): Zeit verstreicht
    const nowSpy = vi.spyOn(performance, 'now')
    const base = performance.now()
    nowSpy.mockImplementation(() => base + 2000)

    await timeupdate(4.7)
    await timeupdate(4.95) // innerhalb der alten Toleranz, aber noch vor dem Marker
    expect(spy).not.toHaveBeenCalled()

    await timeupdate(5.2) // beide Marker überschritten → beide feuern (auch dicht beieinander)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(1, '#444444')
    expect(spy).toHaveBeenNthCalledWith(2, '#555555')
    nowSpy.mockRestore()
    spy.mockRestore()
  })
})
