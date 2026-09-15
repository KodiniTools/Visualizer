import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  useLayerPresetStore,
  toLayerPresetRef,
  parseLayerPresetRef,
  LAYER_PRESET_PREFIX,
} from '../../stores/layerPresetStore.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

let store
let viz

function setupTwoLayers() {
  viz.addLayer('bars', { color: '#111111', opacity: 0.8 })
  viz.addLayer('waveform', { color: '#222222', x: 0.3, blendMode: 'screen', reactSource: 'bass' })
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  viz = useVisualizerStore()
  store = useLayerPresetStore()
})

describe('layerPresetStore – Referenzen', () => {
  it('baut und parst Referenzen für Auswahlfelder', () => {
    expect(toLayerPresetRef('abc')).toBe(`${LAYER_PRESET_PREFIX}abc`)
    expect(parseLayerPresetRef('layerpreset:abc')).toBe('abc')
    expect(parseLayerPresetRef('glNeonGrid')).toBeNull()
    expect(parseLayerPresetRef('layerpreset:')).toBeNull()
    expect(parseLayerPresetRef(null)).toBeNull()
  })
})

describe('layerPresetStore – speichern', () => {
  it('liefert null ohne Layer', () => {
    expect(store.saveCurrentLayersAsPreset('X')).toBeNull()
    expect(store.layerPresets).toHaveLength(0)
  })

  it('speichert einen Snapshot der Layer ohne Laufzeit-IDs und mit Standardname', () => {
    setupTwoLayers()
    const preset = store.saveCurrentLayersAsPreset('   ')
    expect(preset.name).toBe('Layer-Preset 1')
    expect(preset.layers).toHaveLength(2)
    expect(preset.layers[0]).not.toHaveProperty('id')
    expect(preset.layers[0]).toMatchObject({ visualizerId: 'bars', color: '#111111', opacity: 0.8 })
    expect(preset.layers[1]).toMatchObject({
      visualizerId: 'waveform',
      x: 0.3,
      blendMode: 'screen',
      reactSource: 'bass',
    })
    // Neueste zuerst
    store.saveCurrentLayersAsPreset('Zweites')
    expect(store.layerPresets.map((p) => p.name)).toEqual(['Zweites', 'Layer-Preset 1'])
  })

  it('persistiert in localStorage und lädt beim nächsten Store neu', () => {
    setupTwoLayers()
    const saved = store.saveCurrentLayersAsPreset('Drop-Set')
    expect(JSON.parse(localStorage.getItem('visualizer-layer-presets'))).toHaveLength(1)

    setActivePinia(createPinia())
    const fresh = useLayerPresetStore()
    expect(fresh.layerPresets).toHaveLength(1)
    expect(fresh.findLayerPreset(saved.id)?.name).toBe('Drop-Set')
  })

  it('ignoriert kaputte Daten im localStorage', () => {
    localStorage.setItem('visualizer-layer-presets', '{not json')
    setActivePinia(createPinia())
    expect(useLayerPresetStore().layerPresets).toEqual([])
    localStorage.setItem(
      'visualizer-layer-presets',
      JSON.stringify([{ id: 1 }, { id: 'ok', layers: [] }]),
    )
    setActivePinia(createPinia())
    expect(useLayerPresetStore().layerPresets).toEqual([{ id: 'ok', layers: [] }])
  })
})

describe('layerPresetStore – anwenden', () => {
  it('schaltet Multi-Layer ein und ersetzt die Layer mit frischen IDs', () => {
    setupTwoLayers()
    const preset = store.saveCurrentLayersAsPreset('Set')
    viz.clearAllLayers()
    expect(viz.multiLayerMode).toBe(false)

    expect(store.applyLayerPreset(preset)).toBe(true)
    expect(viz.multiLayerMode).toBe(true)
    expect(viz.showVisualizer).toBe(true)
    expect(viz.visualizerLayers).toHaveLength(2)
    expect(viz.visualizerLayers.map((l) => l.visualizerId)).toEqual(['bars', 'waveform'])
    expect(viz.activeLayerId).toBe(viz.visualizerLayers[0].id)
    const ids = viz.visualizerLayers.map((l) => l.id)
    expect(new Set(ids).size).toBe(2)
    expect(store.isLayerPresetActive(preset)).toBe(true)
  })

  it('akzeptiert ID und Referenz und liefert false bei Unbekanntem', () => {
    setupTwoLayers()
    const preset = store.saveCurrentLayersAsPreset('Set')
    viz.clearAllLayers()
    expect(store.applyLayerPreset(preset.id)).toBe(true)
    viz.clearAllLayers()
    expect(store.applyLayerPreset(toLayerPresetRef(preset.id))).toBe(true)
    expect(store.applyLayerPreset('layerpreset:gibt-es-nicht')).toBe(false)
    expect(store.applyLayerPreset({ id: 'x', layers: [] })).toBe(false)
  })

  it('ersetzt unbekannte Visualizer-IDs durch den letzten funktionierenden', () => {
    const ok = store.applyLayerPreset({
      id: 'p',
      name: 'Alt',
      layers: [{ visualizerId: 'gibt-es-nicht', color: '#ffffff' }],
    })
    expect(ok).toBe(true)
    expect(viz.visualizerLayers[0].visualizerId).toBe(viz.lastWorkingVisualizer)
  })

  it('isLayerPresetActive erkennt Abweichungen', () => {
    setupTwoLayers()
    const preset = store.saveCurrentLayersAsPreset('Set')
    expect(store.isLayerPresetActive(preset)).toBe(true)
    viz.updateLayerProperty(viz.visualizerLayers[0].id, 'opacity', 0.5)
    expect(store.isLayerPresetActive(preset)).toBe(false)
    viz.multiLayerMode = false
    expect(store.isLayerPresetActive(preset)).toBe(false)
  })
})

describe('layerPresetStore – löschen/umbenennen', () => {
  it('löscht und benennt um, mit Persistenz', () => {
    setupTwoLayers()
    const a = store.saveCurrentLayersAsPreset('A')
    const b = store.saveCurrentLayersAsPreset('B')
    expect(store.renameLayerPreset(a.id, 'A2')).toBe(true)
    expect(store.renameLayerPreset(a.id, '  ')).toBe(false)
    store.deleteLayerPreset(b.id)
    expect(store.layerPresets.map((p) => p.name)).toEqual(['A2'])
    expect(JSON.parse(localStorage.getItem('visualizer-layer-presets')).map((p) => p.name)).toEqual(
      ['A2'],
    )
  })
})
