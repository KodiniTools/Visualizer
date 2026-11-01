// @vitest-environment jsdom
// Charakterisierung des RecorderPanels: Status, Steuerknöpfe, Mikrofon,
// Einstellungen, Stopp-Ablauf (WebM, Vorschau, Server-Konvertierung) und
// Aufräumen beim Unmount. Läuft gegen das sichtbare Verhalten, nicht gegen
// die interne Aufteilung.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const api = vi.hoisted(() => ({
  checkServerHealth: vi.fn(async () => ({ available: false })),
  convertAndWait: vi.fn(() => new Promise(() => {})),
  convertGifAndWait: vi.fn(() => new Promise(() => {})),
}))

vi.mock('../../lib/videoApi.js', async (importOriginal) => ({
  ...(await importOriginal()),
  checkServerHealth: api.checkServerHealth,
  convertAndWait: api.convertAndWait,
  convertGifAndWait: api.convertGifAndWait,
  cleanupFile: vi.fn(async () => {}),
}))

import RecorderPanel from '../../components/RecorderPanel.vue'
import { useRecorderStore } from '../../stores/recorderStore.js'
import { registerAudioEngine } from '../../lib/audioEngineBridge.js'
import de from '../../lib/i18n/de.js'

let store
let wrapper

function mountPanel() {
  wrapper = mount(RecorderPanel, { attachTo: document.body })
  return wrapper
}

/** Stellt den Store auf einen Zustand, ohne den echten Recorder zu bauen. */
function setState(patch) {
  store.$patch({ isPrepared: false, isRecording: false, isPaused: false, ...patch })
}

const visibleButtons = () =>
  wrapper
    .findAll('.recorder-controls .btn')
    .map((b) => b.classes().find((c) => c.startsWith('btn-') && c !== 'btn'))

beforeEach(() => {
  document.body.innerHTML = ''
  setActivePinia(createPinia())
  store = useRecorderStore()
  vi.spyOn(store, 'prepareRecording').mockImplementation(async () => {
    setState({ isPrepared: true, statusType: 'ready' })
    return true
  })
  vi.spyOn(store, 'startRecording').mockImplementation(async () => {
    setState({ isPrepared: true, isRecording: true, statusType: 'recording' })
    return true
  })
  vi.spyOn(store, 'pauseRecording').mockImplementation(() => {
    setState({ isPrepared: true, isRecording: true, isPaused: true, statusType: 'paused' })
    return true
  })
  vi.spyOn(store, 'resumeRecording').mockImplementation(() => {
    setState({ isPrepared: true, isRecording: true, statusType: 'recording' })
    return true
  })
  vi.spyOn(store, 'stopRecording').mockImplementation(async () => {
    const blob = new Blob(['x'], { type: 'video/webm' })
    setState({ statusType: 'idle', lastRecording: { blob } })
    return blob
  })
  vi.spyOn(store, 'resetRecorder').mockImplementation(() => setState({ statusType: 'idle' }))
  vi.spyOn(store, 'setRecordingQuality').mockImplementation(() => {})
  vi.spyOn(store, 'setRecordingFrameRate').mockImplementation(() => {})
  vi.spyOn(store, 'setUploadMode').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  let n = 0
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => `blob:url-${++n}`),
    revokeObjectURL: vi.fn(),
  })
  api.checkServerHealth.mockResolvedValue({ available: false })
  api.convertAndWait.mockClear()
  api.convertGifAndWait.mockClear()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('RecorderPanel – Status und Steuerknöpfe', () => {
  it('Leerlauf: nur „Vorbereiten“, Status idle, Einstellungen sichtbar', async () => {
    mountPanel()
    await flushPromises()
    expect(visibleButtons()).toEqual(['btn-prepare'])
    expect(wrapper.find('.status-indicator').classes()).toContain('idle')
    expect(wrapper.find('.status-text').text()).toBe(de.recorder.status.idle)
    expect(wrapper.find('.recording-timer').exists()).toBe(false)
    expect(wrapper.find('.quality-buttons').exists()).toBe(true)
  })

  it('Vorbereiten übergibt Qualität und Bildrate an den Store', async () => {
    mountPanel()
    await wrapper.find('.btn-prepare').trigger('click')
    await flushPromises()
    expect(store.prepareRecording).toHaveBeenCalledWith({ quality: 8_000_000, frameRate: 30 })
    expect(visibleButtons()).toEqual(['btn-start', 'btn-reset'])
    expect(wrapper.find('.status-indicator').classes()).toContain('ready')
    expect(wrapper.find('.status-text').text()).toBe(de.recorder.status.ready)
  })

  it('ein zweiter Klick während der Vorbereitung wird ignoriert', async () => {
    let release
    store.prepareRecording.mockImplementation(
      () =>
        new Promise((r) => {
          release = r
        }),
    )
    mountPanel()
    await wrapper.find('.btn-prepare').trigger('click')
    expect(wrapper.find('.btn-prepare').attributes('disabled')).toBeDefined()
    await wrapper.find('.btn-prepare').trigger('click')
    expect(store.prepareRecording).toHaveBeenCalledTimes(1)
    release(true)
    await flushPromises()
    expect(wrapper.find('.btn-prepare').attributes('disabled')).toBeUndefined()
  })

  it('Start: Pause/Stopp, Timer, Audioquelle, Einstellungen ausgeblendet', async () => {
    vi.useFakeTimers()
    setState({ isPrepared: true, statusType: 'ready' })
    mountPanel()
    await wrapper.find('.btn-start').trigger('click')
    await flushPromises()
    expect(store.startRecording).toHaveBeenCalledTimes(1)
    expect(visibleButtons()).toEqual(['btn-pause', 'btn-stop'])
    expect(wrapper.find('.status-text').text()).toBe(de.recorder.status.recording)
    expect(wrapper.find('.recording-timer').text()).toBe('00:00')
    vi.advanceTimersByTime(2100)
    await flushPromises()
    expect(wrapper.find('.recording-timer').text()).toBe('00:02')
    expect(wrapper.find('.audio-source-section').exists()).toBe(true)
    expect(wrapper.find('.quality-buttons').exists()).toBe(false)
  })

  it('Pause und Fortsetzen schalten Knöpfe, Status und Timer-Klasse', async () => {
    setState({ isPrepared: true, statusType: 'ready' })
    mountPanel()
    await wrapper.find('.btn-start').trigger('click')
    await flushPromises()
    await wrapper.find('.btn-pause').trigger('click')
    await flushPromises()
    expect(store.pauseRecording).toHaveBeenCalledTimes(1)
    expect(visibleButtons()).toEqual(['btn-resume', 'btn-stop'])
    expect(wrapper.find('.status-indicator').classes()).toContain('paused')
    expect(wrapper.find('.status-text').text()).toBe(de.recorder.status.paused)
    expect(wrapper.find('.recording-timer').classes()).toContain('paused')
    await wrapper.find('.btn-resume').trigger('click')
    await flushPromises()
    expect(store.resumeRecording).toHaveBeenCalledTimes(1)
    expect(visibleButtons()).toEqual(['btn-pause', 'btn-stop'])
    expect(wrapper.find('.recording-timer').classes()).not.toContain('paused')
  })

  it('Status „processing“ hat Vorrang vor allen anderen Zuständen', async () => {
    setState({ isRecording: true, statusType: 'processing' })
    mountPanel()
    await flushPromises()
    expect(wrapper.find('.status-indicator').classes()).toContain('processing')
    expect(wrapper.find('.status-text').text()).toBe(de.recorder.status.processing)
  })

  it('Zurücksetzen ruft resetRecorder', async () => {
    setState({ isPrepared: true, statusType: 'ready' })
    mountPanel()
    await wrapper.find('.btn-reset').trigger('click')
    await flushPromises()
    expect(store.resetRecorder).toHaveBeenCalledTimes(1)
    expect(visibleButtons()).toEqual(['btn-prepare'])
  })
})

