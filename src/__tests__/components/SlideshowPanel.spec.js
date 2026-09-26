// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SlideshowPanel from '../../components/foto-panel/SlideshowPanel.vue'
import * as persistence from '../../lib/slideshowImagePersistence.js'

// Dauerhafte Bildablage (IndexedDB) im Panel-Test ersetzen
vi.mock('../../lib/slideshowImagePersistence.js', () => ({
  persistUploadImage: vi.fn(async () => null),
  restoreUploadImage: vi.fn(async () => null),
}))

const images = [
  { id: 'a', name: 'Eins', imageObject: { src: 'data:,a' } },
  { id: 'b', name: 'Zwei', imageObject: { src: 'data:,b' } },
]

let wrapper
let pinia
beforeEach(() => {
  localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
})
afterEach(() => wrapper?.unmount())

function mountPanel(props = {}) {
  wrapper = mount(SlideshowPanel, {
    props: { images, hasSavedSettings: true, ...props },
    global: { plugins: [pinia] },
  })
  return wrapper
}

describe('SlideshowPanel (aufgeteilt)', () => {
  it('renders order list, timing, transform and start button when idle', () => {
    const w = mountPanel()
    expect(w.findAll('.order-item')).toHaveLength(2)
    expect(w.findAll('.timing-control')).toHaveLength(3)
    expect(w.findAll('.transform-control')).toHaveLength(4)
    expect(w.find('.btn-start').exists()).toBe(true)
    expect(w.find('.progress-section').exists()).toBe(false)
  })

  it('hides settings and shows pause/stop + progress while active', () => {
    const w = mountPanel({
      isActive: true,
      currentImageIndex: 1,
      totalImages: 2,
      currentPhase: 'display',
    })
    expect(w.find('.order-section').exists()).toBe(false)
    expect(w.find('.timing-section').exists()).toBe(false)
    expect(w.find('.transform-section').exists()).toBe(false)
    expect(w.find('.layer-section').exists()).toBe(true)
    expect(w.find('.btn-pause').exists()).toBe(true)
    expect(w.find('.btn-stop').exists()).toBe(true)
    expect(w.find('.progress-info').text()).toContain('2 / 2')
    expect(w.find('.phase-indicator').text()).toBe('Anzeige')
  })

  it('emits start with the full payload built from the section models', async () => {
    const w = mountPanel()
    // Anzeigedauer über den Spinner der Timing-Sektion ändern
    const displayNum = w.findAll('.timing-control input[type="number"]')[1].element
    displayNum.value = '4500'
    displayNum.dispatchEvent(new Event('input', { bubbles: true }))
    // Loop aktivieren
    await w.find('.loop-section input[type="checkbox"]').setValue(true)
    // Breite über die Transform-Sektion ändern
    const widthNum = w.findAll('.transform-control input[type="number"]')[2].element
    widthNum.value = '60'
    widthNum.dispatchEvent(new Event('input', { bubbles: true }))
    await w.vm.$nextTick()

    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.images.map((i) => i.id)).toEqual(['a', 'b'])
    expect(payload.displayDuration).toBe(4500)
    expect(payload.loop).toBe(true)
    expect(payload.transform).toEqual({ relX: 0.1, relY: 0.1, relWidth: 0.6, relHeight: 0.8 })
    // Transform-Änderung wurde (idle) live emittiert
    expect(w.emitted('transform-change').at(-1)[0].relWidth).toBe(0.6)
  })

  it('passes per-image display durations; empty field falls back to the global value', async () => {
    const w = mountPanel()
    const inputs = w.findAll('.order-duration')
    expect(inputs).toHaveLength(2)
    await inputs[0].setValue('7.5')
    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.images[0].displayDuration).toBe(7500)
    expect(payload.images[1].displayDuration).toBeUndefined()
    expect(payload.displayDuration).toBe(3000)
    // Props-Objekte werden nicht mutiert
    expect(images[0].displayDuration).toBeUndefined()

    // Feld leeren -> eigener Wert entfernt
    await w.findAll('.order-duration')[0].setValue('')
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[1][0].images[0].displayDuration).toBeUndefined()
  })

  it('passes the per-image audio mode (default when unset)', async () => {
    const w = mountPanel()
    const selects = w.findAll('.order-audio')
    expect(selects).toHaveLength(2)
    await selects[1].setValue('glitch')
    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.images.map((i) => i.audioMode)).toEqual(['default', 'glitch'])
  })

  it('saves a preset with per-image durations/audio and restores it on load', async () => {
    const w = mountPanel()
    await w.findAll('.order-duration')[1].setValue('9')
    await w.findAll('.order-audio')[0].setValue('pulse')
    await w.find('.loop-section input[type="checkbox"]').setValue(true)
    await w.find('.preset-name-input').setValue('Party')
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    expect(w.findAll('.preset-item')).toHaveLength(1)
    expect(w.find('.preset-name').text()).toBe('Party')
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].slots).toEqual([
      {
        displayDuration: null,
        audioMode: 'pulse',
        adjustments: null,
        bounds: null,
        transition: null,
        stock: null,
        upload: null,
      },
      {
        displayDuration: 9000,
        audioMode: 'default',
        adjustments: null,
        bounds: null,
        transition: null,
        stock: null,
        upload: null,
      },
    ])

    // Werte ändern, dann Preset laden -> ursprünglicher Zustand
    await w.findAll('.order-duration')[1].setValue('')
    await w.findAll('.order-audio')[0].setValue('off')
    await w.find('.loop-section input[type="checkbox"]').setValue(false)
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()

    expect(w.findAll('.order-duration')[1].element.value).toBe('9')
    expect(w.findAll('.order-audio')[0].element.value).toBe('pulse')
    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.loop).toBe(true)
    expect(payload.images[1].displayDuration).toBe(9000)
    expect(payload.images[0].audioMode).toBe('pulse')
  })

  it('fit to workspace is disabled without a workspace format', () => {
    const w = mountPanel({ hasWorkspace: false })
    expect(w.find('.fit-workspace-checkbox').element.disabled).toBe(true)
    expect(w.find('.fit-workspace-hint').classes()).toContain('warning')
  })

  it('fit to workspace: renders behind visualizer, hides transform, sends option', async () => {
    const w = mountPanel({ hasWorkspace: true })
    await w.find('.fit-workspace-checkbox').setValue(true)
    expect(w.emitted('fit-workspace-change').at(-1)).toEqual([true])
    expect(w.emitted('render-layer-change').at(-1)).toEqual([true])
    expect(w.find('.transform-section').exists()).toBe(false)

    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.fitToWorkspace).toBe(true)
    expect(payload.renderBehindVisualizer).toBe(true)

    // Workspace-Format entfernt → Option wirkungslos, Transform wieder sichtbar
    await w.setProps({ hasWorkspace: false })
    expect(w.emitted('fit-workspace-change').at(-1)).toEqual([false])
    expect(w.find('.transform-section').exists()).toBe(true)
  })

  it('emits reset-image-adjustments from the reset button', async () => {
    const w = mountPanel()
    await w.find('.btn-reset-adjustments').trigger('click')
    expect(w.emitted('reset-image-adjustments')).toHaveLength(1)
    // Während der Slideshow ausgeblendet
    await w.setProps({ isActive: true })
    expect(w.find('.btn-reset-adjustments').exists()).toBe(false)
  })

  it('saves and restores image adjustments per position via adjustmentsApi', async () => {
    const memory = new Map([['a', { contrast: 120, sepia: 30 }]])
    const calls = []
    const adjustmentsApi = {
      get: (img) => memory.get(img.id) ?? null,
      set: (img, settings, audioMode) => calls.push([img.id, settings, audioMode]),
    }
    const w = mountPanel({ adjustmentsApi })
    await w.findAll('.order-audio')[0].setValue('glow')
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].slots[0].adjustments).toEqual({ contrast: 120, sepia: 30 })
    expect(stored[0].slots[1].adjustments).toBeNull()

    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(calls).toEqual([
      ['a', { contrast: 120, sepia: 30 }, 'glow'],
      ['b', null, 'default'],
    ])
  })

  it('saves and loads presets while running (live-update), keeping the started positions', async () => {
    const setBounds = []
    const adjustmentsApi = {
      get: (img) => (img.id === 'b' ? { sepia: 50 } : null),
      set: () => {},
      getBounds: (img) =>
        img.id === 'a' ? { relX: 0.1, relY: 0.2, relWidth: 0.3, relHeight: 0.3 } : null,
      setBounds: (img, b) => setBounds.push([img.id, b]),
    }
    const w = mountPanel({ adjustmentsApi })
    // Start → FotoPanel hebt die Auswahl auf (images = [])
    await w.setProps({ isActive: true, images: [] })
    await w.find('.preset-name-input').setValue('Live')
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].name).toBe('Live')
    expect(stored[0].slots).toHaveLength(2)
    expect(stored[0].slots[1].adjustments).toEqual({ sepia: 50 })
    expect(stored[0].slots[0].bounds).toEqual({
      relX: 0.1,
      relY: 0.2,
      relWidth: 0.3,
      relHeight: 0.3,
    })
    expect(stored[0].slots[1].bounds).toBeNull()

    // Laden während der Slideshow → Bounds gesetzt + live-update mit beiden Bildern
    const loadBtn = w.find('.btn-load-preset')
    expect(loadBtn.element.disabled).toBe(false)
    await loadBtn.trigger('click')
    await flushPromises()
    expect(setBounds).toEqual([
      ['a', { relX: 0.1, relY: 0.2, relWidth: 0.3, relHeight: 0.3 }],
      ['b', null],
    ])
    const live = w.emitted('live-update').at(-1)[0]
    expect(live.images.map((i) => i.id)).toEqual(['a', 'b'])

    // Nach dem Stoppen ohne Auswahl bleibt das Panel sichtbar, weil ein Preset
    // mit Bildern (Sitzung) existiert – Start ist ohne Bilder gesperrt
    await w.setProps({ isActive: false })
    expect(w.find('.slideshow-panel').exists()).toBe(true)
    expect(w.find('.btn-start').element.disabled).toBe(true)
    // … mit neuer Auswahl gilt wieder diese
    await w.setProps({ images: [images[1], images[0]] })
    expect(w.findAll('.order-name').map((n) => n.text())).toEqual(['Zwei', 'Eins'])
  })

  it('move-whole checkbox emits mode change; external transform updates sliders', async () => {
    const w = mountPanel()
    expect(w.find('.move-whole-hint').text()).toContain('Shift')
    await w.find('.move-whole-checkbox').setValue(true)
    expect(w.emitted('move-mode-change').at(-1)).toEqual([true])
    await w.setProps({
      externalTransform: { relX: 0.25, relY: 0.3, relWidth: 0.8, relHeight: 0.8 },
    })
    const values = w.findAll('.transform-control .value').map((v) => v.text())
    expect(values.slice(0, 2)).toEqual(['25%', '30%'])
  })

  it('saves the mouse move mode in presets and restores it on load', async () => {
    const w = mountPanel()
    await w.find('.move-whole-checkbox').setValue(true)
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].settings.moveWholeSlideshow).toBe(true)

    await w.find('.move-whole-checkbox').setValue(false)
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.find('.move-whole-checkbox').element.checked).toBe(true)
    expect(w.emitted('move-mode-change').at(-1)).toEqual([true])
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[0][0].moveWholeSlideshow).toBe(true)
  })

  it('preset with session images restores the image list (also with stock images)', async () => {
    const stockImg = { id: 'stock:s1', name: 'Wald', source: 'stock', thumbnail: 'wald.png' }
    const w = mountPanel({ images: [images[0], stockImg] })
    expect(w.find('.order-stock-badge').exists()).toBe(true)
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    expect(w.find('.preset-images-badge').exists()).toBe(true)

    // Auswahl wechseln → Preset laden stellt die gespeicherten Bilder her
    await w.setProps({ images: [images[1], images[0]] })
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.findAll('.order-name').map((n) => n.text())).toEqual(['Eins', 'Stock Wald'])
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[0][0].images.map((i) => i.id)).toEqual(['a', 'stock:s1'])
  })

  it('loading a preset with other images while running restarts the slideshow', async () => {
    const w = mountPanel({ images: [images[1], images[0]] })
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises() // Preset mit Bildern b, a
    await w.setProps({ images })
    await w.setProps({ isActive: true, images: [] }) // läuft mit a, b
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.emitted('live-update')).toBeUndefined()
    expect(
      w
        .emitted('start')
        .at(-1)[0]
        .images.map((i) => i.id),
    ).toEqual(['b', 'a'])
  })

  it('panel is visible with a session-image preset even without selection; start disabled', async () => {
    const w = mountPanel()
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    await w.setProps({ images: [] })
    expect(w.find('.slideshow-panel').exists()).toBe(true)
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.find('.btn-start').element.disabled).toBe(false)
  })

  it('stock images are saved permanently and restored after reload (without session images)', async () => {
    const stockImg = {
      id: 'stock:s1',
      name: 'Wald',
      source: 'stock',
      thumbnail: 'gallery/bg/wald.png',
      stockImage: {
        id: 's1',
        name: 'Wald',
        file: 'gallery/bg/wald.png',
        thumbnail: 'gallery/bg/wald.png',
      },
    }
    let w = mountPanel({ images: [stockImg, images[0]] })
    await w.findAll('.order-duration')[0].setValue('6')
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].slots[0].stock).toMatchObject({ id: 's1', file: 'gallery/bg/wald.png' })
    expect(stored[0].slots[1].stock).toBeNull()
    w.unmount()

    // „Seite neu geladen“: neue Pinia, keine Sitzungsbilder; ein hochgeladenes Bild ausgewählt
    pinia = createPinia()
    setActivePinia(pinia)
    w = mountPanel({ images: [images[1]] })
    wrapper = w
    // Panel sichtbar, obwohl nur 1 Bild gewählt ist – das Preset enthält Stock-Bilder
    expect(w.find('.slideshow-panel').exists()).toBe(true)
    expect(w.find('.preset-images-badge').text()).toBe('🗂')
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.findAll('.order-name').map((n) => n.text())).toEqual(['Stock Wald', 'Zwei'])
    expect(w.findAll('.order-duration')[0].element.value).toBe('6')
    expect(w.find('.btn-start').element.disabled).toBe(false)
  })

  it('uploaded images are persisted and restored after reload (IndexedDB)', async () => {
    const keyA = 'a'.repeat(64)
    persistence.persistUploadImage.mockImplementation(async (img) =>
      img.id === 'a' ? { key: keyA, name: 'Eins' } : null,
    )
    const restoredObj = { restored: true }
    persistence.restoreUploadImage.mockImplementation(async (key) =>
      key === keyA ? { imageObject: restoredObj, name: 'Eins' } : null,
    )

    let w = mountPanel()
    await w.findAll('.order-duration')[0].setValue('4')
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].slots[0].upload).toEqual({ key: keyA, name: 'Eins' })
    expect(stored[0].slots[1].upload).toBeNull()
    w.unmount()

    // „Seite neu geladen“: keine Sitzungsbilder, ein anderes Bild ausgewählt
    pinia = createPinia()
    setActivePinia(pinia)
    w = mountPanel({ images: [images[1]] })
    wrapper = w
    expect(w.find('.slideshow-panel').exists()).toBe(true)
    expect(w.find('.preset-images-badge').text()).toBe('🗂')
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    // Position 1 aus IndexedDB, Position 2 (nicht gespeichert) aus der Auswahl
    expect(w.findAll('.order-name').map((n) => n.text())).toEqual(['Eins', 'Zwei'])
    expect(w.findAll('.order-duration')[0].element.value).toBe('4')
    await w.find('.btn-start').trigger('click')
    const started = w.emitted('start')[0][0].images
    expect(started[0]).toMatchObject({ id: `preset:${keyA}`, imageObject: restoredObj })
    persistence.persistUploadImage.mockReset()
    persistence.persistUploadImage.mockImplementation(async () => null)
    persistence.restoreUploadImage.mockImplementation(async () => null)
  })

  it('a new image list with the same images does not overwrite a loaded preset list', async () => {
    const w = mountPanel({ images: [images[1], images[0]] })
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    await w.setProps({ images: [images[0], images[1]] })
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.findAll('.order-name').map((n) => n.text())).toEqual(['Zwei', 'Eins'])
    // Galerie ändert sich (neues Array, gleiche Auswahl) → Liste bleibt
    await w.setProps({ images: images.map((i) => ({ ...i })) })
    expect(w.findAll('.order-name').map((n) => n.text())).toEqual(['Zwei', 'Eins'])
    // echte Auswahländerung → Auswahl gilt
    await w.setProps({ images: [images[0]] })
    await w.setProps({ images })
    expect(w.findAll('.order-name').map((n) => n.text())).toEqual(['Eins', 'Zwei'])
  })

  it('full storage: cleans up and retries saving the image once', async () => {
    const quota = Object.assign(new Error('full'), { name: 'QuotaExceededError' })
    let attemptsA = 0
    persistence.persistUploadImage.mockImplementation(async (img) => {
      if (img.id !== 'a') return null
      attemptsA++
      if (attemptsA === 1) throw quota
      return { key: 'c'.repeat(64), name: 'Eins' }
    })
    const w = mountPanel()
    const { useSlideshowPresetStore } = await import('../../stores/slideshowPresetStore.js')
    const store = useSlideshowPresetStore()
    const cleanup = vi.spyOn(store, 'cleanupImages').mockResolvedValue(2)
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    expect(cleanup).toHaveBeenCalledTimes(1)
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].slots[0].upload).toEqual({ key: 'c'.repeat(64), name: 'Eins' })
    expect(attemptsA).toBe(2)
    persistence.persistUploadImage.mockImplementation(async () => null)
  })

  it('„Jetzt aufräumen“ entfernt ungenutzte Bilder und meldet den freigegebenen Platz', async () => {
    const w = mountPanel()
    const { useSlideshowPresetStore, MANUAL_CLEANUP_GRACE_MS } = await import(
      '../../stores/slideshowPresetStore.js'
    )
    const { useToastStore } = await import('../../stores/toastStore.js')
    const store = useSlideshowPresetStore()
    const toasts = useToastStore()
    const success = vi.spyOn(toasts, 'success')
    const info = vi.spyOn(toasts, 'info')
    store.imageStats = { available: true, count: 3, bytes: 3 * 1024 ** 2, usage: null, quota: null }
    await flushPromises()
    const cleanup = vi.spyOn(store, 'cleanupImages').mockResolvedValue(2)
    vi.spyOn(store, 'refreshImageStats').mockImplementation(async () => {
      store.imageStats = { ...store.imageStats, count: 1, bytes: 1024 ** 2 }
      return store.imageStats
    })

    await w.find('.btn-cleanup-storage').trigger('click')
    await flushPromises()
    expect(cleanup).toHaveBeenCalledWith({ minAgeMs: MANUAL_CLEANUP_GRACE_MS })
    expect(success.mock.calls.at(-1)[0]).toBe('Aufgeräumt: 2 Bilder · 2 MB')

    cleanup.mockResolvedValue(0)
    await w.find('.btn-cleanup-storage').trigger('click')
    await flushPromises()
    expect(info).toHaveBeenCalled()
    expect(w.find('.btn-cleanup-storage').element.disabled).toBe(false)
  })

  it('saves the preset even if persisting an image fails', async () => {
    persistence.persistUploadImage.mockImplementationOnce(async () => {
      throw new Error('QuotaExceeded')
    })
    const w = mountPanel()
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored).toHaveLength(1)
    expect(stored[0].slots.every((slot) => slot.upload === null)).toBe(true)
  })

  it('transition: global select + per-image override go into payload and presets', async () => {
    const w = mountPanel()
    expect(w.find('.transition-select').element.value).toBe('fade')
    await w.find('.transition-select').setValue('slideLeft')
    await w.findAll('.order-transition')[1].setValue('zoomIn')
    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.transition).toBe('slideLeft')
    expect(payload.images.map((i) => i.transition)).toEqual([undefined, 'zoomIn'])

    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].settings.transition).toBe('slideLeft')
    expect(stored[0].slots.map((sl) => sl.transition)).toEqual([null, 'zoomIn'])

    await w.find('.transition-select').setValue('fade')
    await w.findAll('.order-transition')[1].setValue('default')
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.find('.transition-select').element.value).toBe('slideLeft')
    expect(w.findAll('.order-transition')[1].element.value).toBe('zoomIn')
    expect(w.findAll('.order-transition')[0].element.value).toBe('default')
  })

  it('per-image transitions are remembered permanently (reload)', async () => {
    const withObj = (img, w, h) => ({
      ...img,
      imageObject: { ...img.imageObject, width: w, height: h },
    })
    const imgs = [withObj(images[0], 10, 10), withObj(images[1], 20, 10)]
    let w = mountPanel({ images: imgs })
    await w.findAll('.order-transition')[1].setValue('rotate')
    w.unmount()
    pinia = createPinia()
    setActivePinia(pinia)
    // neue IDs (z. B. nach Neuladen), gleiche Namen + Maße
    w = mountPanel({ images: imgs.map((i) => ({ ...i, id: `${i.id}-neu` })) })
    wrapper = w
    expect(w.findAll('.order-transition')[1].element.value).toBe('rotate')
    expect(w.findAll('.order-transition')[0].element.value).toBe('default')
    // zurück auf Standard → vergessen
    await w.findAll('.order-transition')[1].setValue('default')
    expect(JSON.parse(localStorage.getItem('visualizer-slideshow-image-transitions'))).toEqual({})
  })

  it('paused: click request opens the image editor; edits go live and close on resume', async () => {
    const w = mountPanel()
    await w.setProps({ isActive: true, isPaused: true })
    expect(w.find('.paused-edit-hint').exists()).toBe(true)
    await w.setProps({ editImageRequest: { index: 1, nonce: 1 } })
    const editor = w.find('.image-editor')
    expect(editor.exists()).toBe(true)
    expect(editor.text()).toContain('Zwei')

    await editor.find('.editor-transition').setValue('slideUp')
    let live = w.emitted('live-update').at(-1)[0]
    expect(live.preserveLive).toBe(true)
    expect(live.images[1].transition).toBe('slideUp')

    const dur = editor.find('.editor-duration')
    dur.element.value = '7'
    await dur.trigger('input')
    live = w.emitted('live-update').at(-1)[0]
    expect(live.images[1].displayDuration).toBe(7000)

    await editor.find('.editor-audio').setValue('glitch')
    live = w.emitted('live-update').at(-1)[0]
    expect(live.images[1].audioMode).toBe('glitch')
    expect(live.images[0].audioMode).toBe('default')

    await w.setProps({ isPaused: false })
    expect(w.find('.image-editor').exists()).toBe(false)
  })

  it('editor request is ignored while running', async () => {
    const w = mountPanel()
    await w.setProps({ isActive: true, isPaused: false, editImageRequest: { index: 0, nonce: 2 } })
    expect(w.find('.image-editor').exists()).toBe(false)
  })

  it('reset in the transform section restores defaults and emits transform-change', async () => {
    const w = mountPanel()
    const xNum = w.findAll('.transform-control input[type="number"]')[0].element
    xNum.value = '40'
    xNum.dispatchEvent(new Event('input', { bubbles: true }))
    await w.vm.$nextTick()
    await w.find('.btn-reset-transform').trigger('click')
    expect(w.emitted('transform-change').at(-1)[0]).toEqual({
      relX: 0.1,
      relY: 0.1,
      relWidth: 0.8,
      relHeight: 0.8,
    })
    expect(w.find('.transform-control .value').text()).toBe('10%')
  })

  it('forwards pause/resume/stop and render-layer changes', async () => {
    const w = mountPanel({ isActive: true, isPaused: true })
    await w.find('.btn-resume').trigger('click')
    await w.find('.btn-stop').trigger('click')
    await w.find('.layer-section input[type="checkbox"]').setValue(true)
    expect(w.emitted('resume')).toHaveLength(1)
    expect(w.emitted('stop')).toHaveLength(1)
    expect(w.emitted('render-layer-change')).toEqual([[true]])
  })
})
