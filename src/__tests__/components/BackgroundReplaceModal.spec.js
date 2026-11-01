// @vitest-environment jsdom
// Charakterisierung des Dialogs „Hintergrund ersetzen“. Zugriff über sichtbare
// Texte und Labels statt CSS-Klassen, damit die Tests den Wechsel auf die
// Ui-Bausteine unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import BackgroundReplaceModal from '../../components/canvas-control/background/BackgroundReplaceModal.vue'
import { useBgReplace } from '../../composables/bg/useBgReplace.js'
import de from '../../lib/i18n/de.js'

const C = de.canvasControl
const A = de.app
let wrapper
let bg
let canvasManager

/** Bild-Attrappe, die sofort „lädt“. */
class FakeImage {
  set src(v) {
    this._src = v
    queueMicrotask(() => this.onload?.())
  }
  get src() {
    return this._src
  }
}

function stubGallery() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => ({
      ok: true,
      json: async () =>
        String(url).includes('gallery.json')
          ? {
              _version: '2.0',
              categories: [
                { id: 'nature', name: 'Natur', name_en: 'Nature', icon: '🌿', jsonFile: 'n.json' },
                { id: 'city', name: 'Stadt', name_en: 'City', icon: '🏙️', jsonFile: 'c.json' },
              ],
            }
          : {
              images: [
                { file: `${url}-1.jpg`, name: 'Wald' },
                { file: `${url}-2.jpg`, name: 'See' },
              ],
            },
    })),
  )
}

function mountModal(type = 'background') {
  canvasManager = ref({
    replaceBackground: vi.fn(() => true),
    replaceWorkspaceBackground: vi.fn(() => true),
  })
  bg = useBgReplace(canvasManager, {
    backgroundImageSrc: ref('data:image/png;base64,bg'),
    workspaceBackgroundImageSrc: ref('data:image/png;base64,ws'),
  })
  wrapper = mount(BackgroundReplaceModal, {
    attachTo: document.body,
    global: { provide: { bgSettings: bg } },
  })
  bg.openBackgroundReplaceModal(type)
  return flushPromises()
}

const body = () => document.body
function button(text) {
  const el = [...body().querySelectorAll('button')].find(
    (b) =>
      b.textContent.replace(/\s+/g, ' ').trim() === text ||
      b.getAttribute('aria-label') === text ||
      b.getAttribute('title') === text,
  )
  expect(el, `Knopf „${text}“`).toBeTruthy()
  return el
}
async function click(text) {
  button(text).click()
  await flushPromises()
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('Image', FakeImage)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Hintergrund ersetzen – Dialog', () => {
  it('Titel je Typ, Hinweis und aktuelles Bild', async () => {
    await mountModal('background')
    expect(body().textContent).toContain(C.replaceBackground)
    expect(body().textContent).toContain(C.audioReactiveKept)
    expect(body().querySelector('img[src="data:image/png;base64,bg"]')).toBeTruthy()
    bg.closeBackgroundReplaceModal()
    bg.openBackgroundReplaceModal('workspace')
    await flushPromises()
    expect(body().textContent).toContain(C.replaceWorkspaceBackground)
    expect(body().querySelector('img[src="data:image/png;base64,ws"]')).toBeTruthy()
  })

  it('Schließen-Knopf schließt den Dialog', async () => {
    await mountModal()
    const close = [...body().querySelectorAll('button')].find(
      (b) => b.textContent.trim() === '×' || b.getAttribute('aria-label') === de.common.close,
    )
    close.click()
    await flushPromises()
    expect(bg.showBackgroundReplaceModal.value).toBe(false)
    expect(body().textContent).not.toContain(C.replaceBackground)
  })

  it('„Bild hochladen“ öffnet die Dateiauswahl; Datei → Vorschau → Ersetzen', async () => {
    await mountModal()
    const input = body().querySelector('input[type="file"]')
    const clickSpy = vi.fn()
    input.addEventListener('click', clickSpy)
    await click(A.uploadImage)
    expect(clickSpy).toHaveBeenCalled()

    // Vorschau direkt setzen (FileReader liest in jsdom asynchron)
    bg.pendingBackgroundReplaceImage.value = new FakeImage()
    bg.pendingBackgroundReplaceSrc.value = 'data:image/png;base64,new'
    await flushPromises()
    expect(body().querySelector('img[src="data:image/png;base64,new"]')).toBeTruthy()
    await click(A.confirmReplace)
    expect(canvasManager.value.replaceBackground).toHaveBeenCalled()
    expect(bg.showBackgroundReplaceModal.value).toBe(false)
  })

  it('Vorschau abbrechen verwirft das neue Bild', async () => {
    await mountModal()
    bg.pendingBackgroundReplaceImage.value = new FakeImage()
    bg.pendingBackgroundReplaceSrc.value = 'data:image/png;base64,new'
    await flushPromises()
    await click(de.common.cancel)
    expect(bg.pendingBackgroundReplaceSrc.value).toBe(null)
    expect(bg.showBackgroundReplaceModal.value).toBe(true)
  })
})

