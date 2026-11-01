// @vitest-environment jsdom
// Charakterisierung des Kachel-Hintergrund-Panels. Die Tests greifen über
// sichtbare Texte, Labels und Titel zu, nicht über CSS-Klassen, damit sie den
// Wechsel von nativen Controls auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import BackgroundTilesPanel from '../../components/BackgroundTilesPanel.vue'
import SliderField from '../../components/ui/SliderField.vue'
import { useBackgroundTilesStore } from '../../stores/backgroundTilesStore.js'
import de from '../../lib/i18n/de.js'

const T = de.backgroundTiles
let wrapper
let store
let redraw

function mountPanel() {
  redraw = vi.fn()
  wrapper = mount(BackgroundTilesPanel, {
    attachTo: document.body,
    global: {
      provide: { canvasManager: ref({ redrawCallback: redraw }) },
      stubs: { TileAudioSection: true },
    },
  })
  return wrapper
}

/** Klick auf das Label mit diesem Text (aktiviert Checkbox bzw. Schalter). */
async function clickLabel(text) {
  const label = [...document.body.querySelectorAll('label')].find(
    (l) => l.textContent.trim() === text,
  )
  expect(label, `Label „${text}“`).toBeTruthy()
  label.click()
  await flushPromises()
}

/** Knopf mit genau diesem sichtbaren Text oder diesem Titel. */
function button(textOrTitle) {
  const el = [...document.body.querySelectorAll('button')].find(
    (b) =>
      b.textContent.replace(/\s+/g, ' ').trim().endsWith(textOrTitle) ||
      b.getAttribute('title') === textOrTitle ||
      b.getAttribute('aria-label') === textOrTitle,
  )
  expect(el, `Knopf „${textOrTitle}“`).toBeTruthy()
  return el
}

async function click(textOrTitle) {
  button(textOrTitle).click()
  await flushPromises()
}

const sliders = () => wrapper.findAllComponents(SliderField)

