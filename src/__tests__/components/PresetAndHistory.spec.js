// @vitest-environment jsdom
// Charakterisierung von Filter-Preset und Rückgängig/Wiederholen/Zurücksetzen
// (Foto-Panel, Bildbearbeitung). Läuft mit dem echten useImageFilterControls,
// Zugriff über Beschriftungen statt CSS-Klassen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, provide, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PresetAndHistory from '../../components/foto-panel/image-filters/PresetAndHistory.vue'
import { useImageFilterControls } from '../../composables/useImageFilterControls.js'
import { useHistoryStore } from '../../stores/historyStore'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const F = de.foto
const PRESETS = [
  { id: 'warm', name: 'Warm', name_de: 'Warm DE', name_en: 'Warm EN' },
  { id: 'bw', name: 'Schwarzweiß' },
]
let wrapper
let controls
let emit

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

function mountSection() {
  emit = vi.fn()
  const { locale } = useI18n()
  const Host = defineComponent({
    setup() {
      controls = useImageFilterControls({ currentActiveImage: null }, emit)
      provide('imageFilterControls', {
        ...controls,
        presets: ref(PRESETS),
        locale: computed(() => locale.value),
      })
      return () => h(PresetAndHistory)
    },
  })
  wrapper = mount(Host, { attachTo: document.body })
  return wrapper
}

const root = () => wrapper.element
const select = () => root().querySelector('select')
/** Knopf über seinen sichtbaren Text. */
const button = (name) =>
  [...root().querySelectorAll('button')].find((b) => b.textContent.trim() === name)

describe('Filter-Preset', () => {
  it('„Kein Filter“ plus Presets mit Namen der Sprache', () => {
    mountSection()
    const opts = [...select().querySelectorAll('option')]
    expect(opts.map((o) => o.value)).toEqual(['', 'warm', 'bw'])
    expect(opts.map((o) => o.textContent.trim())).toEqual([F.noFilter, 'Warm DE', 'Schwarzweiß'])
  })

  it('englische Namen bei EN', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountSection()
      const opts = [...select().querySelectorAll('option')].map((o) => o.textContent.trim())
      expect(opts).toEqual([en.foto.noFilter, 'Warm EN', 'Schwarzweiß'])
    } finally {
      await setLocale('de')
    }
  })

  it('Auswahl meldet preset-change mit der ID', async () => {
    mountSection()
    select().value = 'bw'
    select().dispatchEvent(new Event('change'))
    await nextTick()
    expect(emit).toHaveBeenCalledWith('preset-change', 'bw')
  })

  it('Laden der Bild-Einstellungen setzt das Preset, Zurücksetzen leert es', async () => {
    mountSection()
    controls.loadImageSettings({ preset: 'warm' })
    await nextTick()
    expect(select().value).toBe('warm')
    button(F.resetFilters).click()
    await nextTick()
    expect(select().value).toBe('')
    expect(emit).toHaveBeenCalledWith('reset-filters')
  })

  it('Preset hat einen zugänglichen Namen', () => {
    mountSection()
    const s = select()
    const name =
      s.getAttribute('aria-label') ?? document.querySelector(`label[for="${s.id}"]`)?.textContent
    expect(name.trim()).toBe(F.filterPreset)
  })
})

describe('Verlauf', () => {
  it('Rückgängig/Wiederholen folgen dem Verlauf und rufen ihn auf', async () => {
    mountSection()
    const history = useHistoryStore()
    expect(button(F.undo).disabled).toBe(true)
    expect(button(F.redo).disabled).toBe(true)
    const undo = vi.spyOn(history, 'undo').mockImplementation(() => true)
    const redo = vi.spyOn(history, 'redo').mockImplementation(() => true)
    vi.spyOn(history, 'canUndo', 'get').mockReturnValue(true)
    vi.spyOn(history, 'canRedo', 'get').mockReturnValue(true)
    wrapper.unmount()
    mountSection()
    expect(button(F.undo).disabled).toBe(false)
    button(F.undo).click()
    button(F.redo).click()
    expect(undo).toHaveBeenCalledTimes(1)
    expect(redo).toHaveBeenCalledTimes(1)
  })
})

describe('Preset & Verlauf – Ui-Bausteine', () => {
  it('Preset als Ui-Select', () => {
    mountSection()
    expect(select().closest('.ui-select')).toBeTruthy()
  })

  it('Knöpfe sind Ui-Buttons mit Symbol', () => {
    mountSection()
    for (const n of [F.undo, F.redo, F.resetFilters]) {
      const b = button(n)
      expect(b.classList.contains('ui-button'), n).toBe(true)
      expect(b.querySelector('.ui-button__icon svg'), n).toBeTruthy()
    }
  })

  it('Composable hält die Preset-Auswahl als Zustand statt DOM-Ref', () => {
    mountSection()
    expect(controls.presetSelectRef).toBeUndefined()
    controls.loadImageSettings({ preset: 'bw' })
    expect(controls.selectedPreset.value).toBe('bw')
  })
})
