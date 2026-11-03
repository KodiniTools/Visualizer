// @vitest-environment jsdom
// Preset-Panel: eingebaute Vorlagen anwenden, eigenes Preset speichern und
// löschen, Rückmeldung per Toast.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PresetPanel from '../../components/PresetPanel.vue'
import { BUILT_IN_PRESETS } from '../../data/builtInPresets.js'
import { usePresetStore } from '../../stores/presetStore.js'
import { useToastStore } from '../../stores/toastStore.js'
import de from '../../lib/i18n/de.js'

const P = de.presets
let wrapper
let presets
let toasts

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  presets = usePresetStore()
  toasts = useToastStore()
  vi.spyOn(presets, 'applyPreset').mockImplementation(() => {})
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

async function mountPanel(props = { embedded: true }) {
  wrapper = mount(PresetPanel, {
    props,
    global: { provide: { canvasManager: { value: null } } },
  })
  await nextTick()
  return wrapper
}

const cards = () => wrapper.findAll('.presets-grid').at(0).findAll('button')
const nameInput = () => wrapper.find(`input[placeholder="${P.namePlaceholder}"]`)
const saveButton = () => wrapper.findAll('button').find((b) => b.text().includes(P.save))

describe('PresetPanel – Vorlagen', () => {
  it('zeigt alle eingebauten Vorlagen mit Untertitel', async () => {
    await mountPanel()
    expect(cards()).toHaveLength(BUILT_IN_PRESETS.length)
    const multi = BUILT_IN_PRESETS.findIndex((p) => p.visualizer.mode === 'multi')
    const count = BUILT_IN_PRESETS[multi].visualizer.layers.length
    expect(cards()[multi].text()).toContain(`${count} ${P.layers}`)
    const needsImage = BUILT_IN_PRESETS.findIndex((p) => p.needsImage)
    if (needsImage >= 0) {
      expect(cards()[needsImage].attributes('title')).toContain(P.needsImageHint)
    }
  })

  it('Klick wendet die Vorlage an, markiert sie und meldet den Namen', async () => {
    const success = vi.spyOn(toasts, 'success')
    await mountPanel()
    const preset = BUILT_IN_PRESETS[1]
    await cards()[1].trigger('click')
    expect(presets.applyPreset).toHaveBeenCalledWith(preset, { value: null })
    expect(cards()[1].classes()).toContain('active')
    expect(success).toHaveBeenCalledWith(P.applied.replace('{name}', preset.name))
  })
})

describe('PresetPanel – eigene Presets', () => {
  it('Speichern nur mit Namen, Name wird getrimmt und geleert', async () => {
    const save = vi.spyOn(presets, 'saveCurrentAsPreset').mockImplementation(() => {})
    const success = vi.spyOn(toasts, 'success')
    await mountPanel()
    expect(saveButton().attributes('disabled')).toBeDefined()
    await nameInput().setValue('  Mein Look  ')
    expect(saveButton().attributes('disabled')).toBeUndefined()
    await nameInput().trigger('keydown', { key: 'Enter' })
    expect(save).toHaveBeenCalledWith('Mein Look', { value: null })
    expect(nameInput().element.value).toBe('')
    expect(success).toHaveBeenCalledWith(P.saved)
  })

  it('lädt gespeicherte Presets, wendet sie an und löscht sie', async () => {
    const stored = {
      id: 'user-1',
      name: 'Gespeichert',
      builtIn: false,
      emoji: '⭐',
      visualizer: { mode: 'single', selectedVisualizer: 'bars', color: '#ffffff' },
      background: { color: '#000000' },
    }
    localStorage.setItem('visualizer-user-presets', JSON.stringify([stored]))
    await mountPanel()
    expect(wrapper.text()).toContain(P.myPresets)
    const card = wrapper.find('.user-preset')
    expect(card.text()).toContain('Gespeichert')
    await card.find('.preset-apply-area').trigger('click')
    expect(presets.applyPreset).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }), {
      value: null,
    })
    await card.find(`button[title="${de.common.delete}"]`).trigger('click')
    expect(presets.userPresets).toHaveLength(0)
    expect(wrapper.text()).not.toContain(P.myPresets)
    expect(JSON.parse(localStorage.getItem('visualizer-user-presets'))).toEqual([])
  })

  it('ohne embedded mit eigenem Kopf zum Einklappen', async () => {
    await mountPanel({ embedded: false })
    expect(wrapper.find('.panel-header').text()).toContain(P.title)
    await wrapper.find('.panel-header').trigger('click')
    expect(wrapper.find('.panel-body').isVisible()).toBe(false)
  })
})
