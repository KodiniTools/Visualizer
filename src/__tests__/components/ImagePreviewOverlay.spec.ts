// @vitest-environment jsdom
// Charakterisierung der Bild-Vorschau im Foto-Panel und in der Galerie.
// Zugriff über Texte, Namen und Rollen statt CSS-Klassen, damit die Tests den
// Wechsel auf UiDialog unverändert überstehen.
import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ImagePreviewOverlay from '../../components/foto-panel/ImagePreviewOverlay.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'
import { stub } from '../helpers/canvasStubs'
import type { ImagePreview } from '../../components/foto-panel/ImagePreviewOverlay.vue'

const F = de.foto
const image = { src: 'data:,x', name: 'urlaub.jpg' }
let wrapper: VueWrapper | null

function mountPreview(previewImage: typeof image | null = image) {
  wrapper = mount(ImagePreviewOverlay, {
    attachTo: document.body,
    props: { previewImage: stub<ImagePreview | null>(previewImage) },
    global: { stubs: { transition: false } },
  })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const body = () => document.body
const text = () => body().textContent!.replace(/\s+/g, ' ')
const buttons = () => [...body().querySelectorAll('button')]
const button = (name: string) =>
  buttons().find((b) => b.textContent!.trim() === name || b.getAttribute('aria-label') === name)
/** Abgedunkelte Ebene hinter der Vorschau. */
const overlay = () =>
  body().querySelector('[role="dialog"]')?.parentElement ??
  body().querySelector('img')!.closest('div')!.parentElement

describe('Bild-Vorschau – Anzeige', () => {
  it('ohne Bild nichts', () => {
    mountPreview(null)
    expect(body().querySelector('img')).toBeNull()
  })

  it('Bild, Name und zwei Aktionen', () => {
    mountPreview()
    expect(body().querySelector('img')!.getAttribute('src')).toBe('data:,x')
    expect(text()).toContain('urlaub.jpg')
    expect(button(F.placeOnCanvas)).toBeTruthy()
    expect(button(F.asBackground)).toBeTruthy()
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountPreview()
      expect(button(en.foto.placeOnCanvas)).toBeTruthy()
      expect(button(en.foto.asBackground)).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Bild-Vorschau – Bedienung', () => {
  it('Aktionen melden sich', () => {
    mountPreview()
    button(F.placeOnCanvas)!.click()
    button(F.asBackground)!.click()
    expect(wrapper!.emitted('add-to-canvas')).toHaveLength(1)
    expect(wrapper!.emitted('set-as-background')).toHaveLength(1)
  })

  it('Klick auf das Bild schließt nicht, Klick auf den Hintergrund schon', () => {
    mountPreview()
    body()
      .querySelector('img')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(wrapper!.emitted('close')).toBeUndefined()
    overlay()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(wrapper!.emitted('close')).toHaveLength(1)
  })

  it('Schließen-Knopf schließt', () => {
    mountPreview()
    buttons()
      .find(
        (b) => b.getAttribute('aria-label') === de.common.close || b.textContent!.trim() === '✕',
      )!
      .click()
    expect(wrapper!.emitted('close')).toHaveLength(1)
  })
})

describe('Bild-Vorschau – Ui-Bausteine', () => {
  it('Dialog mit Bildname als Titel, Escape schließt', () => {
    mountPreview()
    const dialog = body().querySelector('[role="dialog"]')
    expect(document.getElementById(dialog!.getAttribute('aria-labelledby')!)!.textContent).toBe(
      'urlaub.jpg',
    )
    dialog!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper!.emitted('close')).toHaveLength(1)
  })

  it('Aktionen als Ui-Buttons, Platzieren primär', () => {
    mountPreview()
    expect(button(F.placeOnCanvas)!.classList.contains('ui-button--primary')).toBe(true)
    expect(button(F.asBackground)!.classList.contains('ui-button')).toBe(true)
    expect(text()).not.toContain('✕')
  })
})
