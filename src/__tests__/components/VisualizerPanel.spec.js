import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VisualizerPanel from '../../components/VisualizerPanel.vue'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

// Schwere Nachbar-Panels und das Bild-Picker-Widget werden gestubbt; getestet
// wird das Zusammenspiel von VisualizerPanel mit seinen Sektionen.
const stubs = {
  HelpTooltip: true,
  VisualizerEffectsPanel: true,
  VisualizerLayerPanel: true,
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
