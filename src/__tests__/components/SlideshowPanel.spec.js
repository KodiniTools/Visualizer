// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SlideshowPanel from '../../components/foto-panel/SlideshowPanel.vue'

const images = [
  { id: 'a', name: 'Eins', imageObject: { src: 'data:,a' } },
  { id: 'b', name: 'Zwei', imageObject: { src: 'data:,b' } },
]

let wrapper
afterEach(() => wrapper?.unmount())

function mountPanel(props = {}) {
  wrapper = mount(SlideshowPanel, { props: { images, hasSavedSettings: true, ...props } })
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
