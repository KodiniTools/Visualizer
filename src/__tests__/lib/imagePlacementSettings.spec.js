/**
 * Bild-Einstellungen dauerhaft speichern: Platzierung neuer Bilder (eigene
 * Bilder und Stock-Galerie getrennt) und „Seitenverhältnis beibehalten“.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import {
  loadPlacementSettings,
  savePlacementSettings,
  sanitizePlacement,
  loadKeepAspect,
  PLACEMENT_KEYS,
  PLACEMENT_DEFAULTS,
  KEEP_ASPECT_KEY,
} from '../../lib/imagePlacementSettings.js'
import { useImagePlacement } from '../../components/foto-panel/useImagePlacement.js'
import PositionSizeControls from '../../components/foto-panel/image-filters/PositionSizeControls.vue'
import SlideshowImageEditor from '../../components/foto-panel/slideshow/SlideshowImageEditor.vue'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

function placement() {
  return useImagePlacement({
    multiImageManagerRef: ref(null),
    canvasManagerRef: ref(null),
    gallery: {
      imageGallery: ref([]),
      selectedImages: ref([]),
      selectedImageCount: ref(0),
      deselectAllImages: () => {},
    },
    toastStore: { success() {}, error() {}, warning() {} },
    t: (k) => k,
  })
}

describe('Platzierungs-Einstellungen', () => {
  it('Standard ohne gespeicherte Werte', () => {
    expect(loadPlacementSettings('uploads')).toEqual(PLACEMENT_DEFAULTS)
  })

  it('eigene Bilder: Änderungen werden gespeichert und beim nächsten Start geladen', async () => {
    let p = placement()
    p.updatePlacementSettings({
      selectedAnimation: 'bounce',
      animationDuration: 2500,
      imageScale: 3,
      imageOffsetX: -40,
      imageOffsetY: '25', // aus Eingabefeld als Text
    })
    await nextTick()
    expect(JSON.parse(localStorage.getItem(PLACEMENT_KEYS.uploads))).toEqual({
      selectedAnimation: 'bounce',
      animationDuration: 2500,
      imageScale: 3,
      imageOffsetX: -40,
      imageOffsetY: 25,
    })
    p = placement()
    expect(p.selectedAnimation.value).toBe('bounce')
    expect(p.animationDuration.value).toBe(2500)
    expect(p.imageScale.value).toBe(3)
    expect(p.imageOffsetY.value).toBe(25)
  })

  it('eigene Bilder und Stock-Galerie sind getrennt', () => {
    savePlacementSettings('stock', { ...PLACEMENT_DEFAULTS, selectedAnimation: 'spin' })
    expect(loadPlacementSettings('stock').selectedAnimation).toBe('spin')
    expect(loadPlacementSettings('uploads').selectedAnimation).toBe('none')
  })

  it('ungültige/beschädigte Werte → Standard bzw. begrenzt', () => {
    expect(
      sanitizePlacement({
        selectedAnimation: 'explode',
        animationDuration: 99999,
        imageScale: 0,
        imageOffsetX: -9999,
        imageOffsetY: 'x',
      }),
    ).toEqual({
      selectedAnimation: 'none',
      animationDuration: 5000,
      imageScale: 1,
      imageOffsetX: -500,
      imageOffsetY: 0,
    })
    localStorage.setItem(PLACEMENT_KEYS.uploads, '{kaputt')
    expect(loadPlacementSettings('uploads')).toEqual(PLACEMENT_DEFAULTS)
  })
})

describe('„Seitenverhältnis beibehalten“', () => {
  const image = () => ({
    id: 1,
    type: 'image',
    imageObject: { width: 200, height: 100 },
    relX: 0.1,
    relY: 0.3,
    relWidth: 0.4,
    relHeight: 0.2,
  })

  it('Standard an; ausgeschaltet bleibt es bei neuen Bildern und nach Neustart aus', async () => {
    expect(loadKeepAspect()).toBe(true)
    let w = mount(PositionSizeControls, { props: { image: image() } })
    expect(w.find('.image-keep-aspect').element.checked).toBe(true)
    await w.find('.image-keep-aspect').setValue(false)
    await nextTick()
    expect(localStorage.getItem(KEEP_ASPECT_KEY)).toBe('false')
    w.unmount()
    w = mount(PositionSizeControls, { props: { image: { ...image(), id: 2 } } })
    expect(w.find('.image-keep-aspect').element.checked).toBe(false)
    w.unmount()
  })

  it('gilt auch im Slideshow-Bild-Editor', () => {
    localStorage.setItem(KEEP_ASPECT_KEY, 'false')
    const w = mount(SlideshowImageEditor, {
      props: {
        image: { name: 'a.png' },
        index: 0,
        total: 1,
        size: { width: 0.4, height: 0.2, defaultWidth: 0.4, defaultHeight: 0.2 },
      },
    })
    expect(w.find('.editor-keep-aspect').element.checked).toBe(false)
    w.unmount()
  })

  it('beschädigter Wert → Standard an', () => {
    localStorage.setItem(KEEP_ASPECT_KEY, '"ja"')
    expect(loadKeepAspect()).toBe(true)
  })
})
