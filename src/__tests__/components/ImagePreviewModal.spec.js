// @vitest-environment jsdom
// Charakterisierung der Bildvorschau (Doppelklick auf ein Canvas-Bild).
// Zugriff über sichtbare Texte statt CSS-Klassen, damit die Tests den Wechsel
// auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImagePreviewModal from '../../components/canvas-bar/ImagePreviewModal.vue'
import { useI18n } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const A = de.app
let wrapper

const imageData = {
  id: 'img-1',
  imageObject: { src: 'data:image/png;base64,AAA', naturalWidth: 800, naturalHeight: 600 },
  relX: 0.25,
  relY: 0.5,
  relWidth: 0.4,
  relHeight: 0.3,
}

function handlers() {
  return {
    closeImagePreview: vi.fn(),
    handleReplaceCanvasImage: vi.fn(),
    openReplaceGallery: vi.fn(),
    cancelPendingReplace: vi.fn(),
    confirmPendingReplace: vi.fn(),
  }
}

function mountModal(props = {}) {
  const { t } = useI18n()
  const fns = handlers()
  wrapper = mount(ImagePreviewModal, {
    attachTo: document.body,
    props: {
      showImagePreview: true,
      previewImageData: imageData,
      previewImageIndex: 1,
      canvasImagesCount: 3,
      pendingReplaceImageSrc: null,
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
  vi.restoreAllMocks()
})

const body = () => document.body
const text = () => body().textContent.replace(/\s+/g, ' ')
const buttons = () => [...body().querySelectorAll('button')]
const button = (label) => buttons().find((b) => b.textContent.includes(label))
/** Die abgedunkelte Ebene hinter dem Dialog. */
const overlay = () =>
  body().querySelector('[role="dialog"]')?.parentElement ??
  [...body().children].find((el) => el.querySelector(`img[src="${imageData.imageObject.src}"]`))

describe('Bildvorschau – Anzeige', () => {
  it('ist geschlossen unsichtbar', () => {
    mountModal({ showImagePreview: false })
    expect(body().querySelector('img')).toBeNull()
    expect(text()).not.toContain(A.imageMetadata)
  })

  it('zeigt Bild und Bildinformationen', () => {
    mountModal()
    expect(body().querySelector(`img[src="${imageData.imageObject.src}"]`)).toBeTruthy()
    const s = text()
    expect(s).toContain(A.imageMetadata)
    expect(s).toContain(A.layer)
    expect(s).toContain('2 / 3')
    expect(s).toContain(A.dimensions)
    expect(s).toContain('800 × 600 px')
    expect(s).toContain(A.position)
    expect(s).toContain('X: 25%, Y: 50%')
    expect(s).toContain(de.common.size)
    expect(s).toContain('40% × 30%')
  })

  it('ohne Bilddaten keine Werte und kein Fehler', () => {
    mountModal({ previewImageData: null })
    expect(text()).not.toContain('800 × 600')
    expect(button(A.uploadImage)).toBeTruthy()
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountModal()
      expect(text()).toContain(en.app.imageMetadata)
      expect(text()).toContain(en.app.uploadImage)
      expect(text()).not.toContain(A.imageMetadata)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Bildvorschau – Dateiname', () => {
  const fileNameEl = () => body().querySelector('[data-testid="preview-file-name"]')

  it('zeigt den Dateinamen als erstes Feld, voller Name als Tooltip', () => {
    mountModal({ previewImageData: { ...imageData, name: 'snovi moji.png' } })
    const first = body().querySelector('dl > div')
    expect(first.querySelector('dt').textContent.trim()).toBe(A.fileName)
    expect(fileNameEl().textContent.replace(/\s+/g, ' ').trim()).toBe('snovi moji.png')
    expect(fileNameEl().getAttribute('title')).toBe('snovi moji.png')
  })

  it('lange Namen: Stamm kürzbar, Endung bleibt separat sichtbar', () => {
    const name = 'ein-sehr-langer-dateiname-aus-der-kamera-2026-11-09_18-04-46.jpeg'
    mountModal({ previewImageData: { ...imageData, name } })
    expect(fileNameEl().querySelector('.preview-file-base').textContent).toBe(
      name.slice(0, -'.jpeg'.length),
    )
    expect(fileNameEl().querySelector('.preview-file-ext').textContent).toBe('.jpeg')
    expect(fileNameEl().getAttribute('title')).toBe(name)
  })

  it('ohne gespeicherten Namen: „Unbekannt“, kein Tooltip', () => {
    mountModal({ previewImageData: { ...imageData, name: null } })
    expect(fileNameEl().textContent.trim()).toBe(A.fileNameUnknown)
    expect(fileNameEl().hasAttribute('title')).toBe(false)
  })

  it('englische Beschriftung', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountModal({ previewImageData: { ...imageData, name: 'house.jpg' } })
      expect(text()).toContain(en.app.fileName)
      expect(text()).toContain('house.jpg')
    } finally {
      await setLocale('de')
    }
  })
})

describe('Bildvorschau – Schließen', () => {
  it('Klick auf den Hintergrund schließt', () => {
    const fns = mountModal()
    overlay().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(fns.closeImagePreview).toHaveBeenCalledTimes(1)
  })

  it('Klick in die Vorschau schließt nicht', () => {
    const fns = mountModal()
    body().querySelector(`img[src="${imageData.imageObject.src}"]`).click()
    expect(fns.closeImagePreview).not.toHaveBeenCalled()
  })

  it('Schließen-Knopf schließt', () => {
    const fns = mountModal()
    const close = buttons().find(
      (b) => b.getAttribute('aria-label') === de.common.close || b.textContent.trim() === '×',
    )
    close.click()
    expect(fns.closeImagePreview).toHaveBeenCalledTimes(1)
  })
})

describe('Bildvorschau – Ersetzen', () => {
  it('„Bild hochladen“ öffnet die Dateiauswahl, Auswahl geht an den Handler', () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const fns = mountModal()
    button(A.uploadImage).click()
    expect(clickSpy).toHaveBeenCalledTimes(1)
    const input = body().querySelector('input[type="file"]')
    expect(input.getAttribute('accept')).toBe('image/*')
    input.dispatchEvent(new Event('change'))
    expect(fns.handleReplaceCanvasImage).toHaveBeenCalledTimes(1)
  })

  it('„Aus Galerie“ öffnet die Ersatz-Galerie', () => {
    const fns = mountModal()
    button(A.fromGallery).click()
    expect(fns.openReplaceGallery).toHaveBeenCalledTimes(1)
  })

  it('ohne neues Bild keine Bestätigung', () => {
    mountModal()
    expect(text()).not.toContain(A.newImagePreview)
    expect(button(A.confirmReplace)).toBeUndefined()
  })

  it('neues Bild: Vorschau, Abbrechen und Bestätigen', () => {
    const fns = mountModal({ pendingReplaceImageSrc: 'data:image/png;base64,NEW' })
    expect(text()).toContain(A.newImagePreview)
    expect(body().querySelector('img[src="data:image/png;base64,NEW"]')).toBeTruthy()
    button(de.common.cancel).click()
    expect(fns.cancelPendingReplace).toHaveBeenCalledTimes(1)
    button(A.confirmReplace).click()
    expect(fns.confirmPendingReplace).toHaveBeenCalledTimes(1)
  })
})

describe('Bildvorschau – Ui-Bausteine', () => {
  it('Dialog mit Titel „Bildvorschau“, Escape schließt', async () => {
    const fns = mountModal()
    const dialog = body().querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    const titleId = dialog.getAttribute('aria-labelledby')
    expect(document.getElementById(titleId).textContent).toBe(A.imagePreview)
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(fns.closeImagePreview).toHaveBeenCalledTimes(1)
  })

  it('Bildinformationen als Begriffsliste, Bilder mit Alternativtext', () => {
    mountModal({ pendingReplaceImageSrc: 'data:image/png;base64,NEW' })
    const terms = [...body().querySelectorAll('dt')].map((el) => el.textContent.trim())
    expect(terms).toEqual([A.fileName, A.layer, A.dimensions, A.position, de.common.size])
    for (const img of body().querySelectorAll('img')) expect(img.getAttribute('alt')).toBeTruthy()
  })

  it('offene Ersatz-Galerie: Escape und Hintergrund schließen die Vorschau nicht', () => {
    const fns = mountModal({ replaceGalleryOpen: true })
    const dialog = body().querySelector('[role="dialog"]')
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    overlay().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(fns.closeImagePreview).not.toHaveBeenCalled()
  })

  it('Knöpfe sind Ui-Buttons, Bestätigen ist primär', () => {
    mountModal({ pendingReplaceImageSrc: 'data:image/png;base64,NEW' })
    for (const label of [A.uploadImage, A.fromGallery, de.common.cancel]) {
      expect(button(label).classList.contains('ui-button--secondary')).toBe(true)
    }
    expect(button(A.confirmReplace).classList.contains('ui-button--primary')).toBe(true)
  })
})
