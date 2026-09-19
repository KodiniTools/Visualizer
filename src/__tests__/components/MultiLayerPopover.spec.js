import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MultiLayerPopover from '../../components/sticky-player-bar/MultiLayerPopover.vue'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

let wrapper
let closePopover

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  closePopover = vi.fn()
  wrapper = mount(MultiLayerPopover, {
    attachTo: document.body,
    global: {
      provide: {
        playerBar: {
          popover: { closePopover, cascadeOffset: () => ({ x: 0, y: 0 }) },
        },
      },
      stubs: { VisualizerImagePicker: true },
    },
  })
})

afterEach(() => wrapper?.unmount())

describe('MultiLayerPopover', () => {
  it('rendert das Multi-Layer-Panel in einem verschieb- und größenveränderbaren Popover', () => {
    expect(wrapper.find('.spb-popover-multilayer').exists()).toBe(true)
    expect(wrapper.find('.layer-panel').exists()).toBe(true)
    // Kopfzeile dient als Ziehgriff, Griffe kommen aus v-popover-drag
    expect(wrapper.find('.spb-popover-header').exists()).toBe(true)
    expect(wrapper.element.querySelectorAll('.spb-resize-handle')).toHaveLength(5)
  })

  it('schließt sich über den Schließen-Knopf unter eigenem Namen', async () => {
    await wrapper.find('.spb-popover-close').trigger('click')
    expect(closePopover).toHaveBeenCalledWith('multiLayer')
  })

  it('bedient den Store: Multi-Layer einschalten und Layer hinzufügen', async () => {
    const store = useVisualizerStore()
    expect(store.multiLayerMode).toBe(false)

    await wrapper.find('.toggle-btn').trigger('click')
    expect(store.multiLayerMode).toBe(true)
    expect(store.visualizerLayers).toHaveLength(1)

    await wrapper.find('.add-layer-btn').trigger('click')
    expect(store.visualizerLayers).toHaveLength(2)
    expect(wrapper.findAll('.layer-item')).toHaveLength(2)
  })
})
