import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import PositionSizeControls from '../../components/foto-panel/image-filters/PositionSizeControls.vue'
import ImageFiltersPanel from '../../components/foto-panel/ImageFiltersPanel.vue'
import { createPinia, setActivePinia } from 'pinia'

let wrapper
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

// 200×100-Bild auf 1000×500-Canvas: Mitte 0.3/0.4, 40 % × 20 %
function makeImage() {
  return {
    id: 1,
    type: 'image',
    imageObject: { width: 200, height: 100 },
    relX: 0.1,
    relY: 0.3,
    relWidth: 0.4,
    relHeight: 0.2,
  }
}
function mountControls(image = makeImage()) {
  const api = { getCanvas: () => ({ width: 1000, height: 500 }), redraw: vi.fn() }
  wrapper = mount(PositionSizeControls, { props: { image: reactive(image), api } })
  return { w: wrapper, image, api }
}
const range = (w, axis) => w.find(`input.image-${axis}-slider`)
const val = (w, axis) => Number(range(w, axis).element.value)

describe('PositionSizeControls', () => {
  it('zeigt Mittelpunkt und B×H in % (Slider + Spinner)', () => {
    const { w } = mountControls()
    expect(val(w, 'x')).toBeCloseTo(30)
    expect(val(w, 'y')).toBeCloseTo(40)
    expect(val(w, 'width')).toBeCloseTo(40)
    expect(val(w, 'height')).toBeCloseTo(20)
    expect(w.findAll('input[type="number"]')).toHaveLength(4)
    expect(w.find('.image-keep-aspect').element.checked).toBe(true)
  })

  it('Position: verschiebt das Bild, Größe bleibt, zeichnet neu', async () => {
    const { w, image, api } = mountControls()
    const x = range(w, 'x')
    x.element.value = '50'
    await x.trigger('input')
    expect(image.relX + image.relWidth / 2).toBeCloseTo(0.5)
    expect(image.relWidth).toBe(0.4)
    expect(api.redraw).toHaveBeenCalled()
    const ny = w.findAll('input[type="number"]')[1]
    ny.element.value = '10'
    await ny.trigger('input')
    expect(image.relY + image.relHeight / 2).toBeCloseTo(0.1)
    expect(image.relX + image.relWidth / 2).toBeCloseTo(0.5)
  })

  it('Größe: mit Seitenverhältnis folgt die andere Seite, ohne nur eine', async () => {
    const { w, image } = mountControls()
    const width = range(w, 'width')
    width.element.value = '20'
    await width.trigger('input')
    expect(image.relWidth).toBeCloseTo(0.2)
    expect(image.relHeight).toBeCloseTo(0.1)
    expect(image.relX + image.relWidth / 2).toBeCloseTo(0.3) // Mittelpunkt bleibt
    expect(val(w, 'height')).toBeCloseTo(10)

    await w.find('.image-keep-aspect').setValue(false)
    const h = range(w, 'height')
    h.element.value = '50'
    await h.trigger('input')
    expect(image.relHeight).toBeCloseTo(0.5)
    expect(image.relWidth).toBeCloseTo(0.2)
  })

  it('↺: Position auf Mitte, Größe auf Standard beim Platzieren (1/3 Breite)', async () => {
    const { w, image } = mountControls()
    const resets = w.findAll('.slider-field__reset')
    expect(resets).toHaveLength(4)
    await resets[0].trigger('click')
    expect(image.relX + image.relWidth / 2).toBeCloseTo(0.5)
    await resets[2].trigger('click')
    expect(image.relWidth).toBeCloseTo(0.333, 3)
    expect(image.relHeight).toBeCloseTo(0.1667, 3) // Seitenverhältnis beibehalten
  })

  it('folgt Änderungen außerhalb (Maus, Undo) über sync()', async () => {
    const { w, image } = mountControls()
    image.relX = 0.5 // Mitte 0.7
    image.relWidth = 0.4
    w.vm.sync()
    await w.vm.$nextTick()
    expect(val(w, 'x')).toBeCloseTo(70)
  })

  it('ungültige Bounds werden nicht überschrieben', async () => {
    const { w, image } = mountControls({ ...makeImage(), relWidth: NaN })
    const x = range(w, 'x')
    x.element.value = '50'
    await x.trigger('input')
    expect(image.relX).toBe(0.1)
  })
})

describe('ImageFiltersPanel – Position & Größe', () => {
  function mountPanel(currentActiveImage) {
    setActivePinia(createPinia())
    wrapper = mount(ImageFiltersPanel, {
      props: { currentActiveImage, boundsApi: { getCanvas: () => null, redraw: () => {} } },
      global: { plugins: [createPinia()] },
    })
    return wrapper
  }

  it('nur für normale Canvas-Bilder', () => {
    expect(mountPanel(makeImage()).find('.position-size-controls').exists()).toBe(true)
    wrapper.unmount()
    expect(
      mountPanel({ ...makeImage(), isSlideshowImage: true })
        .find('.position-size-controls')
        .exists(),
    ).toBe(false)
    wrapper.unmount()
    expect(
      mountPanel({ ...makeImage(), type: 'background' })
        .find('.position-size-controls')
        .exists(),
    ).toBe(false)
    wrapper.unmount()
    expect(mountPanel(null).find('.position-size-controls').exists()).toBe(false)
  })
})
