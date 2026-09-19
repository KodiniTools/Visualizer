import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CanvasControlPopover from '../../components/sticky-player-bar/CanvasControlPopover.vue'
import { useBgSettings } from '../../composables/useBgSettings.js'
import { useBackgroundBridgeStore } from '../../stores/backgroundBridgeStore.js'

// Canvas-Manager-Attrappe. Das Hintergrund-Composable ruft viele Methoden auf;
// unbekannte Zugriffe liefern daher automatisch eine leere Mock-Funktion.
function canvasManagerStub() {
  const base = {
    canvas: { width: 960, height: 540 },
    background: 'rgba(255, 255, 255, 1)',
    backgroundImage: null,
    redrawCallback: vi.fn(),
  }
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (typeof prop === 'symbol') return undefined
      target[prop] = vi.fn()
      return target[prop]
    },
  })
}

// Bildet die Sticky-Player-Bar nach: sie erzeugt den Hintergrund-Zustand und
// zeigt das Popover nur bei Bedarf (v-if) – genau wie in der echten App.
const BarStub = defineComponent({
  components: { CanvasControlPopover },
  provide() {
    return {
      bgSettings: this.bg,
      playerBar: {
        popover: { closePopover: this.closePopover, cascadeOffset: () => ({ x: 0, y: 0 }) },
      },
    }
  },
  props: { open: { type: Boolean, default: true } },
  setup() {
    return { bg: useBgSettings(), closePopover: vi.fn() }
  },
  template: '<div><CanvasControlPopover v-if="open" /></div>',
})

let wrapper
let canvasManager

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  canvasManager = ref(canvasManagerStub())
  wrapper = mount(BarStub, {
    attachTo: document.body,
    global: { provide: { canvasManager } },
  })
})

afterEach(() => wrapper?.unmount())

describe('CanvasControlPopover', () => {
  it('zeigt die Canvas-Steuerung in einem verschieb- und größenveränderbaren Popover', () => {
    const pop = wrapper.find('.spb-popover-canvascontrol')
    expect(pop.exists()).toBe(true)
    expect(pop.find('.panel').exists()).toBe(true)
    expect(pop.element.querySelectorAll('.spb-resize-handle')).toHaveLength(5)
    expect(pop.find('.spb-popover-header .section-label').text()).toBe('Canvas-Steuerung')
  })

  it('schließt sich über den Schließen-Knopf unter eigenem Namen', async () => {
    await wrapper.find('.spb-popover-close').trigger('click')
    expect(wrapper.vm.closePopover).toHaveBeenCalledWith('canvasControl')
  })

  it('hält die Hintergrund-Bridge auch bei geschlossenem Popover nutzbar', async () => {
    const bridge = useBackgroundBridgeStore()
    const snapshotWhileOpen = bridge.captureSnapshot()
    expect(snapshotWhileOpen).toBeTruthy()

    await wrapper.setProps({ open: false })
    await nextTick()
    expect(wrapper.find('.spb-popover-canvascontrol').exists()).toBe(false)

    // Die Bridge gehört der Leiste, nicht dem Popover – sie liefert weiterhin.
    expect(bridge.captureSnapshot()).toBeTruthy()
  })

  it('behält den Hintergrund-Zustand über Schließen und erneutes Öffnen', async () => {
    wrapper.vm.bg.backgroundColor = '#123456'
    wrapper.vm.bg.gradientEnabled = true
    await nextTick()

    await wrapper.setProps({ open: false })
    await nextTick()
    await wrapper.setProps({ open: true })
    await nextTick()

    expect(wrapper.vm.bg.backgroundColor).toBe('#123456')
    expect(wrapper.vm.bg.gradientEnabled).toBe(true)
    expect(wrapper.find('.spb-popover-canvascontrol .panel').exists()).toBe(true)
  })
})
