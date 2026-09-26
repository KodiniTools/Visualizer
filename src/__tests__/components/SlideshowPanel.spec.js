// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SlideshowPanel from '../../components/foto-panel/SlideshowPanel.vue'

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
    expect(w.findAll('.preset-item')).toHaveLength(1)
    expect(w.find('.preset-name').text()).toBe('Party')
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].slots).toEqual([
      { displayDuration: null, audioMode: 'pulse', adjustments: null, bounds: null },
      { displayDuration: 9000, audioMode: 'default', adjustments: null, bounds: null },
    ])

    // Werte ändern, dann Preset laden -> ursprünglicher Zustand
    await w.findAll('.order-duration')[1].setValue('')
    await w.findAll('.order-audio')[0].setValue('off')
    await w.find('.loop-section input[type="checkbox"]').setValue(false)
    await w.find('.btn-load-preset').trigger('click')

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
    const stored = JSON.parse(localStorage.getItem('visualizer-slideshow-presets'))
    expect(stored[0].slots[0].adjustments).toEqual({ contrast: 120, sepia: 30 })
    expect(stored[0].slots[1].adjustments).toBeNull()

    await w.find('.btn-load-preset').trigger('click')
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
    expect(setBounds).toEqual([
      ['a', { relX: 0.1, relY: 0.2, relWidth: 0.3, relHeight: 0.3 }],
      ['b', null],
    ])
    const live = w.emitted('live-update').at(-1)[0]
    expect(live.images.map((i) => i.id)).toEqual(['a', 'b'])

    // Nach dem Stoppen ohne Auswahl ist das Panel ausgeblendet …
    await w.setProps({ isActive: false })
    expect(w.find('.slideshow-panel').exists()).toBe(false)
    // … mit neuer Auswahl gilt wieder diese
    await w.setProps({ images: [images[1], images[0]] })
    expect(w.findAll('.order-name').map((n) => n.text())).toEqual(['Zwei', 'Eins'])
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
