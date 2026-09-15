import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore.js'
import { useLayerPresetStore, toLayerPresetRef } from '../../stores/layerPresetStore.js'

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
let viz
let presets
let preset

function frame(time) {
  playerStore.audioRef.currentTime = time
  playerStore.notifyFrame()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  viz = useVisualizerStore()
  presets = useLayerPresetStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = { currentTime: 0 }

  // Preset aus zwei Layern anlegen, danach zurück in den Single-Modus
  viz.addLayer('bars', { color: '#111111' })
  viz.addLayer('waveform', { color: '#222222' })
  preset = presets.saveCurrentLayersAsPreset('Drop-Set')
  viz.clearAllLayers()

  wrapper = mount(Host, { global: { provide: { canvasManager: ref(null) } } })
  vm = wrapper.vm
  playerStore.audioRef.currentTime = 2
  playerStore.currentTime = 2
  playerStore.isPlaying = true
  await nextTick()
})

afterEach(() => wrapper?.unmount())

describe('Beat-Marker mit eigenem Layer-Preset', () => {
  it('speichert die Preset-Referenz samt Snapshot im Marker', () => {
    vm.addMarkerAtCurrentTime()
    vm.newMarkerVisualizer = toLayerPresetRef(preset.id)
    vm.confirmAddMarker()

    const marker = markerStore.markers.at(-1)
    expect(marker.action.visualizer).toBe(toLayerPresetRef(preset.id))
    expect(marker.action.layerPreset).toMatchObject({ id: preset.id, name: 'Drop-Set' })
    expect(marker.action.layerPreset.layers).toHaveLength(2)
    expect(vm.getVisualizerName(marker.action.visualizer)).toBe('Drop-Set')
  })

  it('wendet das Preset beim Auslösen an (Multi-Layer ein, Layer ersetzt)', () => {
    markerStore.addMarker(5, { visualizer: toLayerPresetRef(preset.id), visualizerVisible: true })
    expect(viz.multiLayerMode).toBe(false)
    frame(4.99)
    frame(5.01)
    expect(viz.multiLayerMode).toBe(true)
    expect(viz.visualizerLayers.map((l) => l.visualizerId)).toEqual(['bars', 'waveform'])
    expect(presets.isLayerPresetActive(preset)).toBe(true)
  })

  it('nutzt den Snapshot, wenn das Preset inzwischen gelöscht wurde', () => {
    vm.addMarkerAtCurrentTime()
    vm.newMarkerVisualizer = toLayerPresetRef(preset.id)
    vm.confirmAddMarker()
    const marker = markerStore.markers.at(-1)
    presets.deleteLayerPreset(preset.id)
    expect(presets.layerPresets).toHaveLength(0)

    markerStore.updateMarker(marker.id, { time: 5 })
    frame(4.99)
    frame(5.01)
    expect(viz.multiLayerMode).toBe(true)
    expect(viz.visualizerLayers).toHaveLength(2)
    expect(vm.getVisualizerName(marker.action.visualizer)).toBe('Drop-Set')
  })

  it('ein folgender Einzel-Visualizer-Marker verlässt den Multi-Layer-Modus', () => {
    markerStore.addMarker(5, { visualizer: toLayerPresetRef(preset.id), visualizerVisible: true })
    markerStore.addMarker(6, { visualizer: 'glNeonGrid', visualizerVisible: true })
    frame(4.99)
    frame(5.01)
    expect(viz.multiLayerMode).toBe(true)
    frame(5.99)
    frame(6.01)
    expect(viz.multiLayerMode).toBe(false)
    expect(viz.selectedVisualizer).toBe('glNeonGrid')
  })
})
