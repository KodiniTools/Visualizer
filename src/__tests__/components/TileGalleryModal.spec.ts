// @vitest-environment jsdom
// Kachel-Galerie „Bild aus Galerie wählen“ (Hintergrund-Kacheln): Kategorien,
// Bildauswahl, Doppelklick übernimmt, Abbrechen/Escape schließt, Sprache.
// Zustand und Aktionen kommen per inject('tileGallery') aus BackgroundTilesPanel.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, type Ref } from 'vue'
import TileGalleryModal from '../../components/background-tiles/TileGalleryModal.vue'
import { setLocale } from '../../lib/i18n'
import type { BgGalleryCategory, BgGalleryImage } from '../../composables/bg/useBgReplace'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const B = de.backgroundTiles
let wrapper: VueWrapper | null

// Wie in public/gallery/gallery.json: Kategorie-IDs sind Texte
const categories: BgGalleryCategory[] = [
  { id: 'natur', name: 'Natur', name_en: 'Nature', icon: '🌿' },
  { id: 'muster', name: 'Muster', name_en: 'Patterns' },
]
const images: BgGalleryImage[] = [
  { id: 'a', file: 'g/wald.jpg', thumbnail: 'g/wald-t.jpg', name: 'Wald', name_en: 'Forest' },
  { id: 'b', file: 'g/see.jpg', name: 'See' },
]

function mountModal(state: Record<string, unknown> = {}) {
  const gallery = {
    showGalleryModal: ref(true),
    galleryCategories: ref(categories),
    galleryImages: ref(images),
    selectedGalleryCategory: ref('natur'),
    selectedGalleryImage: ref<(typeof images)[number] | null>(null),
    galleryLoading: ref(false),
    closeGalleryModal: vi.fn(),
    selectGalleryCategory: vi.fn(),
    selectGalleryImage: vi.fn(),
    confirmGallerySelection: vi.fn(),
  }
  for (const [key, value] of Object.entries(state))
    (gallery[key as keyof typeof gallery] as Ref<unknown>).value = value
  wrapper = mount(TileGalleryModal, {
    attachTo: document.body,
    global: { provide: { tileGallery: gallery } },
  })
  return gallery
}

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  await setLocale('de')
})

const body = () => document.body
const text = () => body().textContent!.replace(/\s+/g, ' ')
const button = (label: string) =>
  [...body().querySelectorAll('button')].filter((b) => b.textContent!.includes(label)).pop()
/** Kachel, die das Bild mit dieser Datei zeigt. */
const tile = (file: string) =>
  [...body().querySelectorAll('img')].find((i) =>
    i.getAttribute('src')?.startsWith(file.replace('.jpg', '')),
  )?.parentElement

describe('Kachel-Galerie – Anzeige', () => {
  it('ist geschlossen unsichtbar', () => {
    mountModal({ showGalleryModal: false })
    expect(text()).not.toContain(B.galleryTitle)
  })

  it('zeigt Titel, Kategorien mit Symbol und Bilder (Vorschau, sonst Datei)', () => {
    mountModal()
    expect(text()).toContain(B.galleryTitle)
    expect(button('🌿 Natur')).toBeTruthy()
    expect(button('Muster')).toBeTruthy()
    const srcs = [...body().querySelectorAll('img')].map((i) => i.getAttribute('src'))
    expect(srcs).toEqual(['g/wald-t.jpg', 'g/see.jpg'])
    expect(text()).toContain('Wald')
    expect(text()).toContain('See')
  })

  it('ohne Kategorien keine Kategorie-Leiste', () => {
    mountModal({ galleryCategories: [] })
    expect(body().querySelector('[role="radiogroup"]')).toBeNull()
  })

  it('beim Laden keine Bilder', () => {
    mountModal({ galleryLoading: true })
    expect(body().querySelector('img')).toBeNull()
  })
})

describe('Kachel-Galerie – Auswahl', () => {
  it('Kategorie wählen meldet die ID', () => {
    const g = mountModal()
    button('Muster')!.click()
    expect(g.selectGalleryCategory).toHaveBeenCalledWith('muster')
  })

  it('Klick wählt das Bild, Doppelklick übernimmt', () => {
    const g = mountModal()
    tile('g/see.jpg')!.click()
    expect(g.selectGalleryImage).toHaveBeenCalledWith(images[1])
    tile('g/see.jpg')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(g.confirmGallerySelection).toHaveBeenCalledTimes(1)
  })

  it('„Auswählen“ erst mit Auswahl aktiv, markiert die Kachel', async () => {
    const g = mountModal()
    expect(button(B.gallerySelect)!.disabled).toBe(true)
    g.selectedGalleryImage.value = images[0]!
    await nextTick()
    expect(tile('g/wald.jpg')!.classList).toContain('selected')
    expect(button(B.gallerySelect)!.disabled).toBe(false)
    button(B.gallerySelect)!.click()
    expect(g.confirmGallerySelection).toHaveBeenCalledTimes(1)
  })
})

describe('Kachel-Galerie – Schließen', () => {
  it('Abbrechen und Escape schließen', () => {
    const g = mountModal()
    button(B.galleryCancel)!.click()
    body()
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(g.closeGalleryModal).toHaveBeenCalledTimes(2)
  })
})

describe('Kachel-Galerie – Sprache', () => {
  it('Titel, Kategorien und Bildnamen folgen der Sprache', async () => {
    await setLocale('en')
    mountModal()
    expect(text()).toContain(en.backgroundTiles.galleryTitle)
    expect(button('🌿 Nature')).toBeTruthy()
    expect(text()).toContain('Forest')
    // ohne name_en bleibt der deutsche Name
    expect(text()).toContain('See')
  })
})

describe('Kachel-Galerie – Bedienbarkeit', () => {
  it('Bilder sind Knöpfe mit Namen und aria-pressed', () => {
    mountModal({ selectedGalleryImage: images[1] })
    const tiles = [...body().querySelectorAll('button[aria-pressed]')]
    expect(tiles.map((b) => b.getAttribute('aria-label'))).toEqual(['Wald', 'See'])
    expect(tiles.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true'])
  })

  it('Laden und leere Kategorie werden angesagt', () => {
    mountModal({ galleryLoading: true })
    expect(body().querySelector('[role="status"]')!.getAttribute('aria-label')).toBe(
      de.common.loading,
    )
    wrapper!.unmount()
    mountModal({ galleryImages: [] })
    expect(text()).toContain(de.common.noResults)
  })
})
