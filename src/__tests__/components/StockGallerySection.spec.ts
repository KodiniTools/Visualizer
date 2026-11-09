// @vitest-environment jsdom
// Charakterisierung der Stock-Galerie (Galerie-Panel): Kategorien, Auswahl,
// Kacheln, Aktionen, Lade-/Fehler-/Leerzustand. Zugriff über Texte, Namen und
// Rollen statt CSS-Klassen, damit die Tests den Wechsel auf die Ui-Bausteine
// unverändert überstehen.
import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import StockGallerySection from '../../components/foto-panel/StockGallerySection.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'
import type { StockImage } from '../../composables/useStockGallery'
import { stub } from '../helpers/canvasStubs'

const F = de.foto
const categories = [
  { id: 'backgrounds', name: 'Hintergründe', icon: '🖼️', count: 12 },
  { id: 'eigene', name: 'Eigene', name_en: 'Own', icon: '⭐' },
]
const images = stub<StockImage[]>([
  { id: 's1', name: 'Wald', thumbnail: 'data:,1' },
  { id: 's2', name: 'Meer', thumbnail: 'data:,2' },
])
let wrapper: VueWrapper | null

function mountSection(props: Record<string, unknown> & { selected?: string[] } = {}) {
  const selected = new Set<string>(props.selected ?? [])
  delete props.selected
  wrapper = mount(StockGallerySection, {
    attachTo: document.body,
    props: {
      stockCategories: categories,
      filteredStockImages: images,
      selectedStockCategory: 'backgrounds',
      selectedStockImages: selected,
      selectedStockCount: selected.size,
      ...props,
    },
    global: { stubs: { PlacementSettings: { template: '<div data-placement />' } } },
  })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const root = () => wrapper!.element
const text = () => root().textContent.replace(/\s+/g, ' ')
const buttons = () => [...root().querySelectorAll('button')]
const button = (name: string) =>
  buttons().find((b) => b.textContent.trim() === name || b.getAttribute('aria-label') === name)
/** Kategorie-Knopf über seinen Namen (Text enthält Symbol und Anzahl). */
const categoryButton = (name: string) => buttons().find((b) => b.textContent.includes(name))
const isActive = (b: Element) =>
  b.getAttribute('aria-checked') === 'true' || b.classList.contains('active')
const tile = (i: number) =>
  root()
    .querySelector(`img[src="data:,${i + 1}"]`)
    .closest('[draggable="true"]')

describe('Stock-Galerie – Kategorien', () => {
  it('Überschrift, Kategorien mit übersetztem Namen, Symbol und Anzahl', () => {
    mountSection()
    expect(text()).toContain(F.gallery)
    const bg = categoryButton(F.stockCategories.backgrounds)
    expect(bg.textContent).toContain('🖼️')
    expect(bg.textContent).toContain('12')
    expect(isActive(bg)).toBe(true)
    expect(isActive(categoryButton('Eigene'))).toBe(false)
  })

  it('Klick auf eine Kategorie meldet ihre ID', () => {
    mountSection()
    categoryButton('Eigene').click()
    expect(wrapper!.emitted('select-category')![0]).toEqual(['eigene'])
  })

  it('EN: Name aus name_en, wenn keine Übersetzung existiert', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountSection()
      expect(categoryButton('Own')).toBeTruthy()
      expect(categoryButton(en.foto.stockCategories.backgrounds)).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Stock-Galerie – Bilder und Auswahl', () => {
  it('Kacheln mit Namen und Hinweisen; Auswahlknöpfe folgen der Auswahl', () => {
    mountSection({ selected: ['s1'] })
    expect(text()).toContain('Wald')
    expect(text()).toContain(F.multiselectHint)
    expect(text()).toContain(F.dragToCanvasHint)
    expect(text()).toContain(`1 ${F.selected}`)
    expect(button(F.selectAll).disabled).toBe(false)
    expect(button(F.deselectAll).disabled).toBe(false)
    button(F.selectAll).click()
    button(F.deselectAll).click()
    expect(wrapper!.emitted('select-all')).toHaveLength(1)
    expect(wrapper!.emitted('deselect-all')).toHaveLength(1)
  })

  it('ohne Auswahl: „Auswahl aufheben“ gesperrt, keine Aktionen', () => {
    mountSection()
    expect(button(F.deselectAll).disabled).toBe(true)
    expect(button(F.placeOnCanvas)).toBeUndefined()
  })

  it('Klick wählt, Doppelklick öffnet Vorschau, Ziehen meldet Start und Ende', () => {
    mountSection()
    tile(1).click()
    expect(wrapper!.emitted('select-image')![0]![0]).toEqual(images[1])
    tile(0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(wrapper!.emitted('open-preview')![0]![0]).toEqual(images[0])
    tile(0).dispatchEvent(new Event('dragstart', { bubbles: true }))
    tile(0).dispatchEvent(new Event('dragend', { bubbles: true }))
    expect(wrapper!.emitted<[{ img: StockImage }]>('image-dragstart')![0]![0].img).toEqual(
      images[0],
    )
    expect(wrapper!.emitted('image-dragend')).toHaveLength(1)
  })

  it('Checkbox wählt additiv (ctrlKey) und zeigt den Zustand', () => {
    mountSection({ selected: ['s2'] })
    const cb = tile(1).querySelector('[role="checkbox"]')
    expect(cb.getAttribute('aria-checked')).toBe('true')
    tile(0).querySelector('[role="checkbox"]').click()
    expect(wrapper!.emitted('select-image')).toHaveLength(1)
    expect(wrapper!.emitted('select-image')![0]![1]).toEqual({ ctrlKey: true })
  })
})

describe('Stock-Galerie – Aktionen', () => {
  it('ein Bild: Platzieren, Hintergrund, Workspace, Platzierungs-Einstellungen', () => {
    mountSection({ selected: ['s1'] })
    button(F.placeOnCanvas).click()
    button(F.asBackground).click()
    button(F.asWorkspaceBackground).click()
    expect(wrapper!.emitted('add-to-canvas')).toHaveLength(1)
    expect(wrapper!.emitted('set-as-background')).toHaveLength(1)
    expect(wrapper!.emitted('set-as-workspace-background')).toHaveLength(1)
    expect(root().querySelector('[data-placement]')).toBeTruthy()
  })

  it('zwei Bilder: „2 Bilder auf Canvas“, ohne Hintergrund-Aktionen (DE und EN)', async () => {
    mountSection({ selected: ['s1', 's2'] })
    expect(button('2 Bilder auf Canvas')).toBeTruthy()
    expect(button(F.asBackground)).toBeUndefined()
    expect(root().querySelector('[data-placement]')).toBeNull()
    wrapper!.unmount()
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountSection({ selected: ['s1', 's2'] })
      expect(button('2 images on Canvas')).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Stock-Galerie – Zustände', () => {
  it('lädt: Ladehinweis Galerie bzw. Kategorie', async () => {
    mountSection({ stockImagesLoading: true, filteredStockImages: [] })
    expect(text()).toContain(F.loadingGallery)
    await wrapper!.setProps({ stockImagesLoading: false, categoryLoading: true })
    expect(text()).toContain(F.loadingCategory)
    expect(text()).not.toContain(F.noImagesInCategory)
  })

  it('keine Kategorien: Fehler mit „Erneut laden“', () => {
    mountSection({ stockCategories: [], filteredStockImages: [] })
    expect(text()).toContain(F.galleryLoadError)
    button(F.retryLoad).click()
    expect(wrapper!.emitted('retry-load')).toHaveLength(1)
  })

  it('leere Kategorie: Hinweis', () => {
    mountSection({ filteredStockImages: [] })
    expect(text()).toContain(F.noImagesInCategory)
    expect(button(F.selectAll)).toBeUndefined()
  })
})

describe('Stock-Galerie – Ui-Bausteine', () => {
  it('Kategorien als Radiogroup mit Namen', () => {
    mountSection()
    const rg = root().querySelector('[role="radiogroup"]')
    expect(rg.getAttribute('aria-label')).toBe(F.gallery)
    expect(categoryButton('Eigene').getAttribute('role')).toBe('radio')
  })

  it('Knöpfe sind Ui-Buttons, Platzieren primär; Kacheln per Tastatur wählbar', () => {
    mountSection({ selected: ['s1'] })
    for (const n of [F.selectAll, F.deselectAll, F.placeOnCanvas, F.asBackground]) {
      expect(button(n).classList.contains('ui-button'), n).toBe(true)
    }
    expect(button(F.placeOnCanvas).classList.contains('ui-button--primary')).toBe(true)
    const t1 = tile(1)
    expect(t1.getAttribute('role')).toBe('button')
    expect(t1.getAttribute('aria-label')).toBe('Meer')
    expect(tile(0).getAttribute('aria-pressed')).toBe('true')
    t1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(wrapper!.emitted('select-image')![0]![0]).toEqual(images[1])
    expect(t1.querySelector('[role="checkbox"]').getAttribute('tabindex')).toBe('0')
    expect(text()).not.toContain('✓')
  })
})
