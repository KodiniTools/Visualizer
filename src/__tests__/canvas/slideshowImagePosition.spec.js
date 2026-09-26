import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { SlideshowManager } from '../../lib/slideshowManager.js'
import SlideshowImageEditor from '../../components/foto-panel/slideshow/SlideshowImageEditor.vue'

function createManager(callbacks = {}) {
  let nextId = 1
  const multiImageManager = {
    canvas: { width: 1000, height: 1000 },
    addImageWithBounds: vi.fn((imageObject, bounds) => ({ id: nextId++, imageObject, ...bounds })),
    removeImage: vi.fn(),
  }
  const fotoManager = {
    initializeImageSettings: (img) => {
      img.fotoSettings ??= { audioReactive: null }
    },
  }
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  return new SlideshowManager(multiImageManager, fotoManager, callbacks)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const imgA = { width: 200, height: 100 } // 2:1
const imgB = { width: 100, height: 100 }
const imgs = () => [{ imageObject: imgA }, { imageObject: imgB }]

describe('SlideshowManager – Bild per Mittelpunkt positionieren', () => {
  it('getEffectiveImageBounds liefert die automatische Einpassung ohne eigene Bounds', () => {
    const m = createManager()
    m.start(imgs())
    const b = m.getEffectiveImageBounds(imgA)
    // 2:1 im Standardbereich (0.1/0.1, 0.8×0.8) → 0.8×0.4, vertikal zentriert
    expect(b.relWidth).toBeCloseTo(0.8)
    expect(b.relHeight).toBeCloseTo(0.4)
    expect(b.relY + b.relHeight / 2).toBeCloseTo(0.5)
    expect(m.getImageBounds(imgA)).toBeNull() // nur gelesen, nichts gemerkt
    expect(m.getEffectiveImageBounds(null)).toBeNull()
    expect(m.getEffectiveImageBounds({ width: 0, height: 0 })).toBeNull()
    m.stop()
  })

  it('setImagePosition verschiebt das laufende Bild, Größe bleibt, wird gemerkt und gemeldet', () => {
    const onImageBoundsChange = vi.fn()
    const m = createManager({ onImageBoundsChange })
    m.start(imgs())
    const a = m.activeImages[0]
    const res = m.setImagePosition(imgA, { centerX: 0.3, centerY: 0.7 })
    expect(res.relWidth).toBeCloseTo(0.8)
    expect(res.relHeight).toBeCloseTo(0.4)
    expect(a.relX + a.relWidth / 2).toBeCloseTo(0.3)
    expect(a.relY + a.relHeight / 2).toBeCloseTo(0.7)
    expect(m.getImageBounds(imgA)).toEqual(res)
    expect(onImageBoundsChange).toHaveBeenCalledTimes(1)
    expect(onImageBoundsChange.mock.calls[0][0].bounds).toEqual(res)

    // nur eine Achse: die andere bleibt
    m.setImagePosition(imgA, { centerX: 0.6 })
    expect(a.relX + a.relWidth / 2).toBeCloseTo(0.6)
    expect(a.relY + a.relHeight / 2).toBeCloseTo(0.7)

    // Werte außerhalb 0–1 werden begrenzt
    m.setImagePosition(imgA, { centerX: 5, centerY: -2 })
    expect(a.relX + a.relWidth / 2).toBeCloseTo(1)
    expect(a.relY + a.relHeight / 2).toBeCloseTo(0)

    // anderes Bild unverändert
    expect(m.getImageBounds(imgB)).toBeNull()
    m.stop()
  })

  it('eigene Größe (Maus-Skalierung) bleibt beim Positionieren erhalten', () => {
    const m = createManager()
    m.start(imgs())
    m.setImageBounds(imgA, { relX: 0, relY: 0, relWidth: 0.2, relHeight: 0.1 })
    m.setImagePosition(imgA, { centerX: 0.5, centerY: 0.5 })
    expect(m.getImageBounds(imgA)).toEqual({
      relX: 0.4,
      relY: 0.45,
      relWidth: 0.2,
      relHeight: 0.1,
    })
    m.stop()
  })

  it('als Canvas-Hintergrund nicht positionierbar', () => {
    const onImageBoundsChange = vi.fn()
    const m = createManager({ onImageBoundsChange })
    m.start(imgs(), { backgroundMode: 'canvas' })
    expect(m.isFittedToWorkspace()).toBe(true)
    expect(m.setImagePosition(imgA, { centerX: 0.2, centerY: 0.2 })).toBeNull()
    expect(m.getImageBounds(imgA)).toBeNull()
    expect(onImageBoundsChange).not.toHaveBeenCalled()
    m.stop()
  })
})

describe('SlideshowImageEditor – Positionsregler', () => {
  const base = { image: { name: 'a.png' }, index: 0, total: 2 }

  it('ohne Position keine Regler', () => {
    const w = mount(SlideshowImageEditor, { props: { ...base, position: null } })
    expect(w.find('.image-editor-position').exists()).toBe(false)
  })

  it('zeigt Mittelpunkt in % (Slider + Spinner) und meldet Änderungen relativ', async () => {
    const w = mount(SlideshowImageEditor, { props: { ...base, position: { x: 0.25, y: 0.625 } } })
    const x = w.find('input.editor-position-x')
    const y = w.find('input.editor-position-y')
    expect(x.attributes('type')).toBe('range')
    expect(Number(x.element.value)).toBeCloseTo(25)
    expect(Number(y.element.value)).toBeCloseTo(62.5)
    const nums = w.findAll('.image-editor-position input[type="number"]')
    expect(nums).toHaveLength(2)
    expect(Number(nums[1].element.value)).toBeCloseTo(62.5)

    x.element.value = '40'
    await x.trigger('input')
    expect(w.emitted('update:position').at(-1)[0]).toEqual({ x: 0.4, y: 0.625 })

    nums[1].element.value = '80'
    await nums[1].trigger('input')
    expect(w.emitted('update:position').at(-1)[0].y).toBeCloseTo(0.8)
    expect(w.emitted('update:position').at(-1)[0].x).toBeCloseTo(0.25)
  })

  it('↺ setzt auf die Mitte (50 %)', async () => {
    const w = mount(SlideshowImageEditor, { props: { ...base, position: { x: 0.1, y: 0.9 } } })
    const resets = w.findAll('.image-editor-position .slider-field__reset')
    expect(resets).toHaveLength(2)
    await resets[0].trigger('click')
    expect(w.emitted('update:position').at(-1)[0]).toEqual({ x: 0.5, y: 0.9 })
  })
})