describe('RecorderPanel – Einstellungen', () => {
  it('Qualität, Bildrate und Upload-Modus gehen an den Store', async () => {
    mountPanel()
    await flushPromises()
    const qualityBtns = wrapper.findAll('.quality-buttons')[0].findAll('.quality-btn')
    expect(qualityBtns).toHaveLength(8)
    expect(qualityBtns[2].classes()).toContain('active')
    await qualityBtns[4].trigger('click')
    expect(store.setRecordingQuality).toHaveBeenCalledWith(25_000_000)
    expect(qualityBtns[4].classes()).toContain('active')

    const fpsBtns = wrapper.find('.fps-buttons').findAll('.quality-btn')
    await fpsBtns[1].trigger('click')
    expect(store.setRecordingFrameRate).toHaveBeenCalledWith(60)

    await wrapper.findAll('.upload-btn')[1].trigger('click')
    expect(store.setUploadMode).toHaveBeenCalledTimes(1)

    await wrapper.find('.btn-prepare').trigger('click')
    await flushPromises()
    expect(store.prepareRecording).toHaveBeenCalledWith({ quality: 25_000_000, frameRate: 60 })
  })

  it('Server-Status aus der Health-Abfrage steuert die Konvertierungs-Optionen', async () => {
    api.checkServerHealth.mockResolvedValue({ available: true })
    mountPanel()
    await flushPromises()
    expect(wrapper.find('.server-status').classes()).toContain('available')
    const presets = wrapper.find('.conversion-quality').findAll('.quality-btn')
    expect(presets.map((b) => b.text())).toEqual(['Preview', 'Medium', 'Social', 'High', 'Highest'])
    expect(presets[2].classes()).toContain('active')
  })

  it('fehlgeschlagene Health-Abfrage gilt als „Server nicht erreichbar“', async () => {
    api.checkServerHealth.mockRejectedValue(new Error('offline'))
    mountPanel()
    await flushPromises()
    expect(wrapper.find('.server-status').classes()).toContain('unavailable')
    expect(wrapper.find('.conversion-quality').exists()).toBe(false)
  })
})

