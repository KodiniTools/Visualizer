// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SlideshowPresets from '../../components/foto-panel/slideshow/SlideshowPresets.vue'

let wrapper
afterEach(() => wrapper?.unmount())

const mountWith = (storage) => {
  wrapper = mount(SlideshowPresets, { props: { presets: [], storage } })
  return wrapper
}

describe('SlideshowPresets – Speicherbelegung', () => {
  it('zeigt Anzahl, Größe und Browser-Kontingent', () => {
    const w = mountWith({
      available: true,
      count: 3,
      bytes: 3 * 1024 ** 2,
      usage: 20 * 1024 ** 2,
      quota: 100 * 1024 ** 2,
    })
    expect(w.find('.storage-value').text()).toMatch(/3\s+Bilder\s+·\s+3 MB/)
    expect(w.find('.storage-browser').text()).toContain('20 MB von 100 MB (20 %)')
    expect(w.find('.storage-bar-fill').attributes('style')).toContain('width: 20%')
    expect(w.find('.storage-info').classes()).not.toContain('warning')
  })

  it('Einzahl bei einem Bild; ohne Kontingent keine Leiste', () => {
    const w = mountWith({ available: true, count: 1, bytes: 2048, usage: null, quota: null })
    expect(w.find('.storage-value').text()).toMatch(/1\s+Bild\s+·\s+2 KB/)
    expect(w.find('.storage-bar').exists()).toBe(false)
  })

  it('warnt ab 80 % Belegung', () => {
    const w = mountWith({ available: true, count: 9, bytes: 1, usage: 85, quota: 100 })
    expect(w.find('.storage-info').classes()).toContain('warning')
    expect(w.find('.storage-info .hint.warning').exists()).toBe(true)
  })

  it('ausgeblendet, wenn der Speicher nicht verfügbar ist', () => {
    expect(mountWith({ available: false }).find('.storage-info').exists()).toBe(false)
  })
})

describe('SlideshowPresets – Jetzt aufräumen', () => {
  const storage = { available: true, count: 2, bytes: 100, usage: null, quota: null }

  it('Knopf emittiert cleanup', async () => {
    wrapper = mount(SlideshowPresets, { props: { presets: [], storage } })
    await wrapper.find('.btn-cleanup-storage').trigger('click')
    expect(wrapper.emitted('cleanup')).toHaveLength(1)
  })

  it('während des Aufräumens gesperrt', () => {
    wrapper = mount(SlideshowPresets, { props: { presets: [], storage, cleaning: true } })
    const btn = wrapper.find('.btn-cleanup-storage')
    expect(btn.element.disabled).toBe(true)
    expect(btn.text()).toContain('Räume auf')
  })
})
