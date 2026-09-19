import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EffectsPopover from '../../components/sticky-player-bar/EffectsPopover.vue'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

let wrapper
let closePopover

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  closePopover = vi.fn()
  wrapper = mount(EffectsPopover, {
    attachTo: document.body,
    global: {
      provide: {
        playerBar: {
          popover: { closePopover, cascadeOffset: () => ({ x: 0, y: 0 }) },
        },
      },
    },
  })
})

afterEach(() => wrapper?.unmount())

describe('EffectsPopover', () => {
  it('rendert das Effekte-Panel in einem verschieb- und größenveränderbaren Popover', () => {
    expect(wrapper.find('.spb-popover-effects').exists()).toBe(true)
    expect(wrapper.find('.fx-section').exists()).toBe(true)
    expect(wrapper.find('.spb-popover-header').exists()).toBe(true)
    expect(wrapper.element.querySelectorAll('.spb-resize-handle')).toHaveLength(5)
    // Der Popover-Kopf trägt den Titel. Die Panel-Überschrift bleibt im DOM,
    // wird aber per CSS ausgeblendet (jsdom wertet scoped CSS nicht aus).
    expect(wrapper.find('.spb-popover-header .section-label').text()).toBe(
      'Effekte (Post-Processing)',
    )
    expect(wrapper.find('.fx-header').exists()).toBe(true)
  })

  it('schließt sich über den Schließen-Knopf unter eigenem Namen', async () => {
    await wrapper.find('.spb-popover-close').trigger('click')
    expect(closePopover).toHaveBeenCalledWith('effects')
  })

  it('schaltet Post-Processing-Optionen im Store um', async () => {
    const store = useVisualizerStore()
    const before = store.bloomEnabled

    const bloom = wrapper.findAll('.fx-toggle input[type="checkbox"]')[0]
    await bloom.setValue(!before)
    expect(store.bloomEnabled).toBe(!before)
  })
})
