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
  loadPersistedImage: vi.fn(async () => null),
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
        audioSource: null,
        adjustments: null,
        bounds: null,
        transition: null,
        fadeIn: null,
        fadeOut: null,
        stock: null,
        upload: null,
      },
      {
        displayDuration: 9000,
        audioMode: 'default',
        audioSource: null,
        adjustments: null,
        bounds: null,
        transition: null,
        fadeIn: null,
        fadeOut: null,
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

  it('background mode: workspace option disabled without a workspace format', () => {
    const w = mountPanel({ hasWorkspace: false })
    expect(w.find('.bg-mode-workspace').element.disabled).toBe(true)
    expect(w.find('.bg-mode-canvas').element.disabled).toBe(false)
    expect(w.find('.bg-mode-none').element.checked).toBe(true)
  })

  it('background mode workspace: behind visualizer, hides transform, sends option', async () => {
    const w = mountPanel({ hasWorkspace: true })
    await w.find('.bg-mode-workspace').setValue(true)
    expect(w.emitted('background-mode-change').at(-1)).toEqual(['workspace'])
    expect(w.emitted('render-layer-change').at(-1)).toEqual([true])
    expect(w.find('.transform-section').exists()).toBe(false)

    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.backgroundMode).toBe('workspace')
    expect(payload.fitToWorkspace).toBe(true)
    expect(payload.renderBehindVisualizer).toBe(true)

    // Workspace-Format entfernt → wirkungslos, Transform wieder sichtbar
    await w.setProps({ hasWorkspace: false })
    expect(w.emitted('background-mode-change').at(-1)).toEqual(['none'])
    expect(w.find('.transform-section').exists()).toBe(true)
  })

  it('background mode canvas: works without workspace, saved in presets', async () => {
    const w = mountPanel({ hasWorkspace: false })
    await w.find('.bg-mode-canvas').setValue(true)
    expect(w.emitted('background-mode-change').at(-1)).toEqual(['canvas'])
    expect(w.find('.transform-section').exists()).toBe(false)
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[0][0]).toMatchObject({
      backgroundMode: 'canvas',
      fitToWorkspace: false,
    })

    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    expect(
      JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))[0].settings.backgroundMode,
    ).toBe('canvas')
    await w.find('.bg-mode-none').setValue(true)
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.find('.bg-mode-canvas').element.checked).toBe(true)
  })

  it('base color: only in background mode, live change, preset, reset', async () => {
    const w = mountPanel({ hasWorkspace: false })
    expect(w.find('.slideshow-base-color').exists()).toBe(false)
    await w.find('.bg-mode-canvas').setValue(true)
    const input = w.find('.slideshow-base-color')
    expect(input.element.value).toBe('#000000')
    expect(w.find('.btn-reset-base-color').exists()).toBe(false)

    await input.setValue('#336699')
    expect(w.emitted('background-color-change').at(-1)).toEqual(['#336699'])
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[0][0].backgroundColor).toBe('#336699')

    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    expect(
      JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))[0].settings.backgroundColor,
    ).toBe('#336699')

    await w.find('.btn-reset-base-color').trigger('click')
    expect(w.emitted('background-color-change').at(-1)).toEqual(['#000000'])
    expect(w.find('.slideshow-base-color').element.value).toBe('#000000')

    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.find('.slideshow-base-color').element.value).toBe('#336699')
    expect(w.emitted('background-color-change').at(-1)).toEqual(['#336699'])
  })

  it('base color is remembered without a preset (after remount)', async () => {
    let w = mountPanel({ hasWorkspace: false })
    await w.find('.bg-mode-canvas').setValue(true)
    await w.find('.slideshow-base-color').setValue('#aa5500')
    expect(localStorage.getItem('visualizer-slideshow-base-color')).toBe('#aa5500')
    w.unmount()

    w = mountPanel({ hasWorkspace: false })
    await w.find('.bg-mode-canvas').setValue(true)
    expect(w.find('.slideshow-base-color').element.value).toBe('#aa5500')
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[0][0].backgroundColor).toBe('#aa5500')

    // Zurücksetzen entfernt den Eintrag
    await w.find('.btn-reset-base-color').trigger('click')
    expect(localStorage.getItem('visualizer-slideshow-base-color')).toBeNull()
  })

  it('workspace color: own field, persisted, preset, reset', async () => {
    let w = mountPanel({ hasWorkspace: true })
    await w.find('.bg-mode-workspace').setValue(true)
    expect(w.find('.slideshow-base-color').exists()).toBe(false)
    const input = w.find('.slideshow-workspace-color')
    expect(input.element.value).toBe('#000000')

    await input.setValue('#224466')
    expect(w.emitted('workspace-color-change').at(-1)).toEqual(['#224466'])
    expect(localStorage.getItem('visualizer-slideshow-workspace-color')).toBe('#224466')
    // Canvas-Farbe bleibt unberührt
    expect(localStorage.getItem('visualizer-slideshow-base-color')).toBeNull()
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[0][0]).toMatchObject({
      workspaceColor: '#224466',
      backgroundColor: '#000000',
    })

    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    expect(
      JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))[0].settings.workspaceColor,
    ).toBe('#224466')
    w.unmount()

    // Neu öffnen: gemerkt; Zurücksetzen entfernt den Eintrag, Preset stellt her
    w = mountPanel({ hasWorkspace: true })
    await w.find('.bg-mode-workspace').setValue(true)
    expect(w.find('.slideshow-workspace-color').element.value).toBe('#224466')
    await w.find('.btn-reset-workspace-color').trigger('click')
    expect(w.emitted('workspace-color-change').at(-1)).toEqual(['#000000'])
    expect(localStorage.getItem('visualizer-slideshow-workspace-color')).toBeNull()
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.find('.slideshow-workspace-color').element.value).toBe('#224466')
  })

  it('gradient per area: live, persisted, preset, reset', async () => {
    let w = mountPanel({ hasWorkspace: true })
    await w.find('.bg-mode-canvas').setValue(true)
    expect(w.find('.base-gradient-color2').exists()).toBe(false)
    await w.find('.base-gradient-toggle').setValue(true)
    expect(w.emitted('base-gradient-change').at(-1)).toEqual([
      'canvas',
      {
        enabled: true,
        color2: '#333333',
        type: 'linear',
        angle: 90,
        audio: { enabled: false, source: 'bass', pulse: 80, rotation: 80 },
      },
    ])
    await w.find('.base-gradient-color2').setValue('#ff8800')
    await w.find('.base-gradient-angle').setValue('45')
    await w.find('.base-gradient-type').setValue('radial')
    expect(w.find('.base-gradient-angle').exists()).toBe(false) // nur linear
    const canvasGradient = {
      enabled: true,
      color2: '#ff8800',
      type: 'radial',
      angle: 45,
      audio: { enabled: false, source: 'bass', pulse: 80, rotation: 80 },
    }
    expect(w.emitted('base-gradient-change').at(-1)).toEqual(['canvas', canvasGradient])
    expect(JSON.parse(localStorage.getItem('visualizer-slideshow-base-gradient'))).toEqual(
      canvasGradient,
    )

    // Workspace hat einen eigenen Verlauf
    await w.find('.bg-mode-workspace').setValue(true)
    expect(w.find('.workspace-gradient-toggle').element.checked).toBe(false)
    await w.find('.workspace-gradient-toggle').setValue(true)
    expect(w.emitted('base-gradient-change').at(-1)[0]).toBe('workspace')

    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[0][0]).toMatchObject({
      backgroundGradient: canvasGradient,
      workspaceGradient: { enabled: true },
    })
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    expect(
      JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))[0].settings
        .backgroundGradient,
    ).toEqual(canvasGradient)
    w.unmount()

    // Neu öffnen: gemerkt; Zurücksetzen → Schwarz ohne Verlauf; Preset stellt her
    w = mountPanel({ hasWorkspace: true })
    await w.find('.bg-mode-canvas').setValue(true)
    expect(w.find('.base-gradient-toggle').element.checked).toBe(true)
    await w.find('.btn-reset-base-color').trigger('click')
    expect(w.find('.base-gradient-toggle').element.checked).toBe(false)
    expect(localStorage.getItem('visualizer-slideshow-base-gradient')).toBeNull()
    expect(w.find('.btn-reset-base-color').exists()).toBe(false)
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.emitted('base-gradient-change').at(-1)).toEqual(['canvas', canvasGradient])
    // Preset wurde im Workspace-Modus gespeichert → Modus mit wiederhergestellt
    expect(w.find('.bg-mode-workspace').element.checked).toBe(true)
    await w.find('.bg-mode-canvas').setValue(true)
    expect(w.find('.base-gradient-type').element.value).toBe('radial')
  })

  it('gradient audio-reactive: toggle, source, strengths reach the slideshow', async () => {
    const w = mountPanel({ hasWorkspace: false })
    await w.find('.bg-mode-canvas').setValue(true)
    await w.find('.base-gradient-toggle').setValue(true)
    expect(w.find('.base-gradient-audio-source').exists()).toBe(false)
    await w.find('.base-gradient-audio-toggle').setValue(true)
    // Quelle wie beim Bild-Audio-Reaktiv, inkl. Onset
    expect(w.findAll('.base-gradient-audio-source option')).toHaveLength(9)
    await w.find('.base-gradient-audio-source').setValue('trebleOnset')
    await w.find('.base-gradient-audio-pulse').setValue('40')
    await w.find('.base-gradient-audio-rotation').setValue('0')
    const last = w.emitted('base-gradient-change').at(-1)
    expect(last[0]).toBe('canvas')
    expect(last[1].audio).toEqual({ enabled: true, source: 'trebleOnset', pulse: 40, rotation: 0 })
    expect(
      JSON.parse(localStorage.getItem('visualizer-slideshow-base-gradient')).audio.source,
    ).toBe('trebleOnset')
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[0][0].backgroundGradient.audio.pulse).toBe(40)
  })

  it('audio-reactive fill color: per area, persisted, preset, reset', async () => {
    let w = mountPanel({ hasWorkspace: true })
    await w.find('.bg-mode-workspace').setValue(true)
    expect(w.find('.workspace-fill-audio-source').exists()).toBe(false)
    await w.find('.workspace-fill-audio-toggle').setValue(true)
    await w.find('.workspace-fill-audio-source').setValue('volume')
    await w.find('.workspace-fill-audio-hue').setValue('60')
    const fx = { enabled: true, source: 'volume', brightness: 80, hue: 60 }
    expect(w.emitted('base-fill-audio-change').at(-1)).toEqual(['workspace', fx])
    expect(JSON.parse(localStorage.getItem('visualizer-slideshow-workspace-fill-audio'))).toEqual(
      fx,
    )
    expect(localStorage.getItem('visualizer-slideshow-base-fill-audio')).toBeNull()
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start')[0][0]).toMatchObject({
      workspaceFillAudio: fx,
      backgroundFillAudio: { enabled: false },
    })
    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    expect(
      JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))[0].settings
        .workspaceFillAudio,
    ).toEqual(fx)
    w.unmount()

    w = mountPanel({ hasWorkspace: true })
    await w.find('.bg-mode-workspace').setValue(true)
    expect(w.find('.workspace-fill-audio-toggle').element.checked).toBe(true)
    await w.find('.btn-reset-workspace-color').trigger('click')
    expect(w.find('.workspace-fill-audio-toggle').element.checked).toBe(false)
    expect(localStorage.getItem('visualizer-slideshow-workspace-fill-audio')).toBeNull()
    await w.find('.btn-load-preset').trigger('click')
    await flushPromises()
    expect(w.find('.workspace-fill-audio-toggle').element.checked).toBe(true)
    expect(w.emitted('base-fill-audio-change').at(-1)).toEqual(['workspace', fx])
  })

  it('own area image: pick from upload gallery, persisted, audio, sent with start', async () => {
    const { useImageGallery } = await import('../../composables/useImageGallery.js')
    const gallery = useImageGallery()
    gallery.clearAllImages()
    const img = { src: 'data:,galerie' }
    gallery.imageGallery.value.push({ id: 7, img, name: 'galerie.png' })
    persistence.persistUploadImage.mockResolvedValueOnce({
      key: 'b'.repeat(64),
      name: 'galerie.png',
    })

    const w = mountPanel({ hasWorkspace: false })
    await w.find('.bg-mode-canvas').setValue(true)
    await w.find('.base-image-toggle').setValue(true)
    await w.find('.base-image-choose').trigger('click')
    const options = w.findAll('.base-image-option')
    expect(options).toHaveLength(1)
    await options[0].trigger('click')
    await flushPromises()

    expect(persistence.persistUploadImage).toHaveBeenCalledWith({
      name: 'galerie.png',
      imageObject: img,
    })
    const [target, fill, image] = w.emitted('base-image-change').at(-1)
    expect(target).toBe('canvas')
    expect(fill).toMatchObject({ enabled: true, upload: { key: 'b'.repeat(64) } })
    expect(image).toBe(img)
    expect(w.find('.base-image-current').attributes('src')).toBe('data:,galerie')
    expect(JSON.parse(localStorage.getItem('visualizer-slideshow-base-image')).upload.name).toBe(
      'galerie.png',
    )

    await w.find('.base-image-fit').setValue('contain')
    await w.find('.base-image-audio-toggle').setValue(true)
    await w.find('.base-image-audio-zoom').setValue('90')
    expect(w.emitted('base-image-change').at(-1)[1]).toMatchObject({
      fit: 'contain',
      audio: { enabled: true, zoom: 90 },
    })

    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.backgroundImageObject).toBe(img)
    expect(payload.backgroundImageFill).toMatchObject({ enabled: true, fit: 'contain' })
    expect(payload.workspaceImageFill.enabled).toBe(false)

    await w.find('.base-image-clear').trigger('click')
    await flushPromises()
    expect(w.emitted('base-image-change').at(-1)[2]).toBeNull()
    gallery.clearAllImages()
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

    // Eigene Audio-Quelle des Bildes (inkl. Onset)
    const source = editor.find('.editor-audio-source')
    expect(source.element.value).toBe('')
    expect(source.findAll('option').map((o) => o.element.value)).toEqual([
      '',
      'bass',
      'mid',
      'treble',
      'volume',
      'dynamic',
      'bassOnset',
      'midOnset',
      'trebleOnset',
      'allOnset',
    ])
    await source.setValue('allOnset')
    live = w.emitted('live-update').at(-1)[0]
    expect(live.images[1].audioSource).toBe('allOnset')
    expect(live.images[0].audioSource).toBeNull()
    // Modus „Aus“ sperrt die Quelle; zurück auf „Wie Einstellung“ entfernt sie
    await editor.find('.editor-audio').setValue('off')
    expect(editor.find('.editor-audio-source').element.disabled).toBe(true)
    await editor.find('.editor-audio').setValue('glitch')
    await editor.find('.editor-audio-source').setValue('')
    expect(w.emitted('live-update').at(-1)[0].images[1].audioSource).toBeNull()

    await w.setProps({ isPaused: false })
    expect(w.find('.image-editor').exists()).toBe(false)
  })

  it('order list: audio source per row (incl. onset), locked when audio is off', async () => {
    const w = mountPanel()
    const sources = w.findAll('.order-audio-source')
    expect(sources).toHaveLength(2)
    expect(sources[0].findAll('option')).toHaveLength(10) // „Wie Einstellung“ + 9 Quellen
    expect(sources[0].find('optgroup').exists()).toBe(true)
    expect(sources[0].element.value).toBe('')

    await sources[1].setValue('bassOnset')
    expect(w.findAll('.order-audio-source')[1].classes()).toContain('is-own')
    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.images.map((i) => i.audioSource)).toEqual([null, 'bassOnset'])

    await w.findAll('.order-audio')[1].setValue('off')
    expect(w.findAll('.order-audio-source')[1].element.disabled).toBe(true)
    await w.findAll('.order-audio')[1].setValue('pulse')
    await w.findAll('.order-audio-source')[1].setValue('')
    await w.find('.btn-start').trigger('click')
    expect(w.emitted('start').at(-1)[0].images[1].audioSource).toBeNull()
  })

  it('workspace mode: area and per-image sources (incl. onset) reach the slideshow', async () => {
    const w = mountPanel({ hasWorkspace: true })
    await w.find('.bg-mode-workspace').setValue(true)
    // Farbe der Workspace-Fläche
    await w.find('.workspace-fill-audio-toggle').setValue(true)
    const fillSource = w.find('.workspace-fill-audio-source')
    expect(fillSource.findAll('option')).toHaveLength(9)
    await fillSource.setValue('allOnset')
    // Farbverlauf der Workspace-Fläche
    await w.find('.workspace-gradient-toggle').setValue(true)
    await w.find('.workspace-gradient-audio-toggle').setValue(true)
    await w.find('.workspace-gradient-audio-source').setValue('bassOnset')
    // Flächenbild (ohne Bild) – Quelle trotzdem einstellbar
    await w.find('.workspace-image-toggle').setValue(true)
    await w.find('.workspace-image-audio-toggle').setValue(true)
    await w.find('.workspace-image-audio-source').setValue('dynamic')
    // Canvas-Felder sind im Workspace-Modus ausgeblendet
    expect(w.find('.base-fill-audio-source').exists()).toBe(false)
    // eigene Quelle pro Bild
    await w.findAll('.order-audio-source')[0].setValue('midOnset')

    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.backgroundMode).toBe('workspace')
    expect(payload.workspaceFillAudio.source).toBe('allOnset')
    expect(payload.workspaceGradient.audio.source).toBe('bassOnset')
    expect(payload.workspaceImageFill.audio.source).toBe('dynamic')
    expect(payload.backgroundFillAudio.enabled).toBe(false) // Canvas unberührt
    expect(payload.images.map((i) => i.audioSource)).toEqual(['midOnset', null])

    // ohne Workspace-Format: Felder gesperrt, Modus wirkungslos
    await w.setProps({ hasWorkspace: false })
    expect(w.find('.workspace-fill-audio-source').element.disabled).toBe(true)
    expect(w.emitted('background-mode-change').at(-1)).toEqual(['none'])
  })

  it('editor request is ignored while running', async () => {
    const w = mountPanel()
    await w.setProps({ isActive: true, isPaused: false, editImageRequest: { index: 0, nonce: 2 } })
    expect(w.find('.image-editor').exists()).toBe(false)
  })

  it('per-image fade in/out: payload, permanent memory, presets; default label shows global', async () => {
    const withObj = (img, w, h) => ({
      ...img,
      imageObject: { ...img.imageObject, width: w, height: h },
    })
    const imgs = [withObj(images[0], 10, 10), withObj(images[1], 20, 10)]
    let w = mountPanel({ images: imgs })
    // „Standard (Überblenden)“ zeigt den aktuellen Standard-Übergang
    expect(w.findAll('.order-transition')[0].find('option').text()).toContain('Überblenden')
    await w.find('.transition-select').setValue('blur')
    expect(w.findAll('.order-transition')[0].find('option').text()).toContain('Weichzeichnen')

    await w.findAll('.order-fadein')[1].setValue('0.4')
    await w.findAll('.order-fadeout')[1].setValue('2.5')
    expect(w.findAll('.order-fadein')[1].classes()).toContain('is-own')
    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.images[1]).toMatchObject({ fadeInDuration: 400, fadeOutDuration: 2500 })
    expect(payload.images[0].fadeInDuration).toBeUndefined()

    await w.find('.btn-save-preset').trigger('click')
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].slots[1]).toMatchObject({ fadeIn: 400, fadeOut: 2500 })
    w.unmount()

    // Neuladen: dauerhaft gemerkt (unabhängig vom Preset)
    pinia = createPinia()
    setActivePinia(pinia)
    w = mountPanel({ images: imgs.map((i) => ({ ...i, id: `${i.id}-neu` })) })
    wrapper = w
    expect(w.findAll('.order-fadein')[1].element.value).toBe('0.4')
    expect(w.findAll('.order-fadeout')[1].element.value).toBe('2.5')
    expect(w.findAll('.order-fadein')[0].element.value).toBe('')
  })

  it('image editor: fade in/out fields go live', async () => {
    const w = mountPanel()
    await w.setProps({ isActive: true, isPaused: true, editImageRequest: { index: 0, nonce: 5 } })
    const fin = w.find('.image-editor .editor-fadein')
    fin.element.value = '0.8'
    await fin.trigger('input')
    const live = w.emitted('live-update').at(-1)[0]
    expect(live.preserveLive).toBe(true)
    expect(live.images[0].fadeInDuration).toBe(800)
  })

  it('per-image display duration and audio are remembered permanently (reload)', async () => {
    const withObj = (img, w, h) => ({
      ...img,
      imageObject: { ...img.imageObject, width: w, height: h },
    })
    const imgs = [withObj(images[0], 10, 10), withObj(images[1], 20, 10)]
    let w = mountPanel({ images: imgs })
    await w.findAll('.order-duration')[0].setValue('8')
    await w.findAll('.order-audio')[1].setValue('pulse')
    w.unmount()
    pinia = createPinia()
    setActivePinia(pinia)
    w = mountPanel({ images: imgs.map((i) => ({ ...i, id: `${i.id}-neu` })) })
    wrapper = w
    expect(w.findAll('.order-duration')[0].element.value).toBe('8')
    expect(w.findAll('.order-audio')[1].element.value).toBe('pulse')
    expect(w.findAll('.order-audio')[0].element.value).toBe('default')
    await w.find('.btn-start').trigger('click')
    const payload = w.emitted('start')[0][0]
    expect(payload.images[0].displayDuration).toBe(8000)
    expect(payload.images[1].audioMode).toBe('pulse')
    // zurück auf Standard → vergessen
    await w.findAll('.order-duration')[0].setValue('')
    await w.findAll('.order-audio')[1].setValue('default')
    expect(JSON.parse(localStorage.getItem('visualizer-slideshow-image-transitions'))).toEqual({})
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
