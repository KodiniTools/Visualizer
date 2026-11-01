// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ScreenshotPanel from '../../components/ScreenshotPanel.vue'
import { registerCanvasScreenshot } from '../../lib/canvasScreenshotBridge.js'
import { useToastStore } from '../../stores/toastStore.js'

/** Image-Stub: lädt sofort und meldet feste Maße. */
class FakeImage {
  width = 320
  height = 180
  set src(v) {
    this._src = v
    queueMicrotask(() => this.onload?.())
  }
  get src() {
    return this._src
  }
}

let unregister = () => {}
let toast

beforeEach(() => {
  setActivePinia(createPinia())
  toast = useToastStore()
  vi.spyOn(toast, 'success').mockImplementation(() => {})
  vi.spyOn(toast, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('Image', FakeImage)
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:shot'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  unregister()
  unregister = () => {}
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ScreenshotPanel – Aufnahme über die Render-Schleife', () => {
  it('meldet einen Fehler, wenn keine Screenshot-Funktion registriert ist', async () => {
    const wrapper = mount(ScreenshotPanel)
    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.preview-section').exists()).toBe(false)
  })

  it('PNG: ruft die registrierte Funktion und zeigt die Vorschau', async () => {
    const shot = vi.fn(async () => ({ size: 2048 }))
    unregister = registerCanvasScreenshot(shot)
    const wrapper = mount(ScreenshotPanel)

    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()

    expect(shot).toHaveBeenCalledWith('image/png', 0.9)
    expect(toast.success).toHaveBeenCalledTimes(1)
    const preview = wrapper.find('.preview-section')
    expect(preview.exists()).toBe(true)
    expect(preview.text()).toContain('320 x 180')
    expect(preview.text()).toContain('2.0 KB')
  })

  it('JPG: übergibt Format und Qualität', async () => {
    const shot = vi.fn(async () => ({ size: 10 }))
    unregister = registerCanvasScreenshot(shot)
    const wrapper = mount(ScreenshotPanel)

    const jpg = wrapper.findAll('.format-btn').find((b) => b.text() === 'JPG')
    await jpg.trigger('click')
    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()

    expect(shot).toHaveBeenCalledWith('image/jpeg', 0.9)
  })

  it('meldet einen Fehler, wenn kein Blob entsteht', async () => {
    unregister = registerCanvasScreenshot(vi.fn(async () => null))
    const wrapper = mount(ScreenshotPanel)
    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.btn-screenshot').attributes('disabled')).toBeUndefined()
  })
})

describe('ScreenshotPanel – Format, Vorschau und Vollbild', () => {
  let wrapper
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  async function capture(format) {
    unregister = registerCanvasScreenshot(vi.fn(async () => ({ size: 3 * 1024 * 1024 })))
    wrapper = mount(ScreenshotPanel, { attachTo: document.body })
    if (format) {
      await wrapper
        .findAll('.format-btn')
        .find((b) => b.text() === format)
        .trigger('click')
    }
    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()
  }

  it('PNG zeigt den Hinweis statt des Qualitätsreglers, JPG/WebP umgekehrt', async () => {
    wrapper = mount(ScreenshotPanel)
    expect(wrapper.find('.info-section').exists()).toBe(true)
    expect(wrapper.find('.quality-value').exists()).toBe(false)
    const webp = wrapper.findAll('.format-btn').find((b) => b.text() === 'WebP')
    await webp.trigger('click')
    expect(webp.classes()).toContain('active')
    expect(wrapper.find('.info-section').exists()).toBe(false)
    expect(wrapper.find('.quality-value').text()).toBe('90%')
  })

  it('Dateiname enthält Maße und Endung (jpeg → .jpg), Größe in MB', async () => {
    await capture('JPG')
    const link = wrapper.find('.preview-section .btn-download')
    expect(link.attributes('href')).toBe('blob:shot')
    expect(link.attributes('download')).toMatch(
      /^screenshot_320x180_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.jpg$/,
    )
    expect(wrapper.find('.file-size').text()).toBe('3.00 MB')
    expect(wrapper.find('.file-dimensions').text()).toBe('320 x 180')
  })

  it('kleine Dateien in Byte', async () => {
    unregister = registerCanvasScreenshot(vi.fn(async () => ({ size: 512 })))
    wrapper = mount(ScreenshotPanel)
    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()
    expect(wrapper.find('.file-size').text()).toBe('512 B')
  })

  it('ein neuer Screenshot gibt die alte Vorschau-URL frei', async () => {
    await capture()
    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:shot')
  })

  it('Download meldet „Download gestartet“', async () => {
    await capture()
    await wrapper.find('.preview-section .btn-download').trigger('click')
    expect(toast.success).toHaveBeenLastCalledWith(expect.any(String))
    expect(toast.success).toHaveBeenCalledTimes(2)
  })

  it('Schließen der Vorschau gibt die URL frei und blendet sie aus', async () => {
    await capture()
    await wrapper.find('.btn-close-preview').trigger('click')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:shot')
    expect(wrapper.find('.preview-section').exists()).toBe(false)
  })

  it('Doppelklick öffnet die Vollbild-Vorschau mit Format, Maßen und Größe', async () => {
    await capture('WebP')
    await wrapper.find('.preview-container').trigger('dblclick')
    const modal = document.body.querySelector('.fullscreen-modal')
    expect(modal).not.toBeNull()
    expect(modal.querySelector('.metadata-tag').textContent).toBe('WebP')
    expect(modal.textContent).toContain('320 x 180')
    expect(modal.textContent).toContain('3.00 MB')
    expect(modal.querySelector('.btn-download-icon').getAttribute('download')).toMatch(/\.webp$/)
  })

  it('Escape, Overlay-Klick und Schließen-Knopf beenden das Vollbild', async () => {
    await capture()
    const open = async () => {
      await wrapper.find('.preview-container').trigger('dblclick')
      expect(document.body.querySelector('.fullscreen-modal')).not.toBeNull()
    }
    const isClosed = () => document.body.querySelector('.fullscreen-modal') === null

    await open()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(isClosed()).toBe(true)

    await open()
    document.body.querySelector('.fullscreen-modal').click()
    await flushPromises()
    expect(isClosed()).toBe(false)
    document.body.querySelector('.fullscreen-modal-overlay').click()
    await flushPromises()
    expect(isClosed()).toBe(true)

    await open()
    document.body.querySelector('.btn-close-floating').click()
    await flushPromises()
    expect(isClosed()).toBe(true)
  })

  it('Schließen der Vorschau schließt auch das Vollbild', async () => {
    await capture()
    await wrapper.find('.preview-container').trigger('dblclick')
    await wrapper.find('.btn-close-preview').trigger('click')
    expect(document.body.querySelector('.fullscreen-modal')).toBeNull()
  })
})

describe('ScreenshotPanel – Aufräumen und Fehlerfälle', () => {
  it('ein nicht dekodierbares Bild meldet einen Fehler statt zu hängen', async () => {
    class BrokenImage {
      set src(v) {
        queueMicrotask(() => this.onerror?.(new Event('error')))
      }
    }
    vi.stubGlobal('Image', BrokenImage)
    unregister = registerCanvasScreenshot(vi.fn(async () => ({ size: 10 })))
    const wrapper = mount(ScreenshotPanel)
    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.btn-screenshot').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.preview-section').exists()).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:shot')
  })

  it('Unmount gibt die Vorschau-URL frei und entfernt den Escape-Listener', async () => {
    unregister = registerCanvasScreenshot(vi.fn(async () => ({ size: 10 })))
    const wrapper = mount(ScreenshotPanel, { attachTo: document.body })
    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()
    await wrapper.find('.preview-container').trigger('dblclick')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:shot')
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    document.body.innerHTML = ''
  })

  it('Schließen der Vorschau bei offenem Vollbild entfernt auch den Escape-Listener', async () => {
    unregister = registerCanvasScreenshot(vi.fn(async () => ({ size: 10 })))
    const wrapper = mount(ScreenshotPanel, { attachTo: document.body })
    await wrapper.find('.btn-screenshot').trigger('click')
    await flushPromises()
    await wrapper.find('.preview-container').trigger('dblclick')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    await wrapper.find('.btn-close-preview').trigger('click')
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    wrapper.unmount()
    document.body.innerHTML = ''
  })
})
