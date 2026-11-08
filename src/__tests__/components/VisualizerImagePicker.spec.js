// @vitest-environment jsdom
// Charakterisierung der Bildauswahl für Portrait-Presets (Visualizer-Panel und
// Ebenen). Zugriff über Texte, Namen und Rollen statt CSS-Klassen, damit die
// Tests den Wechsel auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import VisualizerImagePicker from '../../components/VisualizerImagePicker.vue'
import { clearVisualizerImages, registerVisualizerImage } from '../../lib/visualizers/imageRegistry'
import { useImageGallery } from '../../composables/useImageGallery.js'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const I = de.visualizer.image
let wrapper

function mountPicker({ modelValue = null, canvas = [] } = {}) {
  const manager = ref({ getAllImages: () => canvas })
  wrapper = mount(VisualizerImagePicker, {
    attachTo: document.body,
    props: { modelValue },
    global: { provide: { multiImageManager: manager } },
  })
  return wrapper
}

beforeEach(() => {
  clearVisualizerImages()
  useImageGallery().imageGallery.value = []
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ')
const select = () => root().querySelector('select')
const buttons = () => [...root().querySelectorAll('button')]
const button = (name) => buttons().find((b) => b.textContent.trim() === name)
const groups = () =>
  [...select().querySelectorAll('optgroup')].map((g) => ({
    label: g.label,
    options: [...g.querySelectorAll('option')].map((o) => o.textContent.trim()),
  }))
const img = (name) => Object.assign(document.createElement('img'), { alt: name })

describe('Bildauswahl – Liste', () => {
  it('ohne Bilder nur „Automatisch“, Hinweis und Laden-Knopf', () => {
    mountPicker()
    const opts = [...select().querySelectorAll('option')]
    expect(opts.map((o) => o.value)).toEqual([''])
    expect(opts[0].textContent.trim()).toBe(I.auto)
    expect(text()).toContain(I.hint)
    expect(button(I.upload)).toBeTruthy()
    expect(button(I.remove)).toBeUndefined()
  })

  it('Gruppen für geladene, Leinwand- und Galerie-Bilder', () => {
    registerVisualizerImage({ name: 'eigen.png', source: {}, kind: 'upload' })
    useImageGallery().imageGallery.value = [{ id: 'g1', name: 'urlaub.jpg', img: img('u') }]
    mountPicker({ canvas: [{ id: 7, imageObject: img('c') }] })
    expect(groups()).toEqual([
      { label: I.uploads, options: ['eigen.png'] },
      { label: I.fromCanvas, options: [`${I.fromCanvas} 1`] },
      { label: I.fromGallery, options: ['urlaub.jpg'] },
    ])
  })

  it('gewähltes Bild ist ausgewählt, Auswahl meldet die ID', async () => {
    useImageGallery().imageGallery.value = [{ id: 'g1', name: 'urlaub.jpg', img: img('u') }]
    mountPicker({ modelValue: 'gallery:g1' })
    expect(select().value).toBe('gallery:g1')
    select().value = ''
    select().dispatchEvent(new Event('change'))
    await nextTick()
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([null])
  })
})

describe('Bildauswahl – Aktionen', () => {
  it('„Bild entfernen“ nur mit Auswahl, setzt auf null', () => {
    useImageGallery().imageGallery.value = [{ id: 'g1', name: 'urlaub.jpg', img: img('u') }]
    mountPicker({ modelValue: 'gallery:g1' })
    button(I.remove).click()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([null])
  })

  it('„Bild laden…“ öffnet die Dateiauswahl, Datei wird registriert und gewählt', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ close() {} })),
    )
    mountPicker()
    const input = root().querySelector('input[type="file"]')
    expect(input.getAttribute('accept')).toBe('image/*')
    const click = vi.spyOn(input, 'click')
    button(I.upload).click()
    expect(click).toHaveBeenCalledTimes(1)
    const file = new File(['x'], 'neu.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    input.dispatchEvent(new Event('change'))
    await flushPromises()
    const id = wrapper.emitted('update:modelValue')[0][0]
    expect(id).toMatch(/^img_/)
    await nextTick()
    expect(groups()[0]).toEqual({ label: I.uploads, options: ['neu.png'] })
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountPicker()
      expect(select().querySelector('option').textContent.trim()).toBe(en.visualizer.image.auto)
      expect(button(en.visualizer.image.upload)).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Bildauswahl – Ui-Bausteine', () => {
  it('Auswahl als Ui-Select mit zugänglichem Namen', () => {
    mountPicker()
    const s = select()
    expect(s.closest('.ui-select')).toBeTruthy()
    expect(document.querySelector(`label[for="${s.id}"]`).textContent.trim()).toBe(
      de.visualizer.image.label,
    )
  })

  it('Knöpfe sind Ui-Buttons', () => {
    useImageGallery().imageGallery.value = [{ id: 'g1', name: 'urlaub.jpg', img: img('u') }]
    mountPicker({ modelValue: 'gallery:g1' })
    for (const n of [I.upload, I.remove]) {
      expect(button(n).classList.contains('ui-button'), n).toBe(true)
    }
  })
})
