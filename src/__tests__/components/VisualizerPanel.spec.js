import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VisualizerPanel from '../../components/VisualizerPanel.vue'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { useLayerPresetStore } from '../../stores/layerPresetStore.js'

// Schwere Nachbar-Panels und das Bild-Picker-Widget werden gestubbt; getestet
// wird das Zusammenspiel von VisualizerPanel mit seinen Sektionen.
const stubs = {
  HelpTooltip: true,
  VisualizerImagePicker: true,
}

let wrapper
let store

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  store = useVisualizerStore()
  wrapper = mount(VisualizerPanel, { global: { stubs } })
})

afterEach(() => wrapper?.unmount())

describe('VisualizerPanel (aufgeteilt in Sektionen)', () => {
  it('rendert alle Sektionen im festen und im scrollbaren Bereich', () => {
    const fixed = wrapper.find('.panel-fixed')
    expect(fixed.find('.switch').exists()).toBe(true)
    expect(fixed.find('.color-swatch').exists()).toBe(true)
    expect(fixed.find('.intensity-slider').exists()).toBe(true)
    expect(fixed.find('.color-slider').exists()).toBe(true)
    expect(fixed.find('.react-select').exists()).toBe(true)
    expect(fixed.find('.position-section').exists()).toBe(true)
    expect(fixed.find('.search-input').exists()).toBe(true)

    const scroll = wrapper.find('.panel-scroll')
    const categories = Object.keys(store.categorizedVisualizers)
    expect(scroll.findAll('.category')).toHaveLength(categories.length)
    expect(scroll.text()).toContain(`(${store.availableVisualizers.length}`)
  })

  it('enthält Multi-Layer und Effekte nicht mehr (eigene Popover)', () => {
    expect(wrapper.find('.layer-panel').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Multi-Layer')
    expect(wrapper.find('.fx-section').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Post-Processing')
  })

  it('schaltet den Visualizer über den Toggle um und zeigt den Status-Hinweis', async () => {
    expect(store.showVisualizer).toBe(true)
    expect(wrapper.find('.status-hint').exists()).toBe(false)

    await wrapper.find('.switch').trigger('click')
    expect(store.showVisualizer).toBe(false)
    expect(wrapper.find('.switch').classes()).not.toContain('on')
    expect(wrapper.find('.status-hint').exists()).toBe(true)
  })

  it('setzt die Reaktionsquelle und blendet die Stärke nur außerhalb von spectrum ein', async () => {
    expect(store.reactSource).toBe('spectrum')
    expect(wrapper.find('.react-slider').exists()).toBe(false)

    const select = wrapper.find('.react-select')
    const other = select.findAll('option').find((o) => o.element.value !== 'spectrum')
    await select.setValue(other.element.value)

    expect(store.reactSource).toBe(other.element.value)
    expect(wrapper.find('.react-slider').exists()).toBe(true)
  })

  it('klappt Kategorien per Klick auf und zu', async () => {
    const headers = wrapper.findAll('.category-header')
    const gpu = headers[0]
    expect(gpu.classes()).toContain('open')

    await gpu.trigger('click')
    expect(gpu.classes()).not.toContain('open')
    expect(wrapper.findAll('.category')[0].attributes('open')).toBeUndefined()
  })

  it('zeigt bei Suche eine Trefferliste statt Kategorien und wählt per Klick aus', async () => {
    const target = store.availableVisualizers.find((v) => v.id !== store.selectedVisualizer)
    await wrapper.find('.search-input').setValue(target.id)

    expect(wrapper.find('.category-list').exists()).toBe(false)
    const hits = wrapper.findAll('.visualizer-buttons .visualizer-btn')
    expect(hits.length).toBeGreaterThan(0)

    const hit = hits.find((b) => b.text() === target.name)
    await hit.trigger('click')
    expect(store.selectedVisualizer).toBe(target.id)
    expect(hit.classes()).toContain('active')
  })

  it('meldet keine Treffer bei unbekanntem Suchbegriff', async () => {
    await wrapper.find('.search-input').setValue('xyz-gibt-es-nicht')
    expect(wrapper.find('.no-results').exists()).toBe(true)
    expect(wrapper.findAll('.visualizer-buttons .visualizer-btn')).toHaveLength(0)
  })

  it('zeigt gespeicherte Layer-Presets als Kategorie "Eigene Presets" und wendet sie an', async () => {
    expect(wrapper.find('.category-presets').exists()).toBe(false)

    const presets = useLayerPresetStore()
    store.addLayer('bars')
    store.addLayer('waveform')
    const preset = presets.saveCurrentLayersAsPreset('Drop-Set')
    store.clearAllLayers()
    await wrapper.vm.$nextTick()

    const category = wrapper.find('.category-presets')
    expect(category.exists()).toBe(true)
    expect(category.find('.category-name').text()).toBe('Eigene Presets')
    expect(category.find('.category-count').text()).toBe('1')

    const btn = category.find('.preset-btn')
    expect(btn.text()).toContain('Drop-Set')
    expect(btn.classes()).not.toContain('active')
    await btn.trigger('click')
    expect(store.multiLayerMode).toBe(true)
    expect(store.visualizerLayers).toHaveLength(2)
    expect(presets.isLayerPresetActive(preset)).toBe(true)
    expect(wrapper.find('.category-presets .preset-btn').classes()).toContain('active')
  })

  it('kehrt vom eigenen Preset per Klick zu einem einzelnen Visualizer zurück', async () => {
    const presets = useLayerPresetStore()
    store.addLayer('bars')
    store.addLayer('waveform')
    const preset = presets.saveCurrentLayersAsPreset('Drop-Set')
    await wrapper.vm.$nextTick()
    expect(store.multiLayerMode).toBe(true)

    // Im Multi-Layer-Modus ist kein einzelner Visualizer als aktiv markiert
    const gpuButtons = wrapper.findAll('.category:not(.category-presets) .visualizer-btn')
    expect(gpuButtons.some((b) => b.classes().includes('active'))).toBe(false)

    const target = gpuButtons.find((b) => b.text() !== '')
    await target.trigger('click')

    expect(store.multiLayerMode).toBe(false)
    expect(target.classes()).toContain('active')
    expect(wrapper.find('.category-presets .preset-btn').classes()).not.toContain('active')
    expect(presets.isLayerPresetActive(preset)).toBe(false)
    // Layer bleiben erhalten: erneutes Anwenden des Presets funktioniert
    await wrapper.find('.category-presets .preset-btn').trigger('click')
    expect(store.multiLayerMode).toBe(true)
    expect(store.visualizerLayers).toHaveLength(2)
  })

  it('findet Layer-Presets auch über die Suche', async () => {
    const presets = useLayerPresetStore()
    store.addLayer('bars')
    presets.saveCurrentLayersAsPreset('Sonnenaufgang')
    store.clearAllLayers()

    await wrapper.find('.search-input').setValue('sonnen')
    const hits = wrapper.findAll('.visualizer-buttons .preset-btn')
    expect(hits).toHaveLength(1)
    expect(hits[0].text()).toContain('Sonnenaufgang')
    expect(wrapper.find('.no-results').exists()).toBe(false)
  })

  it('setzt Position und Größe über den Reset-Button zurück', async () => {
    store.setVisualizerX(0.2)
    store.setVisualizerScale(1.5)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.position-section').text()).toContain('X: 20%')

    await wrapper.find('.reset-btn').trigger('click')
    expect(store.visualizerX).toBe(0.5)
    expect(store.visualizerScale).toBe(1)
  })
})
