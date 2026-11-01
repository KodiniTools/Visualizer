// @vitest-environment jsdom
/* eslint-disable vue/one-component-per-file -- Stubs der Unterkomponenten */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick, toRaw, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TextManagerPanel from '../../components/TextManagerPanel.vue'
import TextDirectoryPanel from '../../components/text-manager/TextDirectoryPanel.vue'
import { TextManager } from '../../lib/textManager.js'
import { TEXT_SEQUENCE_KEY } from '../../lib/textSequenceSettings.js'
import { historyApplyRevision } from '../../lib/history/historyRecorder.js'

// Verhalten des TextManagerPanels (Auswahl, Reihenwiedergabe, Tastatur-Text,
// Canvas-Maße) – gilt unverändert vor und nach der Aufteilung in Composables.

const populateFontDropdown = vi.fn()
const focus = vi.fn()

const EditStub = defineComponent({
  name: 'TextEditPanel',
  props: {
    selectedText: { type: Object, default: null },
    canvasWidth: { type: Number, default: 0 },
    canvasHeight: { type: Number, default: 0 },
  },
  setup(_, { expose }) {
    const editTextInput = { focus, selectionStart: 0, selectionEnd: 0 }
    expose({ populateFontDropdown, editTextInput })
    return () => h('div', { class: 'edit-stub' })
  },
})
const MultiStub = defineComponent({
  name: 'TextMultiEditPanel',
  props: {
    texts: { type: Array, default: () => [] },
    activeText: { type: Object, default: null },
  },
  emits: ['clear'],
  setup: () => () => h('div', { class: 'multi-stub' }),
})

function canvasManagerStub(tm) {
  return {
    canvas: { width: 960, height: 540 },
    activeObject: null,
    selectedObjects: [],
    textManager: tm,
    onSelectionChanged: vi.fn(),
    setActiveObject(obj) {
      this.activeObject = obj
    },
    clearMultiSelection: vi.fn(function () {
      this.selectedObjects = []
    }),
    isInMultiSelection(obj) {
      return this.selectedObjects.includes(obj)
    },
    addText: vi.fn(function (text) {
      const obj = tm.add(text)
      this.activeObject = obj
      return obj
    }),
    redrawCallback: vi.fn(),
  }
}

let wrapper, tm, cm, a, b, fontManager

function mountPanel() {
  wrapper = mount(TextManagerPanel, {
    attachTo: document.body,
    global: {
      provide: { canvasManager: cm, fontManager },
      stubs: {
        TextEditPanel: EditStub,
        TextMultiEditPanel: MultiStub,
        TextNewForm: true,
        VisualizerImagePicker: true,
      },
    },
  })
}

const directory = () => wrapper.findComponent(TextDirectoryPanel)

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  populateFontDropdown.mockClear()
  focus.mockClear()
  tm = new TextManager({})
  a = tm.add('Erster')
  b = tm.add('Zweiter')
  a.id = 1
  b.id = 2
  cm = ref(canvasManagerStub(tm))
  fontManager = ref({ isInitialized: false })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})

describe('TextManagerPanel – Mount', () => {
  it('meldet sich für Auswahl-Änderungen an und füllt das Verzeichnis', async () => {
    mountPanel()
    await nextTick()
    expect(cm.value.onSelectionChanged).toHaveBeenCalledTimes(1)
    expect(
      directory()
        .props('items')
        .map((i) => i.content),
    ).toEqual(['Erster', 'Zweiter'])
  })

  it('übernimmt einen bereits markierten Text beim Mount', async () => {
    cm.value.activeObject = a
    mountPanel()
    await nextTick()
    expect(toRaw(wrapper.findComponent(EditStub).props('selectedText'))).toBe(a)
  })

  it('reicht die Canvas-Maße weiter und folgt einem neuen Canvas', async () => {
    cm.value.activeObject = a
    mountPanel()
    await nextTick()
    const edit = () => wrapper.findComponent(EditStub)
    expect(edit().props('canvasWidth')).toBe(960)
    expect(edit().props('canvasHeight')).toBe(540)
    cm.value.canvas = { width: 1080, height: 1920 }
    await nextTick()
    expect(edit().props('canvasWidth')).toBe(1080)
    expect(edit().props('canvasHeight')).toBe(1920)
  })

  it('befüllt das Font-Dropdown, sobald der FontManager bereit ist', async () => {
    cm.value.activeObject = a
    mountPanel()
    await nextTick()
    await nextTick()
    populateFontDropdown.mockClear()
    fontManager.value.isInitialized = true
    await nextTick()
    await nextTick()
    expect(populateFontDropdown).toHaveBeenCalled()
  })
})

