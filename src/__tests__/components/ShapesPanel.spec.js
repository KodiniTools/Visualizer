import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ShapesPanel from '../../components/shapes/ShapesPanel.vue'
import SliderControl from '../../components/ui/SliderControl.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { useShapeStore } from '../../stores/shapeStore.js'
import { useHistoryStore } from '../../stores/historyStore.js'
import { getHistoryRecorder, resetHistoryRecorder } from '../../lib/history/historyRecorder.js'
import { createShapesSegment } from '../../lib/history/segments/shapesSegment.js'
import { EMOJI_SET, SHAPE_CATEGORIES, SHAPE_GALLERY } from '../../lib/shapes/shapes.js'
import de from '../../lib/i18n/de.js'

describe('ShapesPanel', () => {
  let store
  let history

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useShapeStore()
    history = useHistoryStore()
    resetHistoryRecorder()
    getHistoryRecorder(history).registerSegment('shapes', createShapesSegment(store))
  })

  afterEach(() => resetHistoryRecorder())

  const mountPanel = () =>
    mount(ShapesPanel, {
      props: { canvasWidth: 1920, canvasHeight: 1080 },
      attachTo: document.body,
    })

  const slider = (w, label) =>
    w.findAllComponents(SliderControl).find((c) => c.props('label') === label)

  it('zeigt alle Kategorien und fügt per Klick eine Form hinzu (ein Verlaufsschritt)', async () => {
    const w = mountPanel()
    const options = w.findAll('.ui-segmented__option').slice(0, SHAPE_CATEGORIES.length)
    expect(options.map((o) => o.text())).toEqual(
      SHAPE_CATEGORIES.map((c) => de.shapes.categories[c]),
    )
    const basic = SHAPE_GALLERY.filter((g) => g.category === 'basic')
    expect(w.findAll('.shape-grid .ui-tile')).toHaveLength(basic.length)
    expect(w.find('[data-shape="rect"]').attributes('aria-label')).toBe('Rechteck hinzufügen')

    await w.find('[data-shape="rect"]').trigger('click')
    expect(store.shapes).toHaveLength(1)
    expect(store.shapes[0]).toMatchObject({ type: 'rect', x: 960, y: 540 })
    expect(history.history).toHaveLength(1)
    expect(w.find('.shape-edit').exists()).toBe(true)
    expect(w.find('.shape-item__name').text()).toBe('Rechteck')
    w.unmount()
  })

  it('Sticker: „Neu“-Badge erhält den übersetzten Text; Emoji lässt sich tauschen', async () => {
    const w = mountPanel()
    await w.find('.ui-segmented__option[data-value="stickers"]').trigger('click')
    await w.find('[data-shape="badgeNew"]').trigger('click')
    expect(store.shapes[0]).toMatchObject({ type: 'burst', text: de.shapes.stickerText.new })

    await w.find('[data-shape="emojiFire"]').trigger('click')
    const emoji = store.selectedShape
    expect(emoji).toMatchObject({ type: 'emoji', emoji: EMOJI_SET.emojiFire })
    const swap = w.findAll('.emoji-grid .ui-tile')
    expect(swap).toHaveLength(Object.keys(EMOJI_SET).length)
    await w.find(`.emoji-grid [aria-label="${de.shapes.items.emojiRocket}"]`).trigger('click')
    expect(store.selectedShape).toMatchObject({
      emoji: EMOJI_SET.emojiRocket,
      galleryId: 'emojiRocket',
    })
    w.unmount()
  })

  it('bearbeitet Deckkraft, Drehung, Text und Schrift der ausgewählten Form', async () => {
    store.addShape('textBox', 1920, 1080)
    const w = mountPanel()
    slider(w, de.shapes.edit.opacity).vm.$emit('update:modelValue', 40)
    slider(w, de.shapes.edit.rotation).vm.$emit('update:modelValue', 30)
    expect(store.selectedShape).toMatchObject({ opacity: 40, rotation: 30 })

    await w.find('[data-shape-text]').setValue('Hallo')
    expect(store.selectedShape.text).toBe('Hallo')
    w.findComponent(UiSelect).vm.$emit('update:modelValue', 'Satoshi Black')
    expect(store.selectedShape.fontFamily).toBe('Satoshi Black')
    await w.find('.ui-segmented__option[data-value="right"]').trigger('click')
    expect(store.selectedShape.textAlign).toBe('right')
    w.unmount()
  })

  it('ohne Füllung bleibt eine Umrandung; Verlauf schaltet um und tauscht Farben', async () => {
    store.addShape('rect', 1920, 1080)
    const w = mountPanel()
    await w.find('.ui-segmented__option[data-value="linear"]').trigger('click')
    expect(store.selectedShape.fillType).toBe('linear')
    const { fillColor, fillColor2 } = store.selectedShape
    await w.find('[data-action="swap-gradient"]').trigger('click')
    expect(store.selectedShape).toMatchObject({ fillColor: fillColor2, fillColor2: fillColor })

    expect(store.selectedShape.strokeWidth).toBe(0)
    await w.find('[data-toggle="fill"] [role="switch"]').trigger('click')
    expect(store.selectedShape.filled).toBe(false)
    expect(store.selectedShape.strokeWidth).toBeGreaterThan(0)
    w.unmount()
  })

  it('Seitenverhältnis sperren koppelt Breite und Höhe', async () => {
    store.addShape('rect', 1920, 1080)
    const { width, height } = store.selectedShape
    const w = mountPanel()
    const lock = w.findAll('[role="switch"]').at(-1)
    await lock.trigger('click')
    slider(w, de.shapes.edit.width).vm.$emit('update:modelValue', width * 2)
    expect(store.selectedShape.height).toBe(Math.round(height * 2))
    w.unmount()
  })

  it('Zeichnen: Kachel schaltet den Modus, Reiterwechsel beendet ihn', async () => {
    const w = mountPanel()
    await w.find('.ui-segmented__option[data-value="draw"]').trigger('click')
    const pen = w.find('[data-shape="pen"]')
    expect(pen.attributes('aria-pressed')).toBe('false')
    await pen.trigger('click')
    expect(store.drawTool).toBe('pen')
    expect(w.find('[data-shape="pen"]').attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-action="draw-done"]').exists()).toBe(true)

    await w.find('.ui-segmented__option[data-value="basic"]').trigger('click')
    expect(store.drawTool).toBeNull()
    w.unmount()
  })

  it('Reihenfolge, Duplizieren und Löschen über Liste und Aktionen', async () => {
    store.addShape('rect', 1920, 1080)
    store.addShape('star', 1920, 1080)
    const w = mountPanel()
    expect(w.find('[data-action="forward"]').attributes('disabled')).toBeDefined()
    await w.find('[data-action="backward"]').trigger('click')
    expect(store.shapes[0].type).toBe('star')
    await w.find('[data-action="duplicate"]').trigger('click')
    expect(store.shapes).toHaveLength(3)
    await w.findAll('.shape-item__delete').at(0).trigger('click')
    expect(store.shapes).toHaveLength(2)
    await w.find('[data-action="deselect"]').trigger('click')
    expect(store.selectedShapeId).toBeNull()
    expect(w.find('.shape-edit').exists()).toBe(false)
    w.unmount()
  })
})
