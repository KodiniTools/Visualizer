// @vitest-environment jsdom
// Charakterisierung der Recorder-Steuerknöpfe (Vorbereiten, Start, Pause,
// Fortsetzen, Stop, Zurücksetzen). Zugriff über Beschriftungen statt
// CSS-Klassen, damit die Tests den Wechsel auf UiButton unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RecorderTransportControls from '../../components/recorder/RecorderTransportControls.vue'
import { useRecorderStore } from '../../stores/recorderStore.js'
import { useI18n } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const R = de.recorder
let wrapper
let store

beforeEach(() => {
  setActivePinia(createPinia())
  store = useRecorderStore()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

function mountControls(state = {}, props = {}) {
  Object.assign(store, state)
  wrapper = mount(RecorderTransportControls, { attachTo: document.body, props })
  return wrapper
}

const buttons = () => [...wrapper.element.querySelectorAll('button')]
const labels = () => buttons().map((b) => b.textContent.trim())
const button = (name) => buttons().find((b) => b.textContent.trim() === name)

describe('Recorder-Steuerung – sichtbare Knöpfe je Zustand', () => {
  it('bereit: nur „Vorbereiten“', () => {
    mountControls()
    expect(labels()).toEqual([R.prepare])
  })

  it('vorbereitet: „Start“ und „Zurücksetzen“', () => {
    mountControls({ isPrepared: true })
    expect(labels()).toEqual([R.start, R.reset])
  })

  it('läuft: „Pause“ und „Stop“', () => {
    mountControls({ isPrepared: true, isRecording: true })
    expect(labels()).toEqual([R.pause, R.stop])
  })

  it('pausiert: „Fortsetzen“ und „Stop“', () => {
    mountControls({ isPrepared: true, isRecording: true, isPaused: true })
    expect(labels()).toEqual([R.resume, R.stop])
  })
})

describe('Recorder-Steuerung – Aktionen', () => {
  it('jeder Knopf meldet seine Aktion', async () => {
    mountControls()
    button(R.prepare).click()
    store.isPrepared = true
    await wrapper.vm.$nextTick()
    button(R.start).click()
    button(R.reset).click()
    store.isRecording = true
    await wrapper.vm.$nextTick()
    button(R.pause).click()
    button(R.stop).click()
    store.isPaused = true
    await wrapper.vm.$nextTick()
    button(R.resume).click()
    for (const e of ['prepare', 'start', 'reset', 'pause', 'stop', 'resume']) {
      expect(wrapper.emitted(e), e).toHaveLength(1)
    }
  })

  it('gesperrt: alle Knöpfe deaktiviert, kein Ereignis', () => {
    mountControls({ isPrepared: true }, { disabled: true })
    expect(buttons().every((b) => b.disabled)).toBe(true)
    button(R.start).click()
    expect(wrapper.emitted('start')).toBeUndefined()
  })

  it('Knöpfe tragen ein Symbol, Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountControls({ isPrepared: true })
      expect(labels()).toEqual([en.recorder.start, en.recorder.reset])
      expect(buttons().every((b) => b.querySelector('svg'))).toBe(true)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Recorder-Steuerung – Ui-Bausteine', () => {
  it('Ui-Buttons mit Symbol-Slot, Stop als danger, Start primär', () => {
    mountControls({ isPrepared: true })
    expect(button(R.start).classList.contains('ui-button--primary')).toBe(true)
    expect(button(R.start).querySelector('.ui-button__icon svg')).toBeTruthy()
    expect(button(R.reset).classList.contains('ui-button')).toBe(true)
    wrapper.unmount()
    mountControls({ isPrepared: true, isRecording: true })
    expect(button(R.stop).classList.contains('ui-button--danger')).toBe(true)
    expect(button(R.pause).classList.contains('ui-button')).toBe(true)
  })
})
