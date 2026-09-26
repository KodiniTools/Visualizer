// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageUploadSection from '../../components/foto-panel/ImageUploadSection.vue'
import { useImageGallery } from '../../composables/useImageGallery.js'

const gallery = [
  { id: '1', name: 'eins.webp', dimensions: '10×10', img: { src: 'data:,1' } },
  { id: '2', name: 'zwei.webp', dimensions: '10×10', img: { src: 'data:,2' } },
  { id: '3', name: 'drei.webp', dimensions: '10×10', img: { src: 'data:,3' } },
]

let wrapper
afterEach(() => wrapper?.unmount())

function mountSection(selected = new Set()) {
  wrapper = mount(ImageUploadSection, {
    props: {
      imageGallery: gallery,
      selectedImageIndices: selected,
      selectedImageCount: selected.size,
    },
  })
  return wrapper
}

describe('Galerie – Mehrfachauswahl per Checkbox', () => {
  it('Checkbox-Klick emittiert additive Auswahl (ctrlKey), ohne Bild-Klick auszulösen', async () => {
    const w = mountSection()
    await w.findAll('.selection-checkbox')[1].trigger('click')
    const events = w.emitted('select-image')
    expect(events).toHaveLength(1)
    expect(events[0][0]).toBe(1)
    expect(events[0][1]).toEqual({ ctrlKey: true })
  })

  it('Klick aufs Bild bleibt Einzelauswahl (normales Event)', async () => {
    const w = mountSection()
    await w.findAll('.thumbnail-item')[2].trigger('click')
    const [index, event] = w.emitted('select-image')[0]
    expect(index).toBe(2)
    expect(event.ctrlKey).toBe(false)
  })

  it('Hinweis auf 2 Bilder nur bei genau einem ausgewählten Bild', () => {
    expect(
      mountSection(new Set([0]))
        .find('.slideshow-select-hint')
        .exists(),
    ).toBe(true)
    wrapper.unmount()
    expect(
      mountSection(new Set([0, 1]))
        .find('.slideshow-select-hint')
        .exists(),
    ).toBe(false)
  })
})

describe('useImageGallery – Checkbox-Auswahl', () => {
  it('zwei Checkbox-Klicks ergeben zwei ausgewählte Bilder (Slideshow ab 2)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const g = useImageGallery()
    g.imageGallery.value = gallery.map((x) => ({ ...x }))
    g.deselectAllImages()
    g.selectImage(0, { ctrlKey: true })
    g.selectImage(2, { ctrlKey: true })
    expect(g.selectedImageCount.value).toBe(2)
    expect(g.selectedImages.value.map((i) => i.id)).toEqual(['1', '3'])
    // erneuter Klick entfernt wieder
    g.selectImage(2, { ctrlKey: true })
    expect(g.selectedImageCount.value).toBe(1)
    g.imageGallery.value = []
    g.deselectAllImages()
  })
})
