import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TextAudioReactivePopover from '../../components/sticky-player-bar/TextAudioReactivePopover.vue'

// Canvas-Manager-Attrappe; unbekannte Methoden liefern eine leere Mock-Funktion.
function canvasManagerStub(activeObject = null) {
  const base = {
    canvas: { width: 960, height: 540 },
    activeObject,
    textManager: { textObjects: [] },
    redrawCallback: vi.fn(),
  }
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (typeof prop === 'symbol') return undefined
      // Vue-interne Flags (__v_raw, __v_isReactive …) nicht abfangen – sonst
      // hält Vue das Objekt für einen fertigen Proxy und verliert die Reaktivität.
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

function textObject(id = 't1') {
  return { id, type: 'text', content: 'Hallo', opacity: 100 }
}

let wrapper
let canvasManager
let closePopover

function mountPopover(active = null) {
  canvasManager = ref(canvasManagerStub(active))
  closePopover = vi.fn()
  wrapper = mount(TextAudioReactivePopover, {
    attachTo: document.body,
    global: {
      provide: {
        canvasManager,
        playerBar: {
          popover: { closePopover, cascadeOffset: () => ({ x: 0, y: 0 }) },
        },
      },
    },
  })
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

afterEach(() => wrapper?.unmount())

describe('TextAudioReactivePopover', () => {
  it('weist ohne ausgewählten Text auf die Auswahl hin', () => {
    mountPopover(null)
    expect(wrapper.find('.spb-popover-textaudioreactive').exists()).toBe(true)
    expect(wrapper.find('.spb-empty-hint').exists()).toBe(true)
    expect(wrapper.find('.collapsible-section').exists()).toBe(false)
    expect(wrapper.element.querySelectorAll('.spb-resize-handle')).toHaveLength(5)
  })

  it('zeigt das Panel aufgeklappt, sobald ein Text ausgewählt ist', () => {
    mountPopover(textObject())
    expect(wrapper.find('.spb-empty-hint').exists()).toBe(false)
    const details = wrapper.find('details.collapsible-section')
    expect(details.exists()).toBe(true)
    expect(details.attributes('open')).toBeDefined()
  })

  it('folgt dem aktiven Canvas-Objekt, auch ohne das Text-Manager-Panel', async () => {
    mountPopover(null)
    expect(wrapper.find('.spb-empty-hint').exists()).toBe(true)

    canvasManager.value.activeObject = textObject('t2')
    await nextTick()
    expect(wrapper.find('details.collapsible-section').exists()).toBe(true)

    // Ein Nicht-Text-Objekt (z.B. Bild) zählt nicht als Auswahl
    canvasManager.value.activeObject = { id: 'i1', type: 'image' }
    await nextTick()
    expect(wrapper.find('.spb-empty-hint').exists()).toBe(true)
  })

  it('schließt sich über den Schließen-Knopf unter eigenem Namen', async () => {
    mountPopover(textObject())
    await wrapper.find('.spb-popover-close').trigger('click')
    expect(closePopover).toHaveBeenCalledWith('textAudioReactive')
  })
})
