// @vitest-environment jsdom
// Charakterisierung der Recorder-Einstellungen (Qualität, Bildrate, Upload,
// MP4/GIF/HQ). Zugriff über Beschriftungen und Rollen statt CSS-Klassen,
// damit die Tests den Wechsel auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, nextTick, ref } from 'vue'
import RecorderSettingsPanel from '../../components/recorder/RecorderSettingsPanel.vue'
import {
  RECORDER_QUALITY_PRESETS,
  RECORDER_FRAME_RATE_PRESETS,
} from '../../composables/recorder/useRecorderSettings'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const R = de.recorder
let wrapper

function makeSettings({ server = true } = {}) {
  const s = {
    selectedQuality: ref(8_000_000),
    qualityPresets: RECORDER_QUALITY_PRESETS,
    recordingFps: ref(30),
    frameRatePresets: RECORDER_FRAME_RATE_PRESETS,
    uploadMode: ref('auto'),
    serverAvailable: ref(server),
    enableServerConversion: ref(true),
    conversionQuality: ref('social'),
    conversionPresets: computed(() => [
      { value: 'preview', label: 'Preview', desc: 'd-preview' },
      { value: 'medium', label: 'Medium', desc: 'd-medium' },
      { value: 'social', label: 'Social', desc: 'd-social' },
      { value: 'high', label: 'High', desc: 'd-high' },
      { value: 'highest', label: 'Highest', desc: 'd-highest' },
    ]),
    enableGifExport: ref(false),
    gifFps: ref(15),
    gifWidth: ref(480),
    enableHqExport: ref(false),
    hqFps: ref(30),
  }
  s.selectQuality = vi.fn((v) => (s.selectedQuality.value = v))
  s.selectFrameRate = vi.fn((v) => (s.recordingFps.value = v))
  s.selectUploadMode = vi.fn((v) => (s.uploadMode.value = v))
  return s
}

