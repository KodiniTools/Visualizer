import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TextManagerPopover from '../../components/sticky-player-bar/TextManagerPopover.vue'

// Canvas-Manager-Attrappe; unbekannte Methoden liefern eine leere Mock-Funktion.
function canvasManagerStub() {
  const selectionListeners = []
  const base = {
    canvas: { width: 960, height: 540 },
    activeObject: null,
    textManager: { textObjects: [] },
    selectionListeners,
    onSelectionChanged: (cb) => selectionListeners.push(cb),
    redrawCallback: vi.fn(),
  }
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (typeof prop === 'symbol') return undefined
      if (String(prop).startsWith('__v_')) return undefined
      target[prop] = vi.fn()
      return target[prop]
    },
    set(target, prop, value) {
      target[prop] = value
      return true
    },
  })
}

// Bildet die Sticky-Player-Bar nach: das Popover bleibt gemountet und wird
// per v-show ein-/ausgeblendet – genau wie in der echten App.
const BarStub = defineComponent({
  components: { TextManagerPopover },
  provide() {
    return {
      playerBar: {
        popover: { closePopover: this.closePopover, cascadeOffset: () => ({ x: 0, y: 0 }) },
      },
    }
  },
  props: { open: { type: Boolean, default: true } },
  setup() {
    return { closePopover: vi.fn() }
  },
  template: '<div><TextManagerPopover v-show="open" /></div>',
})

let wrapper
let canvasManager

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  canvasManager = ref(canvasManagerStub())
  wrapper = mount(BarStub, {
    attachTo: document.body,
    global: {
      provide: { canvasManager, fontManager: ref(null) },
      stubs: { VisualizerImagePicker: true },
    },
  })
})

afterEach(() => wrapper?.unmount())

describe('TextManagerPopover', () => {
  it('zeigt den Text-Manager in einem verschieb- und größenveränderbaren Popover', () => {
    const pop = wrapper.find('.spb-popover-textmanager')
    expect(pop.exists()).toBe(true)
    expect(pop.find('.panel').exists()).toBe(true)
    expect(pop.element.querySelectorAll('.spb-resize-handle')).toHaveLength(5)
    expect(pop.find('.spb-popover-header .section-label').text()).toBe('Text-Manager')
  })

  it('schließt sich über den Schließen-Knopf unter eigenem Namen', async () => {
    await wrapper.find('.spb-popover-close').trigger('click')
    expect(wrapper.vm.closePopover).toHaveBeenCalledWith('textManager')
  })

  it('registriert die Auswahl-Rückmeldung genau einmal', () => {
    expect(canvasManager.value.selectionListeners).toHaveLength(1)
  })

  it('bleibt beim Ausblenden gemountet: Listener und Zustand überleben', async () => {
    const listenerSpy = vi.spyOn(window, 'removeEventListener')

    await wrapper.setProps({ open: false })
    await nextTick()

    // Nur versteckt, nicht abgebaut – Panel und Listener bleiben bestehen.
    expect(wrapper.find('.spb-popover-textmanager').exists()).toBe(true)
    expect(wrapper.find('.spb-popover-textmanager .panel').exists()).toBe(true)
    expect(canvasManager.value.selectionListeners).toHaveLength(1)
    expect(listenerSpy.mock.calls.some(([type]) => type === 'openTextEditorWithChar')).toBe(false)

    await wrapper.setProps({ open: true })
    await nextTick()
    expect(canvasManager.value.selectionListeners).toHaveLength(1)
    listenerSpy.mockRestore()
  })
})
