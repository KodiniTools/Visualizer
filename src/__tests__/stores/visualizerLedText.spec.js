// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { usePresetStore } from '../../stores/presetStore.js'
import { useLayerPresetStore } from '../../stores/layerPresetStore.js'
import { DEFAULT_LED_CONFIG } from '../../lib/visualizers/gl/ledTextSettings.js'

describe('LED-Text / LED-Zahlen im Visualizer-Store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('listet LED-Text und LED-Zahlen vorne in ihren LED-Sektionen', () => {
    const store = useVisualizerStore()
    expect(store.categorizedVisualizers['LED-Buchstaben'][0].id).toBe('glLedText')
    expect(store.categorizedVisualizers['LED-Ziffern'][0].id).toBe('glLedNumber')
    store.selectVisualizer('glLedNumber')
    expect(store.selectedVisualizer).toBe('glLedNumber')
  })

  it('validiert die Felder im Single-Modus', () => {
    const store = useVisualizerStore()
    expect(store.ledConfig).toEqual(DEFAULT_LED_CONFIG)
    store.setLedConfig('ledText', 'a\nb\nc\nd\ne')
    store.setLedConfig('ledNumberMode', 'clock')
    store.setLedConfig('ledNumberTimeZone', 'Nowhere')
    expect(store.setLedConfig('bogus', 1)).toBe(false)
    expect(store.ledText).toBe('a\nb\nc\nd')
    expect(store.ledNumberMode).toBe('clock')
    expect(store.ledNumberTimeZone).toBe('')
  })

  it('neue Layer haben die Standardwerte, Änderungen werden validiert', () => {
    const store = useVisualizerStore()
    const layer = store.addLayer('glLedNumber')
    expect(layer).toMatchObject(DEFAULT_LED_CONFIG)
    expect(store.updateLayerProperty(layer.id, 'ledNumberMode', 'countdown')).toBe(true)
    store.updateLayerProperty(layer.id, 'ledNumberMode', 'nope')
    expect(layer.ledNumberMode).toBe('text')
    store.updateLayerProperty(layer.id, 'ledCountdownTarget', '2027-01-01T00:00:00Z')
    expect(layer.ledCountdownTarget).toBe('2027-01-01T00:00:00.000Z')
    const copy = store.duplicateLayer(layer.id)
    expect(copy.ledCountdownTarget).toBe('2027-01-01T00:00:00.000Z')
  })

  it('synchronisiert zwischen Single-Modus und aktivem Layer', () => {
    const store = useVisualizerStore()
    store.selectVisualizer('glLedText')
    store.setLedConfig('ledText', 'PARTY')
    store.setMultiLayerMode(true)
    expect(store.activeLayer.ledText).toBe('PARTY')
    store.updateLayer(store.activeLayer.id, { ledText: 'HELLO WORLD', ledNumberSeconds: false })
    store.syncSingleModeFromLayer()
    expect(store.ledText).toBe('HELLO WORLD')
    expect(store.ledNumberSeconds).toBe(false)
    // Layer ohne die Felder (älteres Preset) → Standardwerte
    delete store.activeLayer.ledText
    store.syncSingleModeFromLayer()
    expect(store.ledText).toBe(DEFAULT_LED_CONFIG.ledText)
  })

  it('speichert und lädt die LED-Felder in Single-Presets', () => {
    const vizStore = useVisualizerStore()
    const presets = usePresetStore()
    vizStore.selectVisualizer('glLedNumber')
    vizStore.setLedConfig('ledNumberMode', 'countdown')
    vizStore.setLedConfig('ledCountdownTarget', '2026-12-31T23:00:00Z')
    const preset = presets.saveCurrentAsPreset('led', null)
    expect(preset.visualizer.ledNumberMode).toBe('countdown')
    vizStore.applyLedConfig({})
    presets.applyPreset(preset, null)
    expect(vizStore.ledNumberMode).toBe('countdown')
    expect(vizStore.ledCountdownTarget).toBe('2026-12-31T23:00:00.000Z')

    // Älteres Preset ohne die Felder → Standardwerte statt alter Werte
    const legacy = JSON.parse(JSON.stringify(preset))
    delete legacy.visualizer.ledNumberMode
    delete legacy.visualizer.ledCountdownTarget
    presets.applyPreset(legacy, null)
    expect(vizStore.ledNumberMode).toBe('text')
    expect(vizStore.ledCountdownTarget).toBe('')
  })

  it('übernimmt die LED-Felder je Layer in Multi- und Layer-Presets', () => {
    const vizStore = useVisualizerStore()
    const presets = usePresetStore()
    const layerPresets = useLayerPresetStore()
    const layer = vizStore.addLayer('glLedText')
    vizStore.updateLayerProperty(layer.id, 'ledText', 'LIVE')

    const saved = layerPresets.saveCurrentLayersAsPreset('LED')
    expect(saved.layers[0].ledText).toBe('LIVE')
    vizStore.clearAllLayers()
    layerPresets.applyLayerPreset(saved)
    expect(vizStore.visualizerLayers[0].ledText).toBe('LIVE')
    expect(layerPresets.isLayerPresetActive(saved)).toBe(true)

    presets.applyPreset(
      {
        id: 'legacy',
        visualizer: { mode: 'multi', layers: [{ id: 'l1', visualizerId: 'glLedNumber' }] },
        background: {},
      },
      null,
    )
    expect(vizStore.visualizerLayers[0]).toMatchObject(DEFAULT_LED_CONFIG)
  })
})