function mountPanel(opts) {
  const s = makeSettings(opts)
  wrapper = mount(
    { components: { RecorderSettingsPanel }, template: '<div><RecorderSettingsPanel /></div>' },
    { attachTo: document.body, global: { provide: { recorderSettings: s } } },
  )
  return s
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const root = () => wrapper.element
const text = () => root().textContent.replace(/\s+/g, ' ')

/**
 * Knöpfe einer Auswahlgruppe: neue Radiogroup mit aria-label oder alte
 * Abschnitt-/Zeilen-Beschriftung mit den Knöpfen dahinter.
 */
function group(name) {
  const rg = [...root().querySelectorAll('[role="radiogroup"]')].find(
    (g) => g.getAttribute('aria-label') === name,
  )
  if (rg) return [...rg.querySelectorAll('button')]
  const label = [...root().querySelectorAll('span')].find(
    (s) => s.textContent.trim().replace(/:$/, '') === name,
  )
  const box = label?.closest('.gif-option-row') ?? label?.closest('.control-section')
  return box ? [...box.querySelectorAll('button')] : []
}
const labels = (btns) => btns.map((b) => b.textContent.trim())
const isActive = (b) => b.getAttribute('aria-checked') === 'true' || b.classList.contains('active')
const activeLabel = (name) => labels(group(name).filter(isActive))

/** Schalter über seinen Text (Checkbox im Label oder Switch). */
function toggle(name) {
  const cb = [...root().querySelectorAll('input[type="checkbox"]')].find(
    (i) => i.closest('label')?.textContent.trim() === name,
  )
  if (cb) return cb
  const label = [...root().querySelectorAll('label')].find((l) => l.textContent.trim() === name)
  return label ? document.getElementById(label.htmlFor) : undefined
}
const isOn = (el) =>
  el.type === 'checkbox' ? el.checked : el.getAttribute('aria-checked') === 'true'

describe('Recorder-Einstellungen – Qualität, Bildrate, Upload', () => {
  it('acht Qualitätsstufen, „High“ gewählt; Klick meldet die Bitrate', async () => {
    const s = mountPanel()
    const btns = group(R.videoQuality)
    expect(labels(btns)).toEqual(RECORDER_QUALITY_PRESETS.map((p) => p.label))
    expect(activeLabel(R.videoQuality)).toEqual(['High'])
    btns[4].click()
    await nextTick()
    expect(s.selectQuality).toHaveBeenCalledWith(25_000_000)
    expect(activeLabel(R.videoQuality)).toEqual(['Ultra'])
  })

  it('Bildrate 30/60 mit passendem Hinweis', async () => {
    const s = mountPanel()
    expect(text()).toContain(R.recordingFps30Info)
    group(R.recordingFps)[1].click()
    await nextTick()
    expect(s.selectFrameRate).toHaveBeenCalledWith(60)
    expect(text()).toContain(R.recordingFps60Info)
  })

  it('drei Upload-Modi, Klick meldet den Modus', async () => {
    const s = mountPanel()
    const btns = group(R.uploadMode)
    expect(btns).toHaveLength(3)
    btns[2].click()
    await nextTick()
    expect(s.selectUploadMode).toHaveBeenCalledWith('direct')
  })
})

describe('Recorder-Einstellungen – Server-Exporte', () => {
  it('Server da: MP4-Auto an, fünf Konvertierungsstufen, „Social“ gewählt', async () => {
    const s = mountPanel()
    expect(isOn(toggle(R.autoConvert))).toBe(true)
    const conv = [...root().querySelectorAll('button')].filter((b) =>
      ['Preview', 'Medium', 'Social', 'High', 'Highest'].includes(b.textContent.trim()),
    )
    // „High“ gibt es auch in der Video-Qualität
    expect(conv.map((b) => b.textContent.trim())).toContain('Highest')
    const highest = conv.find((b) => b.textContent.trim() === 'Highest')
    highest.click()
    await nextTick()
    expect(s.conversionQuality.value).toBe('highest')
  })

  it('Auto-Konvertierung aus blendet die Stufen aus', async () => {
    const s = mountPanel()
    toggle(R.autoConvert).click()
    await nextTick()
    expect(s.enableServerConversion.value).toBe(false)
    expect(text()).not.toContain('Highest')
  })

  it('GIF: Schalter zeigt FPS und Breite, Auswahl schreibt die Werte', async () => {
    const s = mountPanel()
    expect(text()).not.toContain('320')
    toggle(R.gifAutoCreate).click()
    await nextTick()
    expect(s.enableGifExport.value).toBe(true)
    const fps = group(R.gifFps)
    expect(labels(fps)).toEqual(['10', '15', '20'])
    fps[2].click()
    group(R.gifWidth)[0].click()
    await nextTick()
    expect(s.gifFps.value).toBe(20)
    expect(s.gifWidth.value).toBe(320)
  })

  it('HQ: Schalter zeigt FPS 24/30/60 und Hinweis', async () => {
    const s = mountPanel()
    toggle(R.hqAutoCreate).click()
    await nextTick()
    expect(s.enableHqExport.value).toBe(true)
    expect(text()).toContain(R.hqInfo)
    const fps = [...root().querySelectorAll('button')].filter((b) =>
      ['24', '60'].includes(b.textContent.trim()),
    )
    expect(fps.length).toBeGreaterThanOrEqual(2)
    fps.find((b) => b.textContent.trim() === '24').click()
    await nextTick()
    expect(s.hqFps.value).toBe(24)
  })

  it('ohne Server: Schalter gesperrt, keine Stufen, Status „nicht erreichbar“', () => {
    mountPanel({ server: false })
    for (const n of [R.autoConvert, R.gifAutoCreate, R.hqAutoCreate]) {
      expect(toggle(n).disabled, n).toBe(true)
    }
    expect(text()).not.toContain('Highest')
    const status = [...root().querySelectorAll('[title]')].filter(
      (el) => el.getAttribute('title') === R.serverUnavailable,
    )
    expect(status).toHaveLength(3)
  })
})

describe('Recorder-Einstellungen – Sprache', () => {
  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountPanel()
      expect(text()).toContain(en.recorder.videoQuality)
      expect(text()).toContain(en.recorder.autoConvert)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Recorder-Einstellungen – Ui-Bausteine', () => {
  it('Auswahlgruppen sind Radiogroups mit Namen', () => {
    mountPanel()
    const names = [...root().querySelectorAll('[role="radiogroup"]')].map((g) =>
      g.getAttribute('aria-label'),
    )
    expect(names).toEqual([R.videoQuality, R.recordingFps, R.uploadMode, R.mp4Conversion])
  })

  it('Schalter sind Switches, keine Checkboxen', () => {
    mountPanel()
    expect(toggle(R.autoConvert).getAttribute('role')).toBe('switch')
    expect(root().querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('Upload-Modi übersetzt', async () => {
    mountPanel()
    expect(labels(group(R.uploadMode))).toEqual([
      R.uploadModes.auto,
      R.uploadModes.server,
      R.uploadModes.direct,
    ])
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      await nextTick()
      expect(labels(group(en.recorder.uploadMode))).toEqual([
        en.recorder.uploadModes.auto,
        en.recorder.uploadModes.server,
        en.recorder.uploadModes.direct,
      ])
    } finally {
      await setLocale('de')
    }
  })

  it('gewählte MP4-Stufe zeigt ihre Beschreibung als Text', async () => {
    const s = mountPanel()
    expect(text()).toContain('d-social')
    s.conversionQuality.value = 'high'
    await nextTick()
    expect(text()).toContain('d-high')
  })

  it('Server-Status als Punkt mit Namen statt Glyphe', () => {
    mountPanel()
    expect(text()).not.toMatch(/[●○]/u)
    const status = [...root().querySelectorAll('[aria-label]')].filter(
      (el) => el.getAttribute('aria-label') === R.serverAvailable,
    )
    expect(status).toHaveLength(3)
  })
})
