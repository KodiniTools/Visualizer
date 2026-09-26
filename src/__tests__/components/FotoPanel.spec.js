// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref, nextTick, toRaw } from 'vue'

/**
 * Verhaltenstest für FotoPanel: prüft die Verdrahtung zwischen den
 * Kind-Komponenten (Events/Props) und den Managern (Canvas, Bilder, Foto,
 * Slideshow). Die Kind-Komponenten sind gestubbt.
 */

// Slideshow-Manager-Attrappe: merkt sich Konstruktor-Callbacks und Aufrufe
const managers = []
vi.mock('../../lib/slideshowManager.js', () => {
  class FakeSlideshowManager {
    constructor(multiImageManager, fotoManager, callbacks) {
      this.args = { multiImageManager, fotoManager }
      this.callbacks = callbacks
      this.isActive = false
      const fns = [
        'pause',
        'resume',
        'stop',
        'applyLiveUpdate',
        'setMoveWholeSlideshow',
        'clearImageMemory',
        'setBackgroundMode',
        'setBackgroundColor',
        'setWorkspaceColor',
        'setBaseGradient',
        'setBaseFillAudio',
        'setBaseImage',
        'setRenderBehindVisualizer',
        'setTransform',
        'setImageAdjustments',
        'setImagePosition',
        'setImageSize',
        'setImageBounds',
      ]
      for (const f of fns) this[f] = vi.fn()
      this.start = vi.fn(() => true)
      this.getImageAdjustments = vi.fn(() => null)
      this.getImageBounds = vi.fn(() => null)
      this.isFittedToWorkspace = vi.fn(() => false)
      this.getEffectiveImageBounds = vi.fn(() => ({
        relX: 0.1,
        relY: 0.2,
        relWidth: 0.4,
        relHeight: 0.2,
      }))
      this.getFittedImageBounds = vi.fn(() => ({ relWidth: 0.5, relHeight: 0.25 }))
      managers.push(this)
    }
  }
  return { SlideshowManager: FakeSlideshowManager }
})

import FotoPanel from '../../components/FotoPanel.vue'
import ImagePreviewOverlay from '../../components/foto-panel/ImagePreviewOverlay.vue'
import ImageUploadSection from '../../components/foto-panel/ImageUploadSection.vue'
import ImageFiltersPanel from '../../components/foto-panel/ImageFiltersPanel.vue'
import SlideshowPanel from '../../components/foto-panel/SlideshowPanel.vue'
import { useImageGallery } from '../../composables/useImageGallery.js'
import { useImageAudioReactive } from '../../composables/useImageAudioReactive.js'
import { useSlideshowPopover } from '../../composables/useSlideshowPopover.js'
import { useToastStore } from '../../stores/toastStore.js'
import { useSlideshowImageAdjustmentsStore } from '../../stores/slideshowImageAdjustmentsStore.js'
import { useSlideshowImageSettingsStore } from '../../stores/slideshowImageSettingsStore.js'
import { SLIDESHOW_EDIT_EVENT } from '../../lib/slideshowEditRequest.js'

function img(name, w = 100, h = 50) {
  return { src: `data:,${name}`, naturalWidth: w, naturalHeight: h, tag: name }
}

function makeManagers() {
  const multiImageManager = {
    canvas: { width: 1000, height: 500 },
    images: [],
    addImage: vi.fn(),
    addImageWithBounds: vi.fn(),
    getImageIndex: vi.fn(() => 1),
    getImageCount: vi.fn(() => 3),
    bringToFront: vi.fn(),
    sendToBack: vi.fn(),
    moveUp: vi.fn(),
    moveDown: vi.fn(),
  }
  const fotoManager = {
    defaultSettings: { brightness: 100, contrast: 100 },
    getAvailablePresets: vi.fn(() => [{ id: 'vintage' }]),
    applyPreset: vi.fn(),
  }
  const canvasManager = {
    canvas: { width: 1000, height: 500 },
    redraw: vi.fn(),
    setBackground: vi.fn(),
    setWorkspaceBackground: vi.fn(() => true),
    startImageSelectionMode: vi.fn(),
    getWorkspaceBounds: vi.fn(() => ({ x: 1 })),
  }
  return { multiImageManager, fotoManager, canvasManager }
}

