// @vitest-environment jsdom
// Stock-Galerie (GalleryPanel): verbindet die Auswahl aus StockGallerySection
// mit Canvas und Bild-Manager. Composable und Kind-Komponenten sind ersetzt,
// geprüft werden die Aufrufe an Canvas/Manager und die Rückmeldungen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useToastStore } from '../../stores/toastStore'
import de from '../../lib/i18n/de'

const stock = vi.hoisted(() => ({}))

vi.mock('../../composables/useStockGallery.js', () => ({ useStockGallery: () => stock }))
vi.mock('../../composables/useGalleryCanvasDrop', () => ({
  useGalleryCanvasDrop: () => ({ startDrag: vi.fn(), endDrag: vi.fn(), teardown: vi.fn() }),
}))

const { default: GalleryPanel } = await import('../../components/GalleryPanel.vue')

// Platzhalter für die Kind-Komponenten (Events werden direkt ausgelöst)
const Section = { name: 'StockGallerySection', render: () => h('div') }
const Overlay = {
  name: 'ImagePreviewOverlay',
  props: { previewImage: { type: Object, default: null } },
  render: () => h('div'),
}

let wrapper
let canvas
let images
let toasts
const img1 = { id: 's1', name: 'Berg' }
const img2 = { id: 's2', name: 'See' }