describe('TextManagerPanel – Auswahl', () => {
  it('ergänzt fehlende Eigenschaften älterer Text-Objekte', async () => {
    mountPanel()
    const old = { id: 9, type: 'text', content: 'alt' }
    cm.value.activeObject = old
    await nextTick()
    expect(old.letterSpacing).toBe(0)
    expect(old.lineHeightMultiplier).toBe(120)
    expect(old.stroke).toEqual({ enabled: false, color: '#000000', width: 2 })
    expect(old.shadow).toEqual({ color: '#000000', blur: 0, offsetX: 0, offsetY: 0 })
    expect(old.animation.type).toBe('none')
    expect(old.animation.typewriter.enabled).toBe(false)
    expect(old.animation._state).toEqual({ startTime: null, isPlaying: false, currentIndex: 0 })
    expect(old.audioReactive).toBeTruthy()
    expect(wrapper.find('.edit-stub').exists()).toBe(true)
  })

  it('lässt vorhandene Werte stehen und ergänzt stroke.enabled', async () => {
    mountPanel()
    const obj = {
      id: 9,
      type: 'text',
      letterSpacing: 3,
      lineHeightMultiplier: 150,
      stroke: { color: '#fff', width: 4 },
    }
    cm.value.activeObject = obj
    await nextTick()
    expect(obj.letterSpacing).toBe(3)
    expect(obj.lineHeightMultiplier).toBe(150)
    expect(obj.stroke).toEqual({ color: '#fff', width: 4, enabled: false })
  })

  it('schließt den Editor bei Auswahl eines Nicht-Textes', async () => {
    mountPanel()
    cm.value.activeObject = a
    await nextTick()
    expect(wrapper.find('.edit-stub').exists()).toBe(true)
    cm.value.activeObject = { type: 'image' }
    await nextTick()
    expect(wrapper.find('.edit-stub').exists()).toBe(false)
  })

  it('zeigt bei Mehrfachauswahl das Multi-Edit-Panel, Leeren hebt alles auf', async () => {
    mountPanel()
    cm.value.activeObject = a
    cm.value.selectedObjects = [a, b]
    await nextTick()
    const multi = wrapper.findComponent(MultiStub)
    expect(multi.exists()).toBe(true)
    expect(multi.props('texts').map(toRaw)).toEqual([a, b])
    expect(toRaw(multi.props('activeText'))).toBe(a)

    multi.vm.$emit('clear')
    await nextTick()
    expect(cm.value.clearMultiSelection).toHaveBeenCalled()
    expect(cm.value.activeObject).toBeNull()
    expect(wrapper.find('.multi-stub').exists()).toBe(false)
    expect(wrapper.find('.edit-stub').exists()).toBe(false)
  })

  it('aktualisiert die Verzeichnis-Vorschau beim Bearbeiten des Inhalts', async () => {
    mountPanel()
    cm.value.activeObject = a
    await nextTick()
    wrapper.findComponent(EditStub).props('selectedText').content = 'Neu  getippt'
    await nextTick()
    await nextTick()
    expect(directory().props('items')[0].content).toBe('Neu getippt')
  })

  it('liest das Verzeichnis nach Undo/Redo neu ein', async () => {
    mountPanel()
    tm.textObjects.splice(1, 1)
    historyApplyRevision.value++
    await nextTick()
    await nextTick()
    expect(directory().props('items')).toHaveLength(1)
  })
})

describe('TextManagerPanel – Verzeichnis-Aktionen', () => {
  it('markiert einen Text, aber keinen vom Canvas entfernten', async () => {
    mountPanel()
    directory().vm.$emit('select', 2)
    expect(toRaw(cm.value.activeObject)).toBe(b)
    tm.removeFromCanvas(a)
    directory().vm.$emit('select', 1)
    expect(toRaw(cm.value.activeObject)).toBe(b)
  })

  it('startet die Animation eines Textes neu', () => {
    a.animation = { type: 'fade', _state: { startTime: 5, isPlaying: true, currentIndex: 3 } }
    mountPanel()
    directory().vm.$emit('restart', 1)
    expect(a.animation._state).toEqual({ startTime: null, isPlaying: false, currentIndex: 0 })
    expect(cm.value.redrawCallback).toHaveBeenCalled()
  })
})