let wrapper
let m
let toast

async function mountPanel() {
  m = makeManagers()
  const pinia = createPinia()
  setActivePinia(pinia)
  toast = useToastStore()
  for (const k of ['success', 'error', 'warning', 'info']) vi.spyOn(toast, k)
  wrapper = mount(FotoPanel, {
    global: {
      plugins: [pinia],
      provide: {
        fotoManager: ref(m.fotoManager),
        multiImageManager: ref(m.multiImageManager),
        canvasManager: ref(m.canvasManager),
      },
      stubs: {
        teleport: true,
        ImagePreviewOverlay: true,
        ImageUploadSection: true,
        ImageFiltersPanel: {
          name: 'ImageFiltersPanel',
          props: [
            'currentActiveImage',
            'presets',
            'canMoveUp',
            'canMoveDown',
            'currentLayerInfo',
            'boundsApi',
          ],
          emits: [
            'bring-to-front',
            'move-up',
            'move-down',
            'send-to-back',
            'preset-change',
            'filter-change',
            'reset-filters',
          ],
          methods: { loadImageSettings: vi.fn() },
          template: '<div class="filters-stub" />',
        },
        SlideshowPanel: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

const upload = () => wrapper.findComponent(ImageUploadSection)
const filters = () => wrapper.findComponent(ImageFiltersPanel)
const slideshow = () => wrapper.findComponent(SlideshowPanel)
const preview = () => wrapper.findComponent(ImagePreviewOverlay)
const latestManager = () => managers.at(-1)

function selectGallery(...entries) {
  const g = useImageGallery()
  g.imageGallery.value = entries
  g.selectedImageIndices.value = new Set(entries.map((_, i) => i))
}

beforeEach(() => {
  localStorage.clear()
  managers.length = 0
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const g = useImageGallery()
  g.imageGallery.value = []
  g.selectedImageIndices.value = new Set()
  useImageAudioReactive().currentActiveImage.value = null
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  window.slideshowManager = null
  window.fotoPanelControls = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('FotoPanel – Galerie & Platzierung', () => {
  it('initialisiert Presets und window.fotoPanelControls', async () => {
    await mountPanel()
    expect(filters().props('presets')).toEqual([{ id: 'vintage' }])
    expect(window.fotoPanelControls.currentActiveImage).toBe(
      useImageAudioReactive().currentActiveImage,
    )
  })

  it('fügt ausgewählte Bilder zum Canvas hinzu und hebt die Auswahl auf', async () => {
    await mountPanel()
    const a = img('a')
    const b = img('b')
    selectGallery({ id: 1, name: 'a.png', img: a }, { id: 2, name: 'b.png', img: b })
    await nextTick()
    expect(upload().props('selectedImageCount')).toBe(2)
    upload().vm.$emit('add-to-canvas')
    expect(m.multiImageManager.addImage.mock.calls.map((c) => c[0])).toEqual([a, b])
    expect(toast.success).toHaveBeenCalled()
    expect(useImageGallery().selectedImageCount.value).toBe(0)
  })

  it('setzt (Workspace-)Hintergrund nur bei genau einem Bild', async () => {
    await mountPanel()
    const a = img('a')
    selectGallery({ id: 1, name: 'a.png', img: a }, { id: 2, name: 'b.png', img: img('b') })
    upload().vm.$emit('set-as-background')
    expect(m.canvasManager.setBackground).not.toHaveBeenCalled()

    selectGallery({ id: 1, name: 'a.png', img: a })
    upload().vm.$emit('set-as-background')
    expect(m.canvasManager.setBackground).toHaveBeenCalledWith(a)

    selectGallery({ id: 1, name: 'a.png', img: a })
    m.canvasManager.setWorkspaceBackground.mockReturnValueOnce(false)
    upload().vm.$emit('set-as-workspace-background')
    expect(toast.warning).toHaveBeenCalled()
    expect(useImageGallery().selectedImageCount.value).toBe(1)
    upload().vm.$emit('set-as-workspace-background')
    expect(m.canvasManager.setWorkspaceBackground).toHaveBeenLastCalledWith(a)
    expect(useImageGallery().selectedImageCount.value).toBe(0)
  })

  it('Bereichsauswahl skaliert und verschiebt die Bounds', async () => {
    await mountPanel()
    const a = img('a')
    selectGallery({ id: 1, name: 'a.png', img: a })
    upload().vm.$emit('update:placement-settings', {
      selectedAnimation: 'zoom',
      animationDuration: 700,
      imageScale: 0.5,
      imageOffsetX: 100,
      imageOffsetY: -50,
    })
    await nextTick()
    expect(upload().props()).toMatchObject({
      selectedAnimation: 'zoom',
      animationDuration: 700,
      imageScale: 0.5,
      imageOffsetX: 100,
      imageOffsetY: -50,
    })

    upload().vm.$emit('start-range-selection')
    await nextTick()
    expect(upload().props('isInRangeSelectionMode')).toBe(true)
    const [onDone, anim] = m.canvasManager.startImageSelectionMode.mock.calls[0]
    expect(anim).toBe('zoom')
    onDone({ relX: 0.2, relY: 0.2, relWidth: 0.4, relHeight: 0.2 })
    const [addedImg, bounds, animation, opts] = m.multiImageManager.addImageWithBounds.mock.calls[0]
    expect(toRaw(addedImg)).toBe(a)
    expect(bounds.relWidth).toBeCloseTo(0.2)
    expect(bounds.relHeight).toBeCloseTo(0.1)
    expect(bounds.relX).toBeCloseTo(0.2 + 0.1 + 0.1)
    expect(bounds.relY).toBeCloseTo(0.2 + 0.05 - 0.1)
    expect(animation).toBe('zoom')
    expect(opts).toEqual({ duration: 700 })
    await nextTick()
    expect(upload().props('isInRangeSelectionMode')).toBe(false)

    // Abbruch (keine Bounds) beendet den Modus ohne Bild
    selectGallery({ id: 1, name: 'a.png', img: a })
    upload().vm.$emit('start-range-selection')
    m.canvasManager.startImageSelectionMode.mock.calls[1][0](null)
    expect(m.multiImageManager.addImageWithBounds).toHaveBeenCalledTimes(1)
  })

  it('direkt platzieren nutzt Mitte + Offset und Skalierung', async () => {
    await mountPanel()
    const a = img('a')
    selectGallery({ id: 1, name: 'a.png', img: a })
    upload().vm.$emit('update:placement-settings', {
      selectedAnimation: 'fade',
      animationDuration: 500,
      imageScale: 2,
      imageOffsetX: 100,
      imageOffsetY: 50,
    })
    upload().vm.$emit('add-directly')
    const [, bounds, anim, opts] = m.multiImageManager.addImageWithBounds.mock.calls[0]
    expect(bounds.relWidth).toBeCloseTo(0.3)
    expect(bounds.relX).toBeCloseTo(0.6 - 0.15)
    expect(bounds.relY).toBeCloseTo(0.6 - 0.15)
    expect(anim).toBe('fade')
    expect(opts).toEqual({ duration: 500 })
  })

  it('Alle löschen fragt nach', async () => {
    await mountPanel()
    selectGallery({ id: 1, name: 'a.png', img: img('a') })
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    upload().vm.$emit('clear-all')
    expect(useImageGallery().imageGallery.value).toHaveLength(1)
    upload().vm.$emit('clear-all')
    expect(useImageGallery().imageGallery.value).toHaveLength(0)
  })

  it('Vorschau: öffnen, auf Canvas, als Hintergrund, schließen', async () => {
    await mountPanel()
    const a = img('a')
    const data = { id: 1, name: 'a.png', img: a }
    upload().vm.$emit('open-preview', data)
    await nextTick()
    expect(preview().props('previewImage')).toEqual({
      src: a.src,
      name: 'a.png',
      type: 'uploaded',
      data,
    })
    preview().vm.$emit('add-to-canvas')
    await nextTick()
    expect(m.multiImageManager.addImage).toHaveBeenCalledWith(a)
    expect(preview().props('previewImage')).toBeNull()

    upload().vm.$emit('open-preview', data)
    preview().vm.$emit('set-as-background')
    expect(m.canvasManager.setBackground).toHaveBeenCalledWith(a)

    upload().vm.$emit('open-preview', data)
    preview().vm.$emit('close')
    await nextTick()
    expect(preview().props('previewImage')).toBeNull()
  })
})

describe('FotoPanel – aktives Bild (Ebenen & Filter)', () => {
  it('Ebenen-Infos und -Aktionen', async () => {
    await mountPanel()
    expect(filters().props('canMoveUp')).toBe(false)
    expect(filters().props('currentLayerInfo')).toBe('')
    const active = { id: 7, fotoSettings: { brightness: 50, audioReactive: { x: 1 } } }
    useImageAudioReactive().currentActiveImage.value = active
    await nextTick()
    expect(filters().props()).toMatchObject({
      canMoveUp: true,
      canMoveDown: true,
      currentLayerInfo: '2 / 3',
    })
    for (const [ev, fn] of [
      ['bring-to-front', 'bringToFront'],
      ['send-to-back', 'sendToBack'],
      ['move-up', 'moveUp'],
      ['move-down', 'moveDown'],
    ]) {
      filters().vm.$emit(ev)
      expect(m.multiImageManager[fn]).toHaveBeenCalledWith(active)
    }
    m.multiImageManager.getImageIndex.mockReturnValue(2)
    useImageAudioReactive().currentActiveImage.value = { ...active }
    await nextTick()
    expect(filters().props('canMoveUp')).toBe(false)
  })

  it('Filter, Presets, Reset', async () => {
    await mountPanel()
    const active = {
      id: 7,
      fotoSettings: { brightness: 50, renderBehindVisualizer: true, audioReactive: { a: 1 } },
    }
    useImageAudioReactive().currentActiveImage.value = active
    await nextTick()
    filters().vm.$emit('preset-change', '')
    expect(m.fotoManager.applyPreset).toHaveBeenLastCalledWith(active, 'normal')
    filters().vm.$emit('preset-change', 'vintage')
    expect(m.fotoManager.applyPreset).toHaveBeenLastCalledWith(active, 'vintage')
    filters().vm.$emit('filter-change', { property: 'blur', value: 3 })
    expect(active.fotoSettings.blur).toBe(3)

    filters().vm.$emit('reset-filters')
    expect(active.fotoSettings).toMatchObject({
      brightness: 100,
      blur: 0,
      borderColor: '#ffffff',
      flipH: false,
      renderBehindVisualizer: true,
      audioReactive: { a: 1 },
    })

    const bare = { id: 8 }
    useImageAudioReactive().currentActiveImage.value = bare
    await nextTick()
    filters().vm.$emit('filter-change', { property: 'contrast', value: 80 })
    expect(bare.fotoSettings).toEqual({ contrast: 80 })
  })

  it('Positions-API der Canvas-Bilder', async () => {
    await mountPanel()
    const api = filters().props('boundsApi')
    expect(toRaw(api.getCanvas())).toBe(m.multiImageManager.canvas)
    api.redraw()
    expect(m.canvasManager.redraw).toHaveBeenCalled()
  })
})

describe('FotoPanel – Slideshow', () => {
  async function startWith(config = {}) {
    const a = img('a')
    const b = img('b')
    selectGallery({ id: 1, name: 'a.png', img: a }, { id: 2, name: 'b.png', img: b })
    await nextTick()
    const images = slideshow().props('images')
    slideshow().vm.$emit('start', {
      images: images.map((i, n) => ({ ...i, displayDuration: n === 0 ? 5000 : undefined })),
      fadeInDuration: 100,
      displayDuration: 3000,
      fadeOutDuration: 200,
      applyAudioReactive: false,
      loop: true,
      renderBehindVisualizer: true,
      backgroundMode: 'none',
      transform: { relX: 0.1 },
      ...config,
    })
    await flushPromises()
    return { a, b }
  }

  it('reicht Bilder + Zustand an das Slideshow-Panel', async () => {
    await mountPanel()
    selectGallery({ id: 1, name: 'a.png', img: img('a') }, { id: 2, name: 'b.png', img: img('b') })
    await nextTick()
    expect(
      slideshow()
        .props('images')
        .map((i) => i.id),
    ).toEqual([1, 2])
    expect(slideshow().props()).toMatchObject({
      isActive: false,
      isPaused: false,
      totalImages: 0,
      currentPhase: 'fadeIn',
      hasWorkspace: false,
      boundsRevision: 0,
    })
    expect(useSlideshowPopover().imageCount).toBe(2)
  })

  it('Manager wird verzögert initialisiert und global bereitgestellt', async () => {
    vi.useFakeTimers()
    await mountPanel()
    expect(managers).toHaveLength(0)
    vi.advanceTimersByTime(1000)
    expect(managers).toHaveLength(1)
    expect(toRaw(window.slideshowManager)).toBe(latestManager())
    expect(latestManager().args).toEqual({
      multiImageManager: m.multiImageManager,
      fotoManager: m.fotoManager,
    })
    expect(latestManager().callbacks.getWorkspaceBounds()).toEqual({ x: 1 })
    latestManager().callbacks.redrawCallback()
    expect(m.canvasManager.redraw).toHaveBeenCalled()
  })

  it('Start baut Bilder + Optionen und aktualisiert den Zustand', async () => {
    await mountPanel()
    const { a, b } = await startWith()
    const mgr = latestManager()
    const [images, options] = mgr.start.mock.calls[0]
    expect(images.map((i) => i.imageObject)).toEqual([a, b])
    expect(images[0]).toMatchObject({
      name: 'a.png',
      id: 1,
      source: 'upload',
      displayDuration: 5000,
      audioReactiveSettings: null,
    })
    expect(options).toMatchSnapshot()
    await nextTick()
    expect(slideshow().props()).toMatchObject({ isActive: true, totalImages: 2 })
    expect(useSlideshowPopover()).toMatchObject({ active: true, imageCount: 2 })
    expect(toRaw(window.slideshowManager)).toBe(mgr)
    expect(useImageGallery().selectedImageCount.value).toBe(0)
    expect(toast.success).toHaveBeenCalled()
  })

  it('Start ohne ladbare Bilder startet nicht', async () => {
    await mountPanel()
    slideshow().vm.$emit('start', { images: [{ id: 9, name: 'weg.png' }] })
    await flushPromises()
    expect(toast.warning).toHaveBeenCalled()
    expect(latestManager().start).not.toHaveBeenCalled()
  })

  it('Pause, Fortsetzen, Stopp, Ende', async () => {
    await mountPanel()
    await startWith()
    const mgr = latestManager()
    slideshow().vm.$emit('pause')
    await nextTick()
    expect(mgr.pause).toHaveBeenCalled()
    expect(slideshow().props('isPaused')).toBe(true)
    expect(useSlideshowPopover().paused).toBe(true)
    slideshow().vm.$emit('resume')
    await nextTick()
    expect(mgr.resume).toHaveBeenCalled()
    expect(slideshow().props('isPaused')).toBe(false)

    mgr.callbacks.onImageTransition(1, 2, 'display')
    await nextTick()
    expect(slideshow().props()).toMatchObject({ currentImageIndex: 1, currentPhase: 'display' })

    slideshow().vm.$emit('stop')
    await nextTick()
    expect(mgr.stop).toHaveBeenCalled()
    expect(slideshow().props()).toMatchObject({ isActive: false, currentImageIndex: 0 })
    expect(window.slideshowManager).toBeNull()

    await startWith()
    mgr.callbacks.onSlideshowComplete()
    await nextTick()
    expect(slideshow().props()).toMatchObject({ isActive: false, totalImages: 0 })
    expect(window.slideshowManager).toBeNull()
  })

  it('Einstellungs-Events gehen an den Manager', async () => {
    await mountPanel()
    await startWith()
    const mgr = latestManager()
    const s = slideshow()
    s.vm.$emit('render-layer-change', false)
    s.vm.$emit('transform-change', { relX: 0.3 })
    s.vm.$emit('background-mode-change', 'canvas')
    s.vm.$emit('background-color-change', '#111111')
    s.vm.$emit('workspace-color-change', '#222222')
    s.vm.$emit('base-gradient-change', 'canvas', { a: 1 })
    s.vm.$emit('base-fill-audio-change', 'workspace', { b: 2 })
    s.vm.$emit('base-image-change', 'canvas', { c: 3 }, 'IMG')
    s.vm.$emit('move-mode-change', true)
    s.vm.$emit('order-changed', [1, 2])
    s.vm.$emit('visibility-change', true)
    expect(mgr.setRenderBehindVisualizer).toHaveBeenCalledWith(false)
    expect(mgr.setTransform).toHaveBeenCalledWith({ relX: 0.3 })
    expect(mgr.setBackgroundMode).toHaveBeenCalledWith('canvas')
    expect(mgr.setBackgroundColor).toHaveBeenCalledWith('#111111')
    expect(mgr.setWorkspaceColor).toHaveBeenCalledWith('#222222')
    expect(mgr.setBaseGradient).toHaveBeenCalledWith('canvas', { a: 1 })
    expect(mgr.setBaseFillAudio).toHaveBeenCalledWith('workspace', { b: 2 })
    expect(mgr.setBaseImage).toHaveBeenCalledWith('canvas', { c: 3 }, 'IMG')
    expect(mgr.setMoveWholeSlideshow).toHaveBeenCalledWith(true)
    expect(useSlideshowPopover().panelVisible).toBe(true)

    mgr.isActive = false
    s.vm.$emit('live-update', { images: [] })
    expect(mgr.applyLiveUpdate).not.toHaveBeenCalled()
    mgr.isActive = true
    s.vm.$emit('live-update', {
      images: [{ id: 1, name: 'a.png', imageObject: img('a'), audioMode: 'off' }],
      preserveLive: true,
    })
    const [liveImages, liveOptions] = mgr.applyLiveUpdate.mock.calls[0]
    // 'off' = explizit deaktivierte Konfiguration (kein globaler Fallback)
    expect(liveImages[0].audioReactiveSettings).toMatchObject({ enabled: false })
    expect(liveOptions.preserveLive).toBe(true)
  })

  it('Manager-Rückmeldungen: Transform, Bounds (gebündelt), Anpassungen', async () => {
    vi.useFakeTimers()
    await mountPanel()
    vi.advanceTimersByTime(1000)
    const mgr = latestManager()
    const adjStore = useSlideshowImageAdjustmentsStore()
    const setStore = useSlideshowImageSettingsStore()
    vi.spyOn(adjStore, 'setAdjustments')
    vi.spyOn(setStore, 'updateImageSettings')

    mgr.callbacks.onTransformChange({ relX: 0.5 })
    await nextTick()
    expect(slideshow().props('externalTransform')).toEqual({ relX: 0.5 })

    const imageConfig = { name: 'a.png', source: 'upload' }
    const imageObject = img('a')
    mgr.callbacks.onImageBoundsChange({
      imageConfig,
      imageObject,
      bounds: { relX: 0.1, relY: 0.1, relWidth: 0.5, relHeight: 0.5 },
    })
    mgr.callbacks.onImageBoundsChange({
      imageConfig,
      imageObject,
      bounds: { relX: 0.2, relY: 0.1, relWidth: 0.5, relHeight: 0.5 },
    })
    await nextTick()
    expect(slideshow().props('boundsRevision')).toBe(2)
    expect(setStore.updateImageSettings).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(setStore.updateImageSettings).toHaveBeenCalledTimes(1)
    expect(setStore.updateImageSettings).toHaveBeenCalledWith('upload:a.png|100x50', {
      bounds: { relX: 0.2, relY: 0.1, relWidth: 0.5, relHeight: 0.5 },
    })

    mgr.callbacks.onImageAdjustmentsChange({
      imageConfig,
      imageObject,
      adjustments: { brightness: 120, contrast: 100 },
      audioMode: 'off',
    })
    expect(adjStore.setAdjustments).toHaveBeenCalledWith(
      'upload:a.png|100x50',
      { brightness: 120 },
      'off',
    )

    // Unmount schreibt ausstehende Bounds sofort
    mgr.callbacks.onImageBoundsChange({
      imageConfig,
      imageObject,
      bounds: { relX: 0.3, relY: 0.1, relWidth: 0.5, relHeight: 0.5 },
    })
    wrapper.unmount()
    wrapper = null
    expect(setStore.updateImageSettings).toHaveBeenLastCalledWith('upload:a.png|100x50', {
      bounds: { relX: 0.3, relY: 0.1, relWidth: 0.5, relHeight: 0.5 },
    })
  })

  it('Anpassungen verwerfen', async () => {
    await mountPanel()
    await startWith()
    const mgr = latestManager()
    const adjStore = useSlideshowImageAdjustmentsStore()
    const setStore = useSlideshowImageSettingsStore()
    vi.spyOn(adjStore, 'clearAll')
    vi.spyOn(setStore, 'clearField')
    slideshow().vm.$emit('reset-image-adjustments')
    expect(mgr.clearImageMemory).toHaveBeenCalled()
    expect(adjStore.clearAll).toHaveBeenCalled()
    expect(setStore.clearField).toHaveBeenCalledWith('bounds')
  })

  it('adjustments-api: get/set/Bounds/Position/Größe', async () => {
    await mountPanel()
    const api = slideshow().props('adjustmentsApi')
    const a = img('a')
    const entry = { id: 1, name: 'a.png', source: 'upload', imageObject: a }
    const adjStore = useSlideshowImageAdjustmentsStore()
    const setStore = useSlideshowImageSettingsStore()

    // Ohne laufende Slideshow: Positions-/Größen-API nicht verfügbar
    expect(api.getPosition(entry)).toBeNull()
    expect(api.getSize(entry)).toBeNull()
    const mgr = latestManager() // von getPosition() erzeugt
    expect(mgr).toBeTruthy()

    api.set(entry, { brightness: 130, contrast: 100 }, 'saved')
    expect(mgr.setImageAdjustments).toHaveBeenCalledWith(
      a,
      { brightness: 130, contrast: 100 },
      'saved',
    )
    expect(adjStore.getAdjustments('upload:a.png|100x50')).toMatchObject({
      adjustments: { brightness: 130 },
      audioMode: 'saved',
    })
    expect(api.get(entry)).toEqual({ brightness: 130 })
    mgr.getImageAdjustments.mockReturnValueOnce({ live: true })
    expect(api.get(entry)).toEqual({ live: true })

    const b = { relX: 0.4, relY: 0.1, relWidth: 0.2, relHeight: 0.3 }
    api.setBounds(entry, b)
    expect(mgr.setImageBounds).toHaveBeenCalledWith(a, b)
    expect(setStore.getImageSettings('upload:a.png|100x50').bounds).toEqual(b)
    expect(api.getBounds(entry)).toEqual(b)
    mgr.getImageBounds.mockReturnValueOnce({ live: 1 })
    expect(api.getBounds(entry)).toEqual({ live: 1 })

    mgr.isActive = true
    expect(api.getPosition(entry)).toEqual({ x: 0.30000000000000004, y: 0.30000000000000004 })
    expect(api.getSize(entry)).toEqual({
      width: 0.4,
      height: 0.2,
      defaultWidth: 0.5,
      defaultHeight: 0.25,
    })
    mgr.isFittedToWorkspace.mockReturnValueOnce(true)
    expect(api.getPosition(entry)).toBeNull()
    api.setPosition(entry, { x: 0.5, y: 0.6 })
    expect(mgr.setImagePosition).toHaveBeenCalledWith(a, { centerX: 0.5, centerY: 0.6 })
    api.setSize(entry, { width: 0.3, height: 0.2, keepAspect: true })
    expect(mgr.setImageSize).toHaveBeenCalledWith(a, { width: 0.3, height: 0.2, keepAspect: true })
    api.setPosition({ id: 2, name: 'x' }, { x: 1, y: 1 })
    expect(mgr.setImagePosition).toHaveBeenCalledTimes(1)
  })

  it('Klick auf Slideshow-Bild in der Leiste öffnet den Editor', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(42)
    await mountPanel()
    window.dispatchEvent(new CustomEvent(SLIDESHOW_EDIT_EVENT, { detail: { index: 'x' } }))
    await nextTick()
    expect(slideshow().props('editImageRequest')).toBeNull()
    window.dispatchEvent(new CustomEvent(SLIDESHOW_EDIT_EVENT, { detail: { index: 1 } }))
    await nextTick()
    expect(slideshow().props('editImageRequest')).toEqual({ index: 1, nonce: 42 })
  })
})
