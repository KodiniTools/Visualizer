import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VideoPopover from '../../components/sticky-player-bar/VideoPopover.vue'
import { useVideoPanel } from '../../composables/useVideoPanel.js'

// Attrappen für Canvas- und Video-Manager; unbekannte Zugriffe liefern eine
// leere Mock-Funktion, Vue-interne Flags bleiben unangetastet.
function managerStub(extra = {}) {
  const base = { canvas: { width: 960, height: 540 }, redrawCallback: vi.fn(), ...extra }
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

// Bildet die Sticky-Player-Bar nach: sie erzeugt den Video-Zustand und zeigt
// das Popover nur bei Bedarf (v-if) – genau wie in der echten App.
const BarStub = defineComponent({
  components: { VideoPopover },
  provide() {
    return {
      videoPanel: this.vp,
      playerBar: {
        popover: { closePopover: this.closePopover, cascadeOffset: () => ({ x: 0, y: 0 }) },
      },
    }
  },
  props: { open: { type: Boolean, default: true } },
  setup() {
    return { vp: useVideoPanel(), closePopover: vi.fn() }
  },
  template: '<div><VideoPopover v-if="open" /></div>',
})

let wrapper

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  wrapper = mount(BarStub, {
    attachTo: document.body,
    global: {
      provide: {
        canvasManager: ref(managerStub()),
        videoManager: ref(managerStub({ getAllVideos: () => [] })),
      },
    },
  })
})

afterEach(() => wrapper?.unmount())

describe('VideoPopover', () => {
  it('zeigt die Video-Sektion in einem verschieb- und größenveränderbaren Popover', () => {
    const pop = wrapper.find('.spb-popover-video')
    expect(pop.exists()).toBe(true)
    expect(pop.find('.video-panel-wrapper').exists()).toBe(true)
    expect(pop.element.querySelectorAll('.spb-resize-handle')).toHaveLength(5)
    expect(pop.find('.spb-popover-header .section-label').text()).toBe('Video')
  })

  it('schließt sich über den Schließen-Knopf unter eigenem Namen', async () => {
    await wrapper.find('.spb-popover-close').trigger('click')
    expect(wrapper.vm.closePopover).toHaveBeenCalledWith('video')
  })

  it('behält hochgeladene Videos und Einstellungen über Schließen und Öffnen', async () => {
    const vp = wrapper.vm.vp
    vp.videoGallery.value.push({ name: 'clip.mp4', url: 'blob:test' })
    vp.videoScale.value = 5
    vp.videoMuted.value = true
    await nextTick()

    await wrapper.setProps({ open: false })
    await nextTick()
    expect(wrapper.find('.spb-popover-video').exists()).toBe(false)

    await wrapper.setProps({ open: true })
    await nextTick()
    expect(wrapper.vm.vp.videoGallery.value).toHaveLength(1)
    expect(wrapper.vm.vp.videoGallery.value[0].name).toBe('clip.mp4')
    expect(wrapper.vm.vp.videoScale.value).toBe(5)
    expect(wrapper.vm.vp.videoMuted.value).toBe(true)
    expect(wrapper.find('.spb-popover-video .video-panel-wrapper').exists()).toBe(true)
  })
})