describe('RecorderPanel – Mikrofon während der Aufnahme', () => {
  it('schaltet das Mikrofon über die Audio-Engine zu', async () => {
    const engine = { toggleRecordingMicrophone: vi.fn(async () => true) }
    const unregister = registerAudioEngine(engine)
    setState({ isPrepared: true, isRecording: true, statusType: 'recording' })
    mountPanel()
    await flushPromises()
    expect(wrapper.find('.source-indicator').text()).not.toContain('Mic')
    const box = wrapper.find('.mic-toggle-row input')
    await box.setValue(true)
    await flushPromises()
    expect(engine.toggleRecordingMicrophone).toHaveBeenCalledWith(true)
    expect(wrapper.find('.source-indicator').text()).toContain('Mic')
    expect(wrapper.find('.source-hint.info').text()).toBe(de.recorder.micOnlyHint)
    unregister?.()
  })
})

describe('RecorderPanel – Stopp-Ablauf', () => {
  async function recordAndStop() {
    setState({ isPrepared: true, statusType: 'ready' })
    mountPanel()
    await flushPromises()
    await wrapper.find('.btn-start').trigger('click')
    await flushPromises()
    await wrapper.find('.btn-stop').trigger('click')
    await flushPromises()
  }

  it('ohne Server: WebM-Download und Vorschau, keine Konvertierung', async () => {
    await recordAndStop()
    expect(store.stopRecording).toHaveBeenCalledTimes(1)
    expect(visibleButtons()).toEqual(['btn-prepare'])
    expect(wrapper.find('.webm-section').exists()).toBe(true)
    expect(api.convertAndWait).not.toHaveBeenCalled()
    expect(api.convertGifAndWait).not.toHaveBeenCalled()
    const modal = document.getElementById('results-panel')
    expect(modal.style.display).toBe('flex')
    expect(document.getElementById('preview').getAttribute('src')).toMatch(/^blob:url-/)
    // Manuelle Konvertierung nur mit Server
    expect(wrapper.find('.btn-convert').exists()).toBe(false)
  })

  it('mit Server: startet die MP4-Konvertierung automatisch', async () => {
    api.checkServerHealth.mockResolvedValue({ available: true })
    await recordAndStop()
    expect(api.convertAndWait).toHaveBeenCalledTimes(1)
    expect(api.convertAndWait.mock.calls[0][1]).toMatchObject({ quality: 'social' })
    expect(wrapper.find('.conversion-progress').exists()).toBe(true)
  })

  it('mit Server, Auto-Konvertierung aus: Knopf „In MP4 umwandeln“ erscheint', async () => {
    api.checkServerHealth.mockResolvedValue({ available: true })
    setState({ isPrepared: true, statusType: 'ready' })
    mountPanel()
    await flushPromises()
    await wrapper.find('.toggle-row input').setValue(false)
    await wrapper.find('.btn-start').trigger('click')
    await flushPromises()
    await wrapper.find('.btn-stop').trigger('click')
    await flushPromises()
    expect(api.convertAndWait).not.toHaveBeenCalled()
    const convert = wrapper.findAll('.btn-convert')
    expect(convert.map((b) => b.text())).toContain(de.recorder.convertToMp4)
    await convert.find((b) => b.text() === de.recorder.convertToMp4).trigger('click')
    await flushPromises()
    expect(api.convertAndWait).toHaveBeenCalledTimes(1)
  })

  it('Schließen-Knopf der WebM-Sektion gibt die Blob-URL frei', async () => {
    await recordAndStop()
    await wrapper.find('.webm-section .btn-close-conversion').trigger('click')
    expect(wrapper.find('.webm-section').exists()).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('WebM-Download öffnet den Speichern-Dialog mit .webm', async () => {
    await recordAndStop()
    await wrapper.find('.webm-download-btn').trigger('click')
    await flushPromises()
    const dialog = wrapper.findComponent({ name: 'RecorderSaveDialog' })
    expect(dialog.props('open')).toBe(true)
    expect(dialog.props('extension')).toBe('webm')
    expect(dialog.props('filename')).toMatch(/\S/)
  })

  it('Escape schließt die Ergebnis-Vorschau und gibt deren URL frei', async () => {
    await recordAndStop()
    const video = document.getElementById('preview')
    video.pause = vi.fn()
    const previewUrl = video.getAttribute('src')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(document.getElementById('results-panel').style.display).toBe('none')
    expect(video.pause).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrl)
  })

  it('Unmount entfernt den Escape-Listener und gibt die Vorschau-URL frei', async () => {
    await recordAndStop()
    const previewUrl = document.getElementById('preview').getAttribute('src')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    wrapper.unmount()
    wrapper = null
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(previewUrl)
  })
})
