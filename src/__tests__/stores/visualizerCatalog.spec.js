// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { BUILT_IN_PRESETS, usePresetStore } from '../../stores/presetStore.js'
import { Visualizers, glVisualizers } from '../../lib/visualizers/index.js'

describe('visualizer catalogue (migration stage 1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lists GPU presets first and every classic visualizer under "Klassisch"', () => {
    const store = useVisualizerStore()
    const categories = Object.keys(store.categorizedVisualizers)
    expect(categories[0]).toBe('GPU-Presets')
    expect(categories).toContain('Klassisch')

    const gpuIds = store.categorizedVisualizers['GPU-Presets'].map((v) => v.id)
    expect(gpuIds.sort()).toEqual(Object.keys(glVisualizers).sort())

    const classicIds = store.categorizedVisualizers.Klassisch.map((v) => v.id)
    const expectedClassic = Object.keys(Visualizers).filter((id) => !glVisualizers[id])
    expect(classicIds.sort()).toEqual(expectedClassic.sort())
  })

  it('lists every registered visualizer in exactly one category', () => {
    const store = useVisualizerStore()
    const all = Object.values(store.categorizedVisualizers).flatMap((list) => list.map((v) => v.id))
    expect(all.length).toBe(new Set(all).size)
    expect([...all].sort()).toEqual(Object.keys(Visualizers).sort())
  })

  it('built-in presets select GPU presets', () => {
    for (const preset of BUILT_IN_PRESETS) {
      const id = preset.visualizer.selectedVisualizer
      expect(glVisualizers[id], `${preset.name} → ${id}`).toBeDefined()
    }
  })

  it('selectVisualizer still accepts classic ids while they exist', () => {
    const store = useVisualizerStore()
    store.selectVisualizer('bars')
    expect(store.selectedVisualizer).toBe('bars')
    store.selectVisualizer('glMandala')
    expect(store.selectedVisualizer).toBe('glMandala')
  })

  it('applying a preset with an unknown visualizer falls back instead of breaking', () => {
    const vizStore = useVisualizerStore()
    const presets = usePresetStore()
    vizStore.selectVisualizer('glBars')
    vizStore.markVisualizerWorking('glBars')
    presets.applyPreset(
      {
        id: 'x',
        visualizer: { mode: 'single', selectedVisualizer: 'removedLongAgo', color: '#fff' },
        background: {},
      },
      null,
    )
    expect(vizStore.selectedVisualizer).toBe('glBars')
  })

  it('applying a multi-layer preset keeps existing ids and drops unknown ones to the fallback', () => {
    const vizStore = useVisualizerStore()
    const presets = usePresetStore()
    vizStore.markVisualizerWorking('glBars')
    presets.applyPreset(
      {
        id: 'y',
        visualizer: {
          mode: 'multi',
          layers: [
            { id: 'l1', visualizerId: 'glFire', visible: true },
            { id: 'l2', visualizerId: 'nope', visible: true },
          ],
        },
        background: {},
      },
      null,
    )
    expect(vizStore.visualizerLayers.map((l) => l.visualizerId)).toEqual(['glFire', 'glBars'])
  })

  describe('reaction source per layer', () => {
    it('new layers default to the spectrum source', () => {
      const store = useVisualizerStore()
      const layer = store.addLayer('glBars')
      expect(layer.reactSource).toBe('spectrum')
      expect(layer.reactStrength).toBe(70)
    })

    it('validates source and clamps strength on layer updates', () => {
      const store = useVisualizerStore()
      const layer = store.addLayer('glBars')
      expect(store.updateLayerProperty(layer.id, 'reactSource', 'allOnset')).toBe(true)
      expect(store.updateLayerProperty(layer.id, 'reactSource', 'bogus')).toBe(false)
      expect(layer.reactSource).toBe('allOnset')
      store.updateLayerProperty(layer.id, 'reactStrength', 250)
      expect(layer.reactStrength).toBe(100)
      store.updateLayerProperty(layer.id, 'reactStrength', -5)
      expect(layer.reactStrength).toBe(0)
    })

    it('syncs the source between single mode and the active layer', () => {
      const store = useVisualizerStore()
      store.setReactSource('bassOnset')
      store.setReactStrength(40)
      store.setMultiLayerMode(true)
      expect(store.activeLayer.reactSource).toBe('bassOnset')
      expect(store.activeLayer.reactStrength).toBe(40)
      store.updateLayerProperty(store.activeLayer.id, 'reactSource', 'treble')
      store.syncSingleModeFromLayer()
      expect(store.reactSource).toBe('treble')
    })

    it('round-trips the single-mode source through presets', () => {
      const vizStore = useVisualizerStore()
      const presets = usePresetStore()
      vizStore.setReactSource('midOnset')
      vizStore.setReactStrength(55)
      const preset = presets.saveCurrentAsPreset('react', null)
      expect(preset.visualizer.reactSource).toBe('midOnset')
      vizStore.setReactSource('spectrum')
      presets.applyPreset(preset, null)
      expect(vizStore.reactSource).toBe('midOnset')
      expect(vizStore.reactStrength).toBe(55)
    })
  })
})
