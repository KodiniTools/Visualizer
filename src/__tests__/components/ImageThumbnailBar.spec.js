// @vitest-environment jsdom
// Charakterisierung der Bildleiste über dem Canvas („Bilder auf Canvas“).
// Zugriff über Bilder, Texte und Labels statt CSS-Klassen, damit die Tests
// den Wechsel auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageThumbnailBar from '../../components/canvas-bar/ImageThumbnailBar.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const A = de.app
let wrapper

beforeAll(() => {
  // jsdom kennt keinen ResizeObserver
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  }
})

const makeImages = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `img-${i}`,
    imageObject: { src: `data:image/png;base64,${i}` },
  }))

function mountBar(props = {}) {
  const { t } = useI18n()
  const fns = {
    selectCanvasImage: vi.fn(),
    openImagePreview: vi.fn(),
    deleteCanvasImage: vi.fn(),
    deleteAllCanvasImages: vi.fn(),
    handleDragStart: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
  }
  wrapper = mount(ImageThumbnailBar, {
    attachTo: document.body,
    props: {
      canvasImages: makeImages(3),
      selectedCanvasImageId: null,
      draggedImageIndex: null,
      dragOverIndex: null,
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

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ')
const imgs = () => [...root().querySelectorAll('img')]
const thumbImg = (i) => root().querySelector(`img[src="data:image/png;base64,${i}"]`)
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
const deleteButtons = () =>
  [...root().querySelectorAll('button')].filter(
    (b) => (b.getAttribute('aria-label') || b.getAttribute('title')) === A.deleteImage,
  )
const deleteAll = () =>
  [...root().querySelectorAll('button')].find((b) => b.textContent.includes(A.deleteAllImages))

describe('Bildleiste – Anzeige', () => {
  it('zeigt Überschrift, ein Vorschaubild pro Bild und die Ebenennummern', () => {
    mountBar()
    expect(text()).toContain(A.imagesOnCanvas)
    expect(imgs()).toHaveLength(3)
    expect(text()).toMatch(/1.*2.*3/)
    expect(deleteButtons()).toHaveLength(3)
    expect(deleteAll()).toBeTruthy()
  })

  it('rendert bei vielen Bildern nur einen Ausschnitt (virtuelles Scrollen)', () => {
    mountBar({ canvasImages: makeImages(200) })
    expect(imgs().length).toBeGreaterThan(0)
    expect(imgs().length).toBeLessThan(40)
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountBar()
      expect(text()).toContain(en.app.imagesOnCanvas)
      expect(text()).toContain(en.app.deleteAllImages)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Bildleiste – Bedienung', () => {
  it('Klick wählt, Doppelklick öffnet die Vorschau mit Index', () => {
    const images = makeImages(3)
    const fns = mountBar({ canvasImages: images })
    thumbImg(1).click()
    expect(fns.selectCanvasImage).toHaveBeenCalledWith(images[1])
    thumbImg(2).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(fns.openImagePreview).toHaveBeenCalledWith(images[2], 2)
  })

  it('Löschen entfernt nur dieses Bild und wählt es nicht aus', () => {
    const fns = mountBar()
    deleteButtons()[1].click()
    expect(fns.deleteCanvasImage).toHaveBeenCalledWith('img-1')
    expect(fns.selectCanvasImage).not.toHaveBeenCalled()
  })

  it('„Alle löschen“ ruft den Handler', () => {
    const fns = mountBar()
    deleteAll().click()
    expect(fns.deleteAllCanvasImages).toHaveBeenCalledTimes(1)
  })

  it('Ziehen meldet Start, Über, Verlassen, Ablegen und Ende mit Index', () => {
    const fns = mountBar()
    fire(thumbImg(0), 'dragstart')
    expect(fns.handleDragStart).toHaveBeenCalledWith(expect.any(Event), 0)
    fire(thumbImg(2), 'dragover')
    expect(fns.handleDragOver).toHaveBeenCalledWith(expect.any(Event), 2)
    fire(thumbImg(2), 'dragleave')
    expect(fns.handleDragLeave).toHaveBeenCalled()
    fire(thumbImg(2), 'drop')
    expect(fns.handleDrop).toHaveBeenCalledWith(expect.any(Event), 2)
    fire(thumbImg(0), 'dragend')
    expect(fns.handleDragEnd).toHaveBeenCalled()
  })

  it('Vorschaubilder sind ziehbar, das Bild selbst nicht', () => {
    mountBar()
    const img = thumbImg(0)
    expect(img.getAttribute('draggable')).toBe('false')
    expect(img.closest('[draggable="true"]')).toBeTruthy()
  })
})

describe('Bildleiste – Ui-Bausteine und Zugänglichkeit', () => {
  it('Vorschaubilder sind Knöpfe mit Ebene als Name und aria-pressed', () => {
    mountBar({ selectedCanvasImageId: 'img-1' })
    const group = root().querySelector('[role="group"]')
    expect(document.getElementById(group.getAttribute('aria-labelledby')).textContent).toBe(
      A.imagesOnCanvas,
    )
    const thumbs = [...group.querySelectorAll('button[aria-pressed]')]
    expect(thumbs.map((b) => b.getAttribute('aria-label'))).toEqual([
      `${de.common.layer} 1`,
      `${de.common.layer} 2`,
      `${de.common.layer} 3`,
    ])
    expect(thumbs.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false'])
  })

  it('Löschen als Ui-Icon-Button, „Alle löschen“ als Ui-Button danger', () => {
    mountBar()
    for (const b of deleteButtons()) expect(b.classList.contains('ui-icon-button')).toBe(true)
    expect(deleteAll().classList.contains('ui-button--danger')).toBe(true)
  })

  it('Überschrift ohne Doppelpunkt, keine festen Alt-Texte', () => {
    mountBar()
    expect(text()).not.toContain(`${A.imagesOnCanvas}:`)
    for (const img of imgs()) expect(img.getAttribute('alt')).toBe('')
  })
})
