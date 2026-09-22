import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VisualizerLayerPanel from '../../components/VisualizerLayerPanel.vue'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { useLayerPresetStore } from '../../stores/layerPresetStore.js'

let wrapper
let viz
let presets

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  viz = useVisualizerStore()
  presets = useLayerPresetStore()
  viz.setMultiLayerMode(true)
  wrapper = mount(VisualizerLayerPanel, {
    global: { stubs: { VisualizerImagePicker: true } },
  })
})

afterEach(() => wrapper?.unmount())

describe('VisualizerLayerPanel – Effekte pro Layer', () => {
  it('zeigt für den aktiven Layer einen eigenen Effekte-Bereich', async () => {
    const item = wrapper.find('.layer-item')
    expect(item.exists()).toBe(true)
    const fx = item.find('.layer-effects')
    expect(fx.exists()).toBe(true)
    expect(fx.find('.layer-effects-title').text()).toBe('Effekte dieses Layers')
    // Das eingebettete Panel blendet Überschrift und Adaptive Qualität aus
    expect(fx.find('.fx-header').exists()).toBe(false)
    expect(fx.text()).not.toContain('Adaptive')
  })

  it('schaltet einen Effekt nur für diesen Layer um', async () => {
    const layerId = viz.visualizerLayers[0].id
    const globalBloom = viz.bloomEnabled

    const toggle = wrapper.find('.layer-effects .fx-toggle input[type="checkbox"]')
    await toggle.setValue(!viz.layerEffects(viz.visualizerLayers[0]).bloomEnabled)

    expect(viz.layerEffects(viz.visualizerLayers[0]).bloomEnabled).toBe(true)
    expect(viz.bloomEnabled).toBe(globalBloom)
  })

  it('zählt aktive Effekte und setzt sie zurück', async () => {
    const layerId = viz.visualizerLayers[0].id
    viz.updateLayerEffect(layerId, 'bloomEnabled', true)
    viz.updateLayerEffect(layerId, 'trailsEnabled', true)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.layer-effects-count').text()).toBe('2')

    await wrapper.find('.layer-effects-reset').trigger('click')
    expect(viz.layerEffects(viz.visualizerLayers[0]).bloomEnabled).toBe(false)
    expect(wrapper.find('.layer-effects-count').exists()).toBe(false)
  })
})

describe('VisualizerLayerPanel – Preset speichern', () => {
  it('speichert die aktuellen Layer mit Namen und zeigt sie in der Liste', async () => {
    expect(wrapper.find('.layer-presets').exists()).toBe(true)
    expect(wrapper.find('.no-presets').exists()).toBe(true)

    await wrapper.find('.preset-name-input').setValue('Mein Set')
    await wrapper.find('.save-preset-btn').trigger('click')

    expect(presets.layerPresets).toHaveLength(1)
    expect(presets.layerPresets[0].name).toBe('Mein Set')
    expect(presets.layerPresets[0].layers).toHaveLength(viz.visualizerLayers.length)
    expect(wrapper.find('.preset-name-input').element.value).toBe('')
    expect(wrapper.find('.preset-item .preset-name').text()).toBe('Mein Set')
    // Gerade gespeichert → entspricht den aktuellen Layern → aktiv markiert
    expect(wrapper.find('.preset-item').classes()).toContain('active')
  })

  it('Enter im Namensfeld speichert ebenfalls', async () => {
    await wrapper.find('.preset-name-input').setValue('Enter-Set')
    await wrapper.find('.preset-name-input').trigger('keyup.enter')
    expect(presets.layerPresets.map((p) => p.name)).toEqual(['Enter-Set'])
  })

  it('wendet ein Preset per Klick an und löscht nach Bestätigung', async () => {
    presets.saveCurrentLayersAsPreset('Set A')
    viz.addLayer('waveform')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.preset-item').classes()).not.toContain('active')

    await wrapper.find('.preset-apply-btn').trigger('click')
    expect(viz.visualizerLayers).toHaveLength(1)
    expect(wrapper.find('.preset-item').classes()).toContain('active')

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await wrapper.find('.preset-delete-btn').trigger('click')
    expect(presets.layerPresets).toHaveLength(1)
    confirmSpy.mockReturnValue(true)
    await wrapper.find('.preset-delete-btn').trigger('click')
    expect(presets.layerPresets).toHaveLength(0)
    confirmSpy.mockRestore()
  })
})
