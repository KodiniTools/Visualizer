// @vitest-environment jsdom
// Eigene Presets im presetStore: speichern, aus localStorage laden, löschen.
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePresetStore } from '../../stores/presetStore'
import { useVisualizerStore } from '../../stores/visualizerStore'

const KEY = 'visualizer-user-presets'
let presets

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  presets = usePresetStore()
})

const stored = () => JSON.parse(localStorage.getItem(KEY))

describe('presetStore – eigene Presets', () => {
  it('speichert den aktuellen Zustand dauerhaft', () => {
    const viz = useVisualizerStore()
    viz.visualizerColor = '#123456'
    const preset = presets.saveCurrentAsPreset('Abend', null)
    expect(preset.id).toMatch(/^user-/)
    expect(preset).toMatchObject({ name: 'Abend', builtIn: false })
    expect(preset.visualizer.color).toBe('#123456')
    expect(presets.userPresets).toHaveLength(1)
    expect(stored()).toHaveLength(1)
    expect(stored()[0].name).toBe('Abend')
  })

  it('ohne Namen gibt es einen nummerierten Standardnamen', () => {
    presets.saveCurrentAsPreset('', null)
    expect(presets.userPresets[0].name).toBe('Preset 1')
  })

  it('lädt gespeicherte Presets und übersteht kaputte Daten', () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: 'user-9', name: 'Alt' }]))
    presets.loadUserPresets()
    expect(presets.userPresets.map((p) => p.id)).toEqual(['user-9'])

    localStorage.setItem(KEY, '{kaputt')
    presets.loadUserPresets()
    expect(presets.userPresets).toEqual([])
  })

  it('Löschen entfernt das Preset und setzt die Auswahl zurück', () => {
    const preset = presets.saveCurrentAsPreset('Weg', null)
    presets.activePresetId = preset.id
    presets.deleteUserPreset(preset.id)
    expect(presets.userPresets).toEqual([])
    expect(stored()).toEqual([])
    expect(presets.activePresetId).toBe(null)
  })

  it('Löschen eines anderen Presets lässt die Auswahl stehen', () => {
    const a = presets.saveCurrentAsPreset('A', null)
    presets.activePresetId = 'builtin-x'
    presets.deleteUserPreset(a.id)
    expect(presets.activePresetId).toBe('builtin-x')
  })
})
