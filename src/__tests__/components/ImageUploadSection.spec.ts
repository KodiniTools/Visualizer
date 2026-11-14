// @vitest-environment jsdom
// Charakterisierung des Bild-Uploads im Foto-Panel (Upload-Fläche, Galerie,
// Auswahl, Aktionen). Zugriff über Texte, Namen und Rollen statt CSS-Klassen,
// damit die Tests den Wechsel auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ImageUploadSection from '../../components/foto-panel/ImageUploadSection.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'
import { stub } from '../helpers/canvasStubs'
import type { GalleryImage } from '../../composables/useImageGallery'
import {
  createImageAnimation,
  type ImageTimedAnimation,
} from '../../lib/canvasObjects/imageAnimation'

const F = de.foto
const gallery = [
  { id: '1', name: 'eins.webp', dimensions: '10×10', img: { src: 'data:,1' } },
  { id: '2', name: 'zwei.webp', dimensions: '20×20', img: { src: 'data:,2' } },
]
let wrapper: VueWrapper | null

function mountSection({
  images = gallery,
  selected = [],
  newImageAnimation = null,
  activeCanvasImage = null,
}: {
  images?: typeof gallery
  selected?: number[]
  newImageAnimation?: ImageTimedAnimation | null
  activeCanvasImage?: { name?: string | null } | null
} = {}) {
  const set = new Set(selected)
  wrapper = mount(ImageUploadSection, {
    attachTo: document.body,
    props: {
      imageGallery: stub<GalleryImage[]>(images),
      selectedImageIndices: set,
      selectedImageCount: set.size,
      newImageAnimation,
      activeCanvasImage,
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
/** Galerie-Kachel über das Bild. */
const tile = (i: number) =>
  root()
    .querySelector(`img[src="data:,${i + 1}"]`)
    .closest('[draggable="true"]')

describe('Bild-Upload – Upload-Fläche', () => {
  it('Titel, Upload-Hinweise und leerer Zustand', () => {
    mountSection({ images: [] })
    expect(text()).toContain(F.ownImages)
    expect(text()).toContain(F.clickToUpload)
    expect(text()).toContain(F.multipleImagesHint)
    expect(text()).toMatch(/Strg\+V|Ctrl\+V/)
    expect(text()).toContain(F.noImagesUploaded)
  })

  it('Klick auf die Fläche öffnet die Dateiauswahl, Auswahl meldet upload', () => {
    mountSection({ images: [] })
    const input = root().querySelector('input[type="file"]')
    const click = vi.spyOn(input, 'click')
    root().querySelector('.upload-area').click()
    expect(click).toHaveBeenCalled()
    input.dispatchEvent(new Event('change'))
    expect(wrapper!.emitted('upload')).toHaveLength(1)
  })

  it('Einfügen eines Bildes per Strg+V meldet upload mit der Datei', () => {
    mountSection({ images: [] })
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const ev = new Event('paste') as Event & { clipboardData?: unknown }
    ev.clipboardData = { items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] }
    document.dispatchEvent(ev)
    expect(
      wrapper!.emitted<[{ target: { files: unknown } }]>('upload')![0]![0].target.files,
    ).toEqual([file])
  })
})

describe('Bild-Upload – Galerie', () => {
  it('Anzahl, Namen und Größen; ohne Auswahl keine Aktionen', () => {
    mountSection()
    expect(text()).toContain(`${F.gallery} (2)`)
    expect(text()).toContain('eins.webp')
    expect(text()).toContain('20×20')
    expect(button(F.placeOnCanvas)).toBeUndefined()
  })

  it('Klick wählt, Doppelklick öffnet die Vorschau, Löschen nur dieses Bild', () => {
    mountSection()
    tile(1).click()
    expect(wrapper!.emitted('select-image')![0]![0]).toBe(1)
    tile(0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(wrapper!.emitted('open-preview')![0]![0]).toEqual(gallery[0])
    const del = [...tile(1).querySelectorAll('button')].pop()
    del.click()
    expect(wrapper!.emitted('delete-image')![0]).toEqual([1])
    expect(wrapper!.emitted('select-image')).toHaveLength(1)
  })

  it('Checkbox wählt additiv (ctrlKey)', () => {
    mountSection()
    tile(0).querySelector('[role="checkbox"]').click()
    expect(wrapper!.emitted('select-image')![0]).toEqual([0, { ctrlKey: true }])
  })

  it('Alle auswählen / Auswahl aufheben / Alle löschen', () => {
    mountSection({ selected: [0] })
    button(F.selectAll).click()
    button(F.deselectAll).click()
    button(F.deleteAll).click()
    expect(wrapper!.emitted('select-all')).toHaveLength(1)
    expect(wrapper!.emitted('deselect-all')).toHaveLength(1)
    expect(wrapper!.emitted('clear-all')).toHaveLength(1)
    expect(text()).toContain(`1 ${F.selected}`)
  })

  it('Ziehen meldet Start mit Bild und Ende', () => {
    mountSection()
    tile(0).dispatchEvent(new Event('dragstart', { bubbles: true }))
    tile(0).dispatchEvent(new Event('dragend', { bubbles: true }))
    expect(wrapper!.emitted<[{ imgData: unknown }]>('image-dragstart')![0]![0].imgData).toEqual(
      gallery[0],
    )
    expect(wrapper!.emitted('image-dragend')).toHaveLength(1)
  })
})

describe('Bild-Upload – Aktionen', () => {
  it('ein Bild: Hintergrund, Workspace-Hintergrund, Platzierungs-Einstellungen', () => {
    mountSection({ selected: [0] })
    // „Auf Canvas platzieren“ ignorierte Effekt/Größe/Versatz der Platzierung
    // und ist entfernt – platziert wird über „Platzieren“ unter „Platzierung“
    expect(button(F.placeOnCanvas)).toBeUndefined()
    button(F.asBackground).click()
    button(F.asWorkspaceBackground).click()
    expect(wrapper!.emitted('add-to-canvas')).toBeUndefined()
    expect(wrapper!.emitted('set-as-background')).toHaveLength(1)
    expect(wrapper!.emitted('set-as-workspace-background')).toHaveLength(1)
    expect(root().querySelector('[data-placement]')).toBeTruthy()
  })

  it('zwei Bilder: „2 Bilder auf Canvas“, keine Hintergrund-Aktionen', () => {
    mountSection({ selected: [0, 1] })
    button('2 Bilder auf Canvas').click()
    expect(wrapper!.emitted('add-to-canvas')).toHaveLength(1)
    expect(button(F.asBackground)).toBeUndefined()
    expect(root().querySelector('[data-placement]')).toBeNull()
  })

  it('EN: Galerie und Mehrfach-Aktion übersetzt', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountSection({ selected: [0, 1] })
      expect(text()).toContain('Gallery (2)')
      expect(button('2 images on Canvas')).toBeTruthy()
      expect(text()).toContain('Ctrl+V')
    } finally {
      await setLocale('de')
    }
  })
})

describe('Bild-Upload – Ui-Bausteine', () => {
  it('Upload-Fläche ist ein Knopf, Dateiauswahl öffnet genau einmal', () => {
    mountSection({ images: [] })
    const area = root().querySelector('.upload-area')
    expect(area.tagName).toBe('BUTTON')
    // Eingabefeld liegt außerhalb der Fläche: sein Klick löst die Fläche nicht erneut aus
    const input = root().querySelector('input[type="file"]')
    expect(area.contains(input)).toBe(false)
    const click = vi.spyOn(input, 'click')
    area.click()
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('Galerie-Knöpfe und Aktionen sind Ui-Buttons, „Alle löschen“ danger', () => {
    mountSection({ selected: [0] })
    for (const n of [F.selectAll, F.deselectAll, F.deleteAll, F.asBackground]) {
      expect(button(n).classList.contains('ui-button'), n).toBe(true)
    }
    expect(button(F.deleteAll).classList.contains('ui-button--danger')).toBe(true)
    wrapper!.unmount()
    mountSection({ selected: [0, 1] })
    expect(button('2 Bilder auf Canvas').classList.contains('ui-button--primary')).toBe(true)
  })

  it('Kacheln per Tastatur wählbar, Löschen als Ui-Icon-Button mit Namen', () => {
    mountSection({ selected: [1] })
    const t0 = tile(0)
    expect(t0.getAttribute('role')).toBe('button')
    expect(t0.getAttribute('aria-label')).toBe('eins.webp')
    expect(tile(1).getAttribute('aria-pressed')).toBe('true')
    t0.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(wrapper!.emitted('select-image')![0]![0]).toBe(0)
    const del = button(F.deleteImage)
    expect(del.classList.contains('ui-icon-button')).toBe(true)
    expect(text()).not.toMatch(/[✕✓]/u)
  })

  it('Checkbox per Tastatur bedienbar', () => {
    mountSection()
    const cb = tile(1).querySelector('[role="checkbox"]')
    expect(cb.getAttribute('tabindex')).toBe('0')
    cb.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(wrapper!.emitted('select-image')![0]).toEqual([1, { ctrlKey: true }])
  })
})

describe('Bild-Upload – „Animation beim Hinzufügen“ bei ausgewähltem Canvas-Bild', () => {
  it('ohne ausgewähltes Canvas-Bild kein Hinweis und kein Übertragen-Button', () => {
    mountSection({ selected: [0], newImageAnimation: createImageAnimation() })
    expect(text()).toContain(F.newImageAnimation)
    expect(text()).not.toContain(F.newImageAnimationSelected)
    expect(button(F.applyAnimationToSelected)).toBeUndefined()
  })

  it('mit ausgewähltem Bild: Hinweis mit Name und Ui-Button, der das Übertragen meldet', () => {
    mountSection({
      selected: [0],
      newImageAnimation: createImageAnimation(),
      activeCanvasImage: { name: 'logo.png' },
    })
    expect(text()).toContain(F.newImageAnimationSelectedNamed.replace('{name}', 'logo.png'))
    const apply = button(F.applyAnimationToSelected)
    expect(apply.classList.contains('ui-button')).toBe(true)
    apply.click()
    expect(wrapper!.emitted('apply-animation-to-active-image')).toHaveLength(1)
  })

  it('ohne bekannten Namen der allgemeine Hinweis', () => {
    mountSection({
      selected: [0],
      newImageAnimation: createImageAnimation(),
      activeCanvasImage: { name: null },
    })
    expect(text()).toContain(F.newImageAnimationSelected)
  })

  it('Englische Texte vorhanden', () => {
    const E = en.foto
    for (const key of [
      'newImageAnimationSelected',
      'newImageAnimationSelectedNamed',
      'applyAnimationToSelected',
      'animationAppliedToSelected',
    ] as const) {
      expect(E[key], key).toBeTruthy()
      expect(F[key], key).toBeTruthy()
    }
  })
})
