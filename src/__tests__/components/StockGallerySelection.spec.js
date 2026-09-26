// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StockGallerySection from '../../components/foto-panel/StockGallerySection.vue'
import { useStockGallery } from '../../composables/useStockGallery.js'

const images = [
  { id: 's1', name: 'Wald', thumbnail: 'data:,1' },
  { id: 's2', name: 'Meer', thumbnail: 'data:,2' },
  { id: 's3', name: 'Berg', thumbnail: 'data:,3' },
]

let wrapper
afterEach(() => wrapper?.unmount())

function mountSection(selected = new Set()) {
  wrapper = mount(StockGallerySection, {
    props: {
      filteredStockImages: images,
      selectedStockImages: selected,
      selectedStockCount: selected.size,
      stockImagesLoading: false,
    },
  })
  return wrapper
}

describe('Stock-Galerie – Mehrfachauswahl per Checkbox', () => {
  it('Checkbox-Klick emittiert additive Auswahl (ctrlKey), ohne Bild-Klick auszulösen', async () => {
    const w = mountSection()
    await w.findAll('.selection-checkbox')[1].trigger('click')
    const events = w.emitted('select-image')
    expect(events).toHaveLength(1)
    expect(events[0][0].id).toBe('s2')
    expect(events[0][1]).toEqual({ ctrlKey: true })
  })

  it('Klick aufs Bild bleibt Einzelauswahl (normales Event)', async () => {
    const w = mountSection()
    await w.findAll('.stock-thumbnail-item')[2].trigger('click')
    const [img, event] = w.emitted('select-image')[0]
    expect(img.id).toBe('s3')
    expect(event.ctrlKey).toBe(false)
  })
})

describe('useStockGallery – Checkbox-Auswahl', () => {
  it('zwei Checkbox-Klicks wählen zwei Bilder, erneuter Klick entfernt', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const g = useStockGallery()
    g.stockImages.value = images
    g.selectStockImage(images[0], { ctrlKey: true })
    g.selectStockImage(images[2], { ctrlKey: true })
    expect(g.selectedStockCount.value).toBe(2)
    g.selectStockImage(images[2], { ctrlKey: true })
    expect([...g.selectedStockImages.value]).toEqual(['s1'])
  })
})