function resetStock(selected = []) {
  const list = ref(selected)
  Object.assign(stock, {
    stockCategories: ref([]),
    selectedStockCategory: ref(null),
    selectedStockImages: ref(new Set()),
    stockImagesLoading: ref(false),
    categoryLoading: ref(false),
    filteredStockImages: ref([]),
    selectedStockImagesList: list,
    selectedStockCount: computed(() => list.value.length),
    loadStockGallery: vi.fn(),
    selectStockCategory: vi.fn(),
    selectStockImage: vi.fn(),
    selectAllStockImages: vi.fn(),
    deselectAllStockImages: vi.fn(() => (list.value = [])),
    loadStockImageObject: vi.fn(async (s) => ({ src: `blob:${s.id}`, stock: s.id })),
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  toasts = useToastStore()
  vi.spyOn(toasts, 'success')
  vi.spyOn(toasts, 'error')
  vi.spyOn(toasts, 'warning')
  canvas = {
    canvas: { width: 1000, height: 500 },
    setBackground: vi.fn(),
    setWorkspaceBackground: vi.fn(() => true),
    startImageSelectionMode: vi.fn(),
  }
  images = { addImage: vi.fn(), addImageWithBounds: vi.fn() }
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

function mountPanel(selected = []) {
  resetStock(selected)
  wrapper = mount(GalleryPanel, {
    global: {
      provide: { canvasManager: ref(canvas), multiImageManager: ref(images) },
      stubs: { StockGallerySection: Section, ImagePreviewOverlay: Overlay },
    },
  })
  return wrapper
}

const section = () => wrapper.findComponent(Section)
async function emit(name, ...args) {
  section().vm.$emit(name, ...args)
  await flushPromises()
}

describe('GalleryPanel – Start', () => {
  it('lädt die Galerie beim ersten Öffnen, danach nicht erneut', () => {
    mountPanel()
    expect(stock.loadStockGallery).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    resetStock()
    stock.stockCategories.value = [{ id: 'natur' }]
    wrapper = mount(GalleryPanel, {
      global: {
        provide: { canvasManager: ref(canvas), multiImageManager: ref(images) },
        stubs: { StockGallerySection: Section, ImagePreviewOverlay: Overlay },
      },
    })
    expect(stock.loadStockGallery).not.toHaveBeenCalled()
  })
})

describe('GalleryPanel – auf den Canvas', () => {
  it('fügt alle gewählten Bilder hinzu, meldet die Anzahl, hebt die Auswahl auf', async () => {
    mountPanel([img1, img2])
    await emit('add-to-canvas')
    expect(images.addImage).toHaveBeenCalledTimes(2)
    expect(toasts.success).toHaveBeenCalledWith(de.toast.imagesAddedToCanvas.replace('{count}', 2))
    expect(stock.deselectAllStockImages).toHaveBeenCalled()
  })

  it('Ladefehler meldet einen Fehler', async () => {
    mountPanel([img1])
    stock.loadStockImageObject.mockRejectedValueOnce(new Error('404'))
    await emit('add-to-canvas')
    expect(toasts.error).toHaveBeenCalledWith(de.toast.imagesLoadError)
  })

  it('direkt platzieren: mittig, Größe und Versatz aus den Einstellungen', async () => {
    mountPanel([img1])
    await emit('update:placement-settings', {
      selectedAnimation: 'fade',
      animationDuration: 800,
      imageScale: 2,
      imageOffsetX: 100,
      imageOffsetY: -50,
    })
    await emit('add-directly')
    const [img, bounds, animation, opts] = images.addImageWithBounds.mock.calls[0]
    expect(img.stock).toBe('s1')
    expect(bounds.relWidth).toBeCloseTo(0.3)
    expect(bounds.relX).toBeCloseTo(0.6 - 0.15)
    expect(bounds.relY).toBeCloseTo(0.4 - 0.15)
    expect(animation).toBe('fade')
    expect(opts).toEqual({ duration: 800 })
  })
})

describe('GalleryPanel – Hintergrund und Bereich', () => {
  it('Hintergrund nur bei genau einem Bild', async () => {
    mountPanel([img1, img2])
    await emit('set-as-background')
    expect(canvas.setBackground).not.toHaveBeenCalled()
    stock.selectedStockImagesList.value = [img1]
    await emit('set-as-background')
    expect(canvas.setBackground).toHaveBeenCalledWith(expect.objectContaining({ stock: 's1' }))
  })

  it('Workspace-Hintergrund ohne Workspace warnt', async () => {
    mountPanel([img1])
    canvas.setWorkspaceBackground.mockReturnValueOnce(false)
    await emit('set-as-workspace-background')
    expect(toasts.warning).toHaveBeenCalledWith(de.toast.selectWorkspaceFirst)
    expect(stock.deselectAllStockImages).not.toHaveBeenCalled()
  })

  it('Bereichsauswahl platziert das Bild im gewählten Rechteck', async () => {
    mountPanel([img1])
    await emit('start-range-selection')
    expect(canvas.startImageSelectionMode).toHaveBeenCalledTimes(1)
    const [done] = canvas.startImageSelectionMode.mock.calls[0]
    done({ relX: 0.1, relY: 0.2, relWidth: 0.4, relHeight: 0.2 })
    await flushPromises()
    const [, bounds] = images.addImageWithBounds.mock.calls[0]
    expect(bounds).toMatchObject({ relX: 0.1, relY: 0.2, relWidth: 0.4, relHeight: 0.2 })
    expect(stock.deselectAllStockImages).toHaveBeenCalled()
  })

  it('abgebrochene Bereichsauswahl fügt nichts hinzu', async () => {
    mountPanel([img1])
    await emit('start-range-selection')
    canvas.startImageSelectionMode.mock.calls[0][0](null)
    expect(images.addImageWithBounds).not.toHaveBeenCalled()
  })
})

describe('GalleryPanel – Vorschau', () => {
  it('öffnet, fügt hinzu oder setzt als Hintergrund und schließt', async () => {
    mountPanel()
    const overlay = () => wrapper.findComponent(Overlay)
    await emit('open-preview', img1)
    expect(overlay().props('previewImage')).toMatchObject({ name: 'Berg', src: 'blob:s1' })
    overlay().vm.$emit('add-to-canvas')
    await flushPromises()
    expect(images.addImage).toHaveBeenCalled()
    expect(overlay().props('previewImage')).toBe(null)

    await emit('open-preview', img2)
    overlay().vm.$emit('set-as-background')
    await flushPromises()
    expect(canvas.setBackground).toHaveBeenCalledWith(expect.objectContaining({ stock: 's2' }))
    expect(overlay().props('previewImage')).toBe(null)
  })
})