async function enableAndSelect(index = 0) {
  store.setTilesEnabled(true)
  store.selectTile(index)
  await flushPromises()
}

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  setActivePinia(createPinia())
  store = useBackgroundTilesStore()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Kachel-Panel – Aktivierung, Anzahl, Abstand', () => {
  it('Aktivieren schaltet den Kachel-Modus und zeichnet neu', async () => {
    mountPanel()
    expect(store.tilesEnabled).toBe(false)
    await clickLabel(T.enableTiles)
    expect(store.tilesEnabled).toBe(true)
    expect(redraw).toHaveBeenCalled()
    await clickLabel(T.enableTiles)
    expect(store.tilesEnabled).toBe(false)
  })

  it('Kachelanzahl 3/6/9/12 setzt den Store', async () => {
    store.setTilesEnabled(true)
    mountPanel()
    for (const n of [3, 6, 9, 12]) expect(button(String(n))).toBeTruthy()
    await click('9')
    expect(store.tileCount).toBe(9)
    expect(store.tiles).toHaveLength(9)
    expect(redraw).toHaveBeenCalled()
  })

  it('Abstand-Regler setzt tileGap', async () => {
    store.setTilesEnabled(true)
    mountPanel()
    sliders()[0].vm.$emit('update:modelValue', 12)
    await flushPromises()
    expect(store.tileGap).toBe(12)
  })

  it('Klick auf eine Vorschau-Kachel wählt sie aus und öffnet den Editor', async () => {
    store.setTilesEnabled(true)
    mountPanel()
    const preview = [...document.body.querySelectorAll('*')].filter(
      (el) => el.children.length && el.firstElementChild?.textContent === '2',
    )[0]
    preview.click()
    await flushPromises()
    expect(store.selectedTileIndex).toBe(1)
    expect(document.body.textContent).toContain(T.editTile.replace('{n}', '2'))
  })

  it('„Alle Kacheln zurücksetzen“ ruft resetAllTiles', async () => {
    store.setTilesEnabled(true)
    const spy = vi.spyOn(store, 'resetAllTiles')
    mountPanel()
    await click(T.resetAllTiles)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('Kachel-Panel – ausgewählte Kachel', () => {
  it('Deckkraft-Regler, Zurücksetzen und Schließen', async () => {
    await enableAndSelect(0)
    mountPanel()
    // [0] Abstand, [1] Deckkraft
    sliders()[1].vm.$emit('update:modelValue', 0.4)
    await flushPromises()
    expect(store.tiles[0].backgroundOpacity).toBeCloseTo(0.4)
    expect(document.body.textContent).toContain('40%')

    const reset = vi.spyOn(store, 'resetTile')
    await click(T.resetTile)
    expect(reset).toHaveBeenCalledWith(0)

    const close = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === '×' || b.getAttribute('aria-label') === de.common.close,
    )
    close.click()
    await flushPromises()
    expect(store.selectedTileIndex).toBe(null)
  })

  it('ohne Bild: Upload-, Galerie- und Video-Knöpfe', async () => {
    await enableAndSelect(0)
    mountPanel()
    expect(button(T.uploadImage)).toBeTruthy()
    expect(button(T.fromGallery)).toBeTruthy()
    expect(button(T.uploadVideo)).toBeTruthy()
    expect(document.body.textContent).toContain(T.orDragDrop)
    const fileInputs = document.body.querySelectorAll('input[type="file"]')
    const clickSpy = vi.fn()
    fileInputs[0].addEventListener('click', clickSpy)
    await click(T.uploadImage)
    expect(clickSpy).toHaveBeenCalled()
  })

  it('mit Bild: 11 Filter-Regler schreiben in imageSettings', async () => {
    await enableAndSelect(0)
    store.tiles[0].image = {}
    store.tiles[0].imageSrc = 'data:image/png;base64,x'
    mountPanel()
    await flushPromises()
    const all = sliders()
    // Abstand, Deckkraft, dann 11 Bild-Filter
    expect(all).toHaveLength(13)
    const keys = [
      'brightness',
      'contrast',
      'saturation',
      'opacity',
      'blur',
      'hueRotate',
      'grayscale',
      'sepia',
      'scale',
      'offsetX',
      'offsetY',
    ]
    for (const [i, key] of keys.entries()) {
      const value = key === 'scale' ? 1.5 : 7
      all[2 + i].vm.$emit('update:modelValue', value)
    }
    await flushPromises()
    const s = store.tiles[0].imageSettings
    expect(s.brightness).toBe(7)
    expect(s.offsetY).toBe(7)
    expect(s.scale).toBe(1.5)
    expect(document.body.textContent).toContain('150%')
    for (const key of [
      'brightness',
      'contrast',
      'saturation',
      'blur',
      'hueRotate',
      'grayscale',
      'sepia',
      'scale',
      'offsetX',
      'offsetY',
    ]) {
      expect(document.body.textContent).toContain(T[key])
    }
    const remove = vi.spyOn(store, 'removeTileImage')
    await click(T.removeImage)
    expect(remove).toHaveBeenCalledWith(0)
  })

  it('mit Video: Stumm/Endlos schalten videoSettings, Entfernen', async () => {
    await enableAndSelect(0)
    store.tiles[0].video = { pause() {} }
    store.tiles[0].videoSrc = 'blob:video'
    store.tiles[0].videoSettings = { muted: true, loop: true, playbackRate: 1 }
    mountPanel()
    await flushPromises()
    expect(document.body.textContent).toContain(T.videoPlaying)
    await clickLabel(T.videoMuted)
    expect(store.tiles[0].videoSettings.muted).toBe(false)
    await clickLabel(T.videoLoop)
    expect(store.tiles[0].videoSettings.loop).toBe(false)
    await clickLabel(T.videoLoop)
    expect(store.tiles[0].videoSettings.loop).toBe(true)
    const remove = vi.spyOn(store, 'removeTileVideo')
    await click(T.removeVideo)
    expect(remove).toHaveBeenCalledWith(0)
  })
})

describe('Kachel-Panel – Presets', () => {
  it('Speichern legt ein Preset an; Laden und Löschen über die Titel', async () => {
    store.setTilesEnabled(true)
    mountPanel()
    expect(document.body.textContent).toContain(T.noTilePresets)
    await click(T.saveTilePreset)
    expect(document.body.textContent).toContain('Kachel-Preset 1')
    expect(JSON.parse(localStorage.getItem('visualizer-tile-presets'))).toHaveLength(1)

    store.setTileCount(12)
    await click(T.load)
    expect(store.tileCount).toBe(6)

    await click(T.delete)
    expect(document.body.textContent).toContain(T.noTilePresets)
  })
})

describe('Kachel-Panel – Galerie', () => {
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
                  { id: 'a', name: 'Natur', name_en: 'Nature', icon: '🌿', jsonFile: 'a.json' },
                  { id: 'b', name: 'Stadt', name_en: 'City', icon: '🏙️', jsonFile: 'b.json' },
                ],
              }
            : { images: [{ id: 'i1', name: 'Wald', name_en: 'Forest', file: 'wald.jpg' }] },
      })),
    )
  }

  it('öffnet, zeigt Kategorien und Bilder, Auswahl aktiviert „Auswählen“, Abbrechen schließt', async () => {
    stubGallery()
    await enableAndSelect(0)
    mountPanel()
    await click(T.fromGallery)
    expect(document.body.textContent).toContain(T.galleryTitle)
    expect(document.body.textContent).toContain('Natur')
    expect(document.body.textContent).toContain('Stadt')
    expect(document.body.textContent).toContain('Wald')
    expect(button(T.gallerySelect).disabled).toBe(true)

    document.body.querySelector('img[alt="Wald"]').click()
    await flushPromises()
    expect(button(T.gallerySelect).disabled).toBe(false)

    await click('Stadt')
    expect(fetch).toHaveBeenCalledWith('b.json')

    await click(T.galleryCancel)
    expect(document.body.textContent).not.toContain(T.galleryTitle)
  })

  it('Escape schließt die Galerie (Dialog-Baustein)', async () => {
    stubGallery()
    await enableAndSelect(0)
    mountPanel()
    await click(T.fromGallery)
    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('Kachel-Panel – Ui-Bausteine', () => {
  it('Schalter und Kachelanzahl sind zugängliche Ui-Controls', async () => {
    store.setTilesEnabled(true)
    store.tiles[0].video = { pause() {} }
    store.tiles[0].videoSrc = 'blob:video'
    store.selectTile(0)
    mountPanel()
    await flushPromises()
    const switches = [...document.body.querySelectorAll('[role="switch"]')]
    expect(switches.map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true'])
    const group = document.body.querySelector('[role="radiogroup"]')
    expect(group.getAttribute('aria-label')).toBe(T.tileCount)
    expect(group.querySelector('[aria-checked="true"]').textContent.trim()).toBe('6')
    expect(document.body.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
  })
})
