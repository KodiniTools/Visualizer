// @vitest-environment jsdom
// Charakterisierung der Galerie „Aus Galerie wählen“ (Ersetzen eines Canvas-Bildes).
// Zugriff über sichtbare Texte statt CSS-Klassen, damit die Tests den Wechsel
// auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ReplaceGalleryModal from '../../components/canvas-bar/ReplaceGalleryModal.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'
import { stub } from '../helpers/canvasStubs'

const A = de.app
let wrapper: VueWrapper | null

const categories = [
  { id: 'nature', name: 'Natur', name_en: 'Nature', icon: '🌿' },
  { id: 'city', name: 'Stadt', name_en: 'City', icon: '🏙️' },
]
const images = [
  { file: 'g/wald.jpg', thumb: 'g/wald-t.jpg', name: 'Wald' },
  { file: 'g/see.jpg', name: 'See' },
]

function mountModal(props = {}) {
  const { t } = useI18n()
  const fns = {
    closeReplaceGallery: vi.fn(),
    selectReplaceGalleryCategory: vi.fn(),
    selectReplaceGalleryImage: vi.fn(),
    confirmReplaceFromGallery: vi.fn(),
  }
  wrapper = mount(ReplaceGalleryModal, {
    attachTo: document.body,
    props: {
      showReplaceGallery: true,
      replaceGalleryCategories: categories,
      replaceGalleryImages:
        stub<InstanceType<typeof ReplaceGalleryModal>['$props']['replaceGalleryImages']>(images),
      selectedReplaceCategory: 'nature',
      selectedReplaceImage: null,
      replaceGalleryLoading: false,
      t,
      ...fns,
      ...props,
    },
  })
  return fns
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const body = () => document.body
const text = () => body().textContent!.replace(/\s+/g, ' ')
const buttons = () => [...body().querySelectorAll('button')]
const button = (label: string) =>
  buttons()
    .filter((b) => b.textContent!.includes(label))
    .pop()
/** Galerie-Kachel, die das Bild mit dieser Datei zeigt. */
const tile = (file: string) => {
  const img = [...body().querySelectorAll('img')].find((i) =>
    i.getAttribute('src')?.startsWith(file.replace('.jpg', '')),
  )
  return img?.parentElement
}
/** Die abgedunkelte Ebene hinter dem Dialog. */
const overlay = () =>
  body().querySelector('[role="dialog"]')?.parentElement ??
  [...body().children].find((el) => el.textContent!.includes(A.selectFromGallery))

describe('Ersatz-Galerie – Anzeige', () => {
  it('ist geschlossen unsichtbar', () => {
    mountModal({ showReplaceGallery: false })
    expect(text()).not.toContain(A.selectFromGallery)
  })

  it('zeigt Titel, Kategorien und Bilder (Vorschaubild, sonst Datei)', () => {
    mountModal()
    expect(text()).toContain(A.selectFromGallery)
    expect(button('Natur')).toBeTruthy()
    expect(button('Stadt')).toBeTruthy()
    const srcs = [...body().querySelectorAll('img')].map((i) => i.getAttribute('src'))
    expect(srcs).toEqual(['g/wald-t.jpg', 'g/see.jpg'])
    expect(text()).toContain('Wald')
    expect(text()).toContain('See')
  })

  it('Laden und leere Kategorie', () => {
    mountModal({ replaceGalleryLoading: true })
    expect(text()).toContain(de.common.loading)
    expect(body().querySelector('img')).toBeNull()
    wrapper!.unmount()
    mountModal({ replaceGalleryImages: [] })
    expect(text()).toContain(de.common.noResults)
  })
})

describe('Ersatz-Galerie – Auswahl', () => {
  it('Kategorie wählen meldet die ID', () => {
    const fns = mountModal()
    button('Stadt')!.click()
    expect(fns.selectReplaceGalleryCategory).toHaveBeenCalledWith('city')
  })

  it('Bild wählen meldet das Bild', () => {
    const fns = mountModal()
    tile('g/see.jpg')!.click()
    expect(fns.selectReplaceGalleryImage).toHaveBeenCalledWith(images[1])
  })

  it('„Bild ersetzen“ erst mit Auswahl aktiv', async () => {
    const fns = mountModal()
    expect(button(A.replaceImage)!.disabled).toBe(true)
    await wrapper!.setProps({ selectedReplaceImage: images[0] })
    expect(button(A.replaceImage)!.disabled).toBe(false)
    button(A.replaceImage)!.click()
    expect(fns.confirmReplaceFromGallery).toHaveBeenCalledTimes(1)
  })
})

describe('Ersatz-Galerie – Schließen', () => {
  it('Abbrechen schließt', () => {
    const fns = mountModal()
    button(de.common.cancel)!.click()
    expect(fns.closeReplaceGallery).toHaveBeenCalledTimes(1)
  })

  it('Klick auf den Hintergrund schließt, Klick ins Raster nicht', () => {
    const fns = mountModal()
    body()
      .querySelector('img')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(fns.closeReplaceGallery).not.toHaveBeenCalled()
    overlay()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(fns.closeReplaceGallery).toHaveBeenCalledTimes(1)
  })

  it('Schließen-Knopf schließt', () => {
    const fns = mountModal()
    buttons()
      .find(
        (b) => b.getAttribute('aria-label') === de.common.close || b.textContent!.trim() === '×',
      )!
      .click()
    expect(fns.closeReplaceGallery).toHaveBeenCalledTimes(1)
  })
})

describe('Ersatz-Galerie – Sprache', () => {
  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountModal()
      expect(text()).toContain(en.app.selectFromGallery)
      expect(text()).toContain(en.app.replaceImage)
      expect(text()).not.toContain(A.selectFromGallery)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Ersatz-Galerie – Ui-Bausteine', () => {
  it('Dialog mit Titel, Escape schließt', () => {
    const fns = mountModal()
    const dialog = body().querySelector('[role="dialog"]')
    const titleId = dialog!.getAttribute('aria-labelledby')
    expect(document.getElementById(titleId!)!.textContent).toBe(A.selectFromGallery)
    dialog!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(fns.closeReplaceGallery).toHaveBeenCalledTimes(1)
  })

  it('Kategorien als Radiogroup, Bilder als Knöpfe mit Namen und aria-pressed', () => {
    mountModal({ selectedReplaceImage: images[1] })
    const group = body().querySelector('[role="radiogroup"]')
    expect(group!.getAttribute('aria-label')).toBe(de.backgroundTiles.galleryCategories)
    expect(group!.querySelector('[aria-checked="true"]')!.textContent).toContain('Natur')
    const tiles = [...body().querySelectorAll('button[aria-pressed]')]
    expect(tiles.map((b) => b.getAttribute('aria-label'))).toEqual(['Wald', 'See'])
    expect(tiles.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true'])
  })

  it('Kategorienamen folgen der Sprache (name_en)', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountModal()
      expect(button('Nature')).toBeTruthy()
      expect(button('City')).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })

  it('liegt im DOM nach der Bildvorschau, damit sie bei gleicher Ebene oben ist', () => {
    const app = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../VisualizerApp.vue'),
      'utf8',
    )
    expect(app.indexOf('<ReplaceGalleryModal')).toBeGreaterThan(app.indexOf('<ImagePreviewModal'))
  })
})
