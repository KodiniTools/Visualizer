/**
 * Formular „Neuer Text“ speichert automatisch (ohne Knopf), ohne eine per
 * „Als Standard speichern“ gesetzte Vorlage zu überschreiben; die Position
 * bleibt beim Knopf. Dazu: Text-Liste – einheitliche Dauer bleibt gespeichert.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useNewTextSettings } from '../../composables/useNewTextSettings.js'
import {
  loadTextDefaults,
  saveTextDefaults,
  clearTextDefaults,
  SETTINGS_KEY,
} from '../../lib/textDefaults.js'
import {
  loadTextSequenceSettings,
  saveTextSequenceSettings,
  TEXT_SEQUENCE_KEY,
} from '../../lib/textSequenceSettings.js'

let wrapper
let form
function mountForm() {
  const Host = defineComponent({
    setup() {
      form = useNewTextSettings(ref(null))
      return {}
    },
    template: '<div />',
  })
  wrapper = mount(Host)
  return form
}
async function settle() {
  await nextTick()
  vi.advanceTimersByTime(500)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  localStorage.clear()
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Neuer Text – automatisch speichern', () => {
  it('ohne Änderung wird nichts gespeichert', async () => {
    mountForm()
    await settle()
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull()
  })

  it('Stil, Schatten, Kontur und Animationen werden ohne Knopf gespeichert', async () => {
    const f = mountForm()
    f.newTextStyle.value.fontFamily = 'Satoshi'
    f.newTextStyle.value.color = '#00aaff'
    f.newTextShadow.value.blur = 12
    f.newTextStroke.value.enabled = true
    f.newTextFade.value.enabled = true
    await settle()
    const saved = loadTextDefaults()
    expect(saved.style.fontFamily).toBe('Satoshi')
    expect(saved.style.color).toBe('#00aaff')
    expect(saved.shadow.blur).toBe(12)
    expect(saved.stroke.enabled).toBe(true)
    expect(saved.fade.enabled).toBe(true)
  })

  it('nach Neustart lädt das Formular die gemerkten Werte', async () => {
    let f = mountForm()
    f.newTextStyle.value.fontSize = 88
    await settle()
    wrapper.unmount()
    f = mountForm()
    expect(f.loadSavedSettings()).toBe(true)
    expect(f.newTextStyle.value.fontSize).toBe(88)
  })

  it('Laden selbst löst kein Speichern aus', async () => {
    saveTextDefaults({ style: { fontSize: 70 } })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const f = mountForm()
    f.loadSavedSettings()
    await settle()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('gespeicherte Position (vom markierten Text) wird nicht überschrieben', async () => {
    saveTextDefaults({ style: { fontSize: 40 }, position: { x: 0.2, y: 0.8 } })
    const f = mountForm()
    f.loadSavedSettings()
    f.resetNewTextPosition() // Formular öffnet mit Position Mitte
    f.newTextStyle.value.color = '#123456'
    await settle()
    expect(loadTextDefaults().position).toEqual({ x: 0.2, y: 0.8 })
    expect(loadTextDefaults().style.color).toBe('#123456')
  })

  it('„Als Standard speichern“ beim markierten Text: Formular übernimmt statt zu überschreiben', async () => {
    const f = mountForm()
    f.newTextStyle.value.color = '#111111' // Formular-Änderung (noch nicht gespeichert)
    saveTextDefaults({ style: { color: '#ff0000', fontSize: 64 }, position: { x: 0.3, y: 0.3 } })
    await settle()
    expect(f.newTextStyle.value.color).toBe('#ff0000')
    expect(loadTextDefaults().style.color).toBe('#ff0000')
    expect(loadTextDefaults().style.fontSize).toBe(64)
  })

  it('„Zurücksetzen“ beim markierten Text: Formular auf Werkseinstellung, nichts neu gespeichert', async () => {
    const f = mountForm()
    f.newTextStyle.value.color = '#abcdef'
    await settle()
    clearTextDefaults()
    await settle()
    expect(f.newTextStyle.value.color).toBe('#ff0000') // Werkseinstellung
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull()
  })

  it('„Zurücksetzen“ im Formular: Werkseinstellung bleibt, nichts neu gespeichert', async () => {
    const f = mountForm()
    f.newTextStyle.value.color = '#abcdef'
    await settle()
    f.clearSavedSettings()
    await settle()
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull()
  })

  it('ausstehende Änderung wird beim Schließen noch gespeichert', async () => {
    const f = mountForm()
    f.newTextStyle.value.color = '#0f0f0f'
    await nextTick()
    wrapper.unmount()
    wrapper = null
    expect(loadTextDefaults().style.color).toBe('#0f0f0f')
  })
})

describe('Text-Liste – einheitliche Dauer', () => {
  it('Standard, Speichern/Laden und Begrenzung', () => {
    expect(loadTextSequenceSettings()).toEqual({ enabled: false, duration: 5000 })
    saveTextSequenceSettings({ enabled: true, duration: 8000 })
    expect(loadTextSequenceSettings()).toEqual({ enabled: true, duration: 8000 })
    saveTextSequenceSettings({ enabled: true, duration: 999999 })
    expect(loadTextSequenceSettings().duration).toBe(30000)
    localStorage.setItem(TEXT_SEQUENCE_KEY, '{kaputt')
    expect(loadTextSequenceSettings()).toEqual({ enabled: false, duration: 5000 })
  })
})