describe('Hintergrund ersetzen – Galerie', () => {
  it('Kategorien, Bildauswahl, „Bild auswählen“ übernimmt in die Vorschau', async () => {
    stubGallery()
    await mountModal('workspace')
    await click(A.fromGallery)
    expect(body().textContent).toContain('Natur')
    expect(body().textContent).toContain('Stadt')
    expect(body().querySelectorAll('img[src^="n.json"]')).toHaveLength(2)
    expect(button(A.selectImage).disabled).toBe(true)

    body().querySelector('img[src="n.json-2.jpg"]').click()
    await flushPromises()
    expect(bg.selectedBgGalleryImage.value.name).toBe('See')
    expect(button(A.selectImage).disabled).toBe(false)

    const city = [...body().querySelectorAll('button')].find((b) => b.textContent.includes('Stadt'))
    city.click()
    await flushPromises()
    expect(fetch).toHaveBeenCalledWith('c.json')
    expect(body().querySelectorAll('img[src^="c.json"]')).toHaveLength(2)

    body().querySelector('img[src="c.json-1.jpg"]').click()
    await flushPromises()
    await click(A.selectImage)
    await flushPromises()
    expect(bg.pendingBackgroundReplaceSrc.value).toBe('c.json-1.jpg')
    expect(bg.showBgReplaceGallery.value).toBe(false)
    await click(A.confirmReplace)
    expect(canvasManager.value.replaceWorkspaceBackground).toHaveBeenCalled()
  })

  it('Abbrechen schließt nur die Galerie', async () => {
    stubGallery()
    await mountModal()
    await click(A.fromGallery)
    await click(de.common.cancel)
    expect(bg.showBgReplaceGallery.value).toBe(false)
    expect(bg.showBackgroundReplaceModal.value).toBe(true)
  })

  it('leere Kategorie zeigt „Keine Ergebnisse“', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () =>
          String(url).includes('gallery.json')
            ? { _version: '2.0', categories: [{ id: 'x', name: 'Leer', jsonFile: 'x.json' }] }
            : { images: [] },
      })),
    )
    await mountModal()
    await click(A.fromGallery)
    expect(body().textContent).toContain(de.common.noResults)
  })
})

describe('Hintergrund ersetzen – Ui-Bausteine', () => {
  it('Dialog-Baustein mit Titel, Escape schließt, Kategorien als Radiogroup', async () => {
    stubGallery()
    await mountModal()
    const dialog = body().querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    const titleId = dialog.getAttribute('aria-labelledby')
    expect(document.getElementById(titleId).textContent).toBe(C.replaceBackground)

    await click(A.fromGallery)
    const group = body().querySelector('[role="radiogroup"]')
    expect(group.getAttribute('aria-label')).toBe(de.backgroundTiles.galleryCategories)
    expect(group.querySelector('[aria-checked="true"]').textContent).toContain('Natur')
    // Bilder sind Knöpfe mit Namen und gedrücktem Zustand
    const see = button('See')
    see.click()
    await flushPromises()
    expect(see.getAttribute('aria-pressed')).toBe('true')

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(bg.showBackgroundReplaceModal.value).toBe(false)
  })
})
