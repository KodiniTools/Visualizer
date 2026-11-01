import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick, toRaw } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TextManagerPanel from '../../components/TextManagerPanel.vue'
import { TextManager } from '../../lib/textManager.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'

// Canvas-Manager-Attrappe mit echtem TextManager; unbekannte Methoden → vi.fn().
function canvasManagerStub(tm) {
  const base = {
    canvas: { width: 960, height: 540 },
    activeObject: null,
    selectedObjects: [],
    textManager: tm,
    onSelectionChanged: () => {},
    setActiveObject(obj) {
      this.activeObject = obj
    },
    clearMultiSelection() {
      this.selectedObjects = []
    },
    isInMultiSelection(obj) {
      return this.selectedObjects.includes(obj)
    },
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

let wrapper
let tm
let cm
let a
let b

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  tm = new TextManager({})
  a = tm.add('Auf dem Canvas')
  b = tm.add('Snovi moji')
  a.id = 1
  b.id = 2
  tm.removeFromCanvas(b)
  cm = ref(canvasManagerStub(tm))
  wrapper = mount(TextManagerPanel, {
    global: {
      provide: { canvasManager: cm, fontManager: ref(null) },
      stubs: { VisualizerImagePicker: true },
    },
  })
  // Verzeichnis nach dem Mount einlesen (wie nach einer Auswahl-Änderung)
  cm.value.activeObject = a
  await nextTick()
  cm.value.activeObject = null
  await nextTick()
})

afterEach(() => wrapper?.unmount())

const rows = () => wrapper.findAll('.text-row')

describe('TextManagerPanel – Text-Verzeichnis', () => {
  it('listet vom Canvas entfernte Texte weiter auf', () => {
    expect(rows()).toHaveLength(2)
    expect(rows()[1].find('.off-canvas-badge').exists()).toBe(true)
  })

  it('holt einen entfernten Text zurück auf den Canvas und markiert ihn', async () => {
    await rows()[1].find('[data-test="return-to-canvas"]').trigger('click')
    expect(b.offCanvas).toBe(false)
    expect(toRaw(cm.value.activeObject)).toBe(b)
    expect(rows()[1].find('.off-canvas-badge').exists()).toBe(false)
  })

  it('löscht endgültig und setzt Marker-Referenzen zurück', async () => {
    const markers = useBeatMarkerStore()
    const m = markers.addMarker(3, { textId: b.id, textLabel: 'Snovi moji' })
    await rows()[1].find('[data-test="delete-from-directory"]').trigger('click')
    expect(tm.textObjects).toEqual([a])
    expect(markers.markers.find((x) => x.id === m.id).action.textId).toBeNull()
    expect(rows()).toHaveLength(1)
  })

  it('hebt die Markierung auf, wenn der markierte Text endgültig gelöscht wird', async () => {
    cm.value.activeObject = a
    await nextTick()
    await rows()[0].find('[data-test="delete-from-directory"]').trigger('click')
    expect(cm.value.activeObject).toBeNull()
    expect(tm.textObjects).toEqual([b])
  })
})
