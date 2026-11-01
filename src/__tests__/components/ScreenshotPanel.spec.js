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
