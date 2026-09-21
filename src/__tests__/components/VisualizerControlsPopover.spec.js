import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VisualizerControlsPopover from '../../components/sticky-player-bar/VisualizerControlsPopover.vue'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

const stubs = { VisualizerImagePicker: true }

let wrapper
let store
let closePopover

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  store = useVisualizerStore()
  closePopover = vi.fn()
  wrapper = mount(VisualizerControlsPopover, {
    attachTo: document.body,
    global: {
      stubs,
      provide: {
        playerBar: {
          popover: { closePopover, cascadeOffset: () => ({ x: 0, y: 0 }) },
        },
      },
    },
  })
})

afterEach(() => wrapper?.unmount())

describe('VisualizerControlsPopover', () => {
  it('rendert die komplette Steuerung in einem verschieb- und größenveränderbaren Popover', () => {
    expect(wrapper.find('.spb-popover-visualizer-controls').exists()).toBe(true)
    expect(wrapper.find('.spb-popover-header .section-label').text()).toBe('Visualizer-Steuerung')
    expect(wrapper.element.querySelectorAll('.spb-resize-handle')).toHaveLength(5)
    expect(wrapper.find('.switch').exists()).toBe(true)
    expect(wrapper.find('.color-swatch').exists()).toBe(true)
    expect(wrapper.find('.intensity-slider').exists()).toBe(true)
    expect(wrapper.find('.color-slider').exists()).toBe(true)
    expect(wrapper.find('.react-select').exists()).toBe(true)
    expect(wrapper.find('.position-section').exists()).toBe(true)
    // Suche und Liste bleiben im Visualizer-Panel.
    expect(wrapper.find('.search-input').exists()).toBe(false)
  })

  it('schließt sich über den Schließen-Knopf unter eigenem Namen', async () => {
    await wrapper.find('.spb-popover-close').trigger('click')
    expect(closePopover).toHaveBeenCalledWith('visualizerControls')
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

  it('zeigt die Formungs-Regler (wie Audio-Reaktiv beim Bild) nur außerhalb von spectrum', async () => {
    expect(wrapper.find('.react-shape').exists()).toBe(false)

    await wrapper.find('.react-select').setValue('midOnset')
    const shape = wrapper.find('.react-shape')
    expect(shape.exists()).toBe(true)
    expect(shape.findAll('.react-shape__slider')).toHaveLength(4)
    expect(shape.find('.react-shape__select').exists()).toBe(true)
    expect(shape.text()).toContain('Aus') // Beat-Verstärkung aus

    await shape.find('.react-shape__slider--smoothing').setValue(80)
    expect(store.reactSmoothing).toBe(80)
    await shape.find('.react-shape__slider--gain').setValue(150)
    expect(store.reactGain).toBe(150)
    await shape.find('.react-shape__select').setValue('easeOut')
    expect(store.reactEasing).toBe('easeOut')
    await shape.find('.react-shape__slider--beat-boost').setValue(2)
    expect(store.reactBeatBoost).toBe(2)
    expect(shape.text()).toContain('×2.0')
    await shape.find('.react-shape__slider--phase').setValue(90)
    expect(store.reactPhase).toBe(90)

    await wrapper.find('.react-select').setValue('spectrum')
    expect(wrapper.find('.react-shape').exists()).toBe(false)
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

  it('zeigt den Bild-Picker nur für Portrait-Presets', async () => {
    expect(wrapper.findComponent({ name: 'VisualizerImagePicker' }).exists()).toBe(false)
    store.selectVisualizer('glPortraitLed')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'VisualizerImagePicker' }).exists()).toBe(true)
  })
})