describe('TextManagerPanel – Reihenwiedergabe', () => {
  it('zeigt die Texte nacheinander und stellt die Deckkraft danach wieder her', async () => {
    vi.useFakeTimers()
    a.opacity = 80
    b.opacity = 60
    mountPanel()
    directory().vm.$emit('play-all')
    await nextTick()
    expect(directory().props('sequencePlaying')).toBe(true)
    expect([a.opacity, b.opacity]).toEqual([80, 0])

    vi.advanceTimersByTime(4400) // Standard-Slot 4000 + 400 Puffer
    expect([a.opacity, b.opacity]).toEqual([0, 60])

    vi.advanceTimersByTime(4400)
    await nextTick()
    expect(directory().props('sequencePlaying')).toBe(false)
    expect([a.opacity, b.opacity]).toEqual([80, 60])
  })

  it('richtet sich nach Animationsdauer + Anzeigedauer', () => {
    vi.useFakeTimers()
    a.animation = { type: 'fade', fade: { enabled: true, duration: 1000, displayDuration: 2000 } }
    mountPanel()
    directory().vm.$emit('play-all')
    vi.advanceTimersByTime(3399)
    expect(b.opacity).toBe(0)
    vi.advanceTimersByTime(1)
    expect(b.opacity).toBe(100)
  })

  it('globale Dauer gilt für jeden Text und wird gespeichert', async () => {
    vi.useFakeTimers()
    mountPanel()
    directory().vm.$emit('update:globalDurationEnabled', true)
    directory().vm.$emit('update:globalDuration', 1000)
    await nextTick()
    expect(JSON.parse(localStorage.getItem(TEXT_SEQUENCE_KEY))).toEqual({
      enabled: true,
      duration: 1000,
    })
    directory().vm.$emit('play-all')
    vi.advanceTimersByTime(1399)
    expect(b.opacity).toBe(0)
    vi.advanceTimersByTime(1)
    expect(b.opacity).toBe(100)
  })

  it('Stopp beendet sofort und stellt wieder her', async () => {
    vi.useFakeTimers()
    mountPanel()
    const before = vi.getTimerCount()
    directory().vm.$emit('play-all')
    expect(b.opacity).toBe(0)
    expect(vi.getTimerCount()).toBe(before + 1)
    directory().vm.$emit('stop-all')
    await nextTick()
    expect(b.opacity).toBe(100)
    expect(directory().props('sequencePlaying')).toBe(false)
    vi.advanceTimersByTime(10000) // kein weiterer Schritt der Wiedergabe
    expect([a.opacity, b.opacity]).toEqual([100, 100])
  })

  it('ohne Texte auf dem Canvas startet nichts', async () => {
    tm.removeFromCanvas(a)
    tm.removeFromCanvas(b)
    mountPanel()
    directory().vm.$emit('play-all')
    await nextTick()
    expect(directory().props('sequencePlaying')).toBe(false)
  })

  it('Unmount räumt den Timer auf', () => {
    vi.useFakeTimers()
    mountPanel()
    const before = vi.getTimerCount()
    directory().vm.$emit('play-all')
    expect(vi.getTimerCount()).toBe(before + 1)
    wrapper.unmount()
    wrapper = null
    expect(vi.getTimerCount()).toBe(before)
  })
})

describe('TextManagerPanel – Text per Tastatur', () => {
  it('legt einen Text mit dem getippten Zeichen an und fokussiert den Editor', async () => {
    mountPanel()
    window.dispatchEvent(new CustomEvent('openTextEditorWithChar', { detail: { char: 'H' } }))
    expect(cm.value.addText).toHaveBeenCalledWith('H', expect.objectContaining({ fontSize: 48 }))
    await nextTick()
    await nextTick()
    expect(wrapper.find('.edit-stub').exists()).toBe(true)
    expect(focus).toHaveBeenCalled()
  })

  it('ignoriert Ereignisse ohne Zeichen und nach dem Unmount', () => {
    mountPanel()
    window.dispatchEvent(new CustomEvent('openTextEditorWithChar', { detail: {} }))
    wrapper.unmount()
    wrapper = null
    window.dispatchEvent(new CustomEvent('openTextEditorWithChar', { detail: { char: 'x' } }))
    expect(cm.value.addText).not.toHaveBeenCalled()
  })
})
