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

describe('SlideshowManager – Bildgröße (B×H)', () => {
  it('Breite mit Seitenverhältnis: Höhe folgt, Mittelpunkt bleibt, wird gemerkt', () => {
    const onImageBoundsChange = vi.fn()
    const m = createManager({ onImageBoundsChange })
    m.start(imgs())
    const a = m.activeImages[0]
    const cx = a.relX + a.relWidth / 2
    const cy = a.relY + a.relHeight / 2
    const res = m.setImageSize(imgA, { width: 0.4 }) // 0.8×0.4 → 0.4×0.2
    expect(res.relWidth).toBeCloseTo(0.4)
    expect(res.relHeight).toBeCloseTo(0.2)
    expect(a.relX + a.relWidth / 2).toBeCloseTo(cx)
    expect(a.relY + a.relHeight / 2).toBeCloseTo(cy)
    expect(m.getImageBounds(imgA)).toEqual(res)
    expect(onImageBoundsChange).toHaveBeenCalledTimes(1)

    // Höhe mit Seitenverhältnis: Breite folgt
    m.setImageSize(imgA, { height: 0.5 })
    expect(a.relWidth).toBeCloseTo(1)
    expect(a.relHeight).toBeCloseTo(0.5)
    m.stop()
  })

  it('ohne Seitenverhältnis nur die geänderte Seite; Grenzen 1–200 %', () => {
    const m = createManager()
    m.start(imgs())
    const a = m.activeImages[0]
    m.setImageSize(imgA, { width: 0.3, keepAspect: false })
    expect(a.relWidth).toBeCloseTo(0.3)
    expect(a.relHeight).toBeCloseTo(0.4)
    m.setImageSize(imgA, { height: 9, keepAspect: false })
    expect(a.relHeight).toBeCloseTo(2)
    m.setImageSize(imgA, { width: 0, keepAspect: false })
    expect(a.relWidth).toBeCloseTo(0.01)
    m.stop()
  })

  it('getFittedImageBounds ignoriert eigene Größe (Standardwert der Regler)', () => {
    const m = createManager()
    m.start(imgs())
    m.setImageSize(imgA, { width: 0.2 })
    expect(m.getEffectiveImageBounds(imgA).relWidth).toBeCloseTo(0.2)
    expect(m.getFittedImageBounds(imgA).relWidth).toBeCloseTo(0.8)
    expect(m.getFittedImageBounds(imgA).relHeight).toBeCloseTo(0.4)
    m.stop()
  })

  it('Position nach Größenänderung behält die neue Größe', () => {
    const m = createManager()
    m.start(imgs())
    m.setImageSize(imgA, { width: 0.4 })
    m.setImagePosition(imgA, { centerX: 0.2, centerY: 0.2 })
    expect(m.getImageBounds(imgA)).toEqual({
      relX: expect.closeTo(0, 6),
      relY: expect.closeTo(0.1, 6),
      relWidth: expect.closeTo(0.4, 6),
      relHeight: expect.closeTo(0.2, 6),
    })
    m.stop()
  })

  it('als Canvas-Hintergrund nicht skalierbar', () => {
    const m = createManager()
    m.start(imgs(), { backgroundMode: 'canvas' })
    expect(m.setImageSize(imgA, { width: 0.2 })).toBeNull()
    expect(m.getImageBounds(imgA)).toBeNull()
    m.stop()
  })
})

describe('SlideshowImageEditor – Größenregler', () => {
  const base = { image: { name: 'a.png' }, index: 0, total: 2 }
  const size = { width: 0.8, height: 0.4, defaultWidth: 0.8, defaultHeight: 0.4 }

  it('ohne Größe keine Regler', () => {
    const w = mount(SlideshowImageEditor, { props: { ...base, size: null } })
    expect(w.find('.image-editor-size').exists()).toBe(false)
  })

  it('zeigt B×H in % und meldet Änderungen mit Seitenverhältnis-Option', async () => {
    const w = mount(SlideshowImageEditor, { props: { ...base, size } })
    const width = w.find('input.editor-size-width')
    expect(Number(width.element.value)).toBeCloseTo(80)
    expect(Number(w.find('input.editor-size-height').element.value)).toBeCloseTo(40)
    const lock = w.find('.editor-keep-aspect')
    expect(lock.element.checked).toBe(true)

    width.element.value = '50'
    await width.trigger('input')
    expect(w.emitted('update:size').at(-1)[0]).toEqual({ width: 0.5, keepAspect: true })

    await lock.setValue(false)
    const nums = w.findAll('.image-editor-size input[type="number"]')
    nums[1].element.value = '300' // über Maximum
    await nums[1].trigger('input')
    const last = w.emitted('update:size').at(-1)[0]
    expect(last.keepAspect).toBe(false)
    expect(last.height).toBeCloseTo(2)
  })

  it('↺ setzt auf die automatische Einpassung zurück', async () => {
    const w = mount(SlideshowImageEditor, {
      props: { ...base, size: { ...size, width: 0.3, height: 0.15 } },
    })
    const resets = w.findAll('.image-editor-size .slider-field__reset')
    expect(resets).toHaveLength(2)
    await resets[0].trigger('click')
    expect(w.emitted('update:size').at(-1)[0]).toEqual({ width: 0.8, keepAspect: true })
  })
})
