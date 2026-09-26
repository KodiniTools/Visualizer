import { ref } from 'vue'

const PRESETS_STORAGE_KEY = 'visualizer-canvas-presets'

/**
 * Canvas-Presets: Liste + Persistenz in localStorage. Was ein Preset enthält
 * und wie es angewendet wird, liefert der Aufrufer.
 * @param {object} deps
 * @param {() => object} deps.createPreset - erfasst den aktuellen Zustand (ohne id/name)
 * @param {(preset: object) => void} deps.applyPreset - wendet ein Preset an (darf werfen)
 * @param {{ success?: Function, error?: Function }} deps.toastStore
 * @param {(key: string) => string} deps.t
 */
export function useBgPresets({ createPreset, applyPreset, toastStore, t }) {
  const savedPresets = ref([])

  function loadPresets() {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
      if (stored) {
        savedPresets.value = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('Fehler beim Laden der Presets:', e)
    }
  }

  function persistPresets() {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(savedPresets.value))
      return true
    } catch (e) {
      // Häufigste Ursache: localStorage-Kontingent überschritten (große Bild-
      // Daten-URLs). Der Aufrufer kann darauf reagieren (z.B. Rollback).
      console.warn('Fehler beim Speichern der Presets:', e)
      return false
    }
  }

  function saveCurrentAsPreset() {
    const presetNumber = savedPresets.value.length + 1
    const newPreset = {
      id: Date.now(),
      name: `Preset ${presetNumber}`,
      ...createPreset(),
    }

    savedPresets.value.push(newPreset)
    if (persistPresets()) {
      console.log('✅ Canvas-Preset gespeichert:', newPreset)
      toastStore.success?.(t('canvasControl.presetSaved'))
    } else {
      // Speicher-Kontingent überschritten: Preset nicht dauerhaft speicherbar.
      savedPresets.value.pop()
      toastStore.error?.(t('canvasControl.presetSaveFailed'))
    }
  }

  function loadPreset(preset) {
    console.log('📥 Lade Canvas-Preset:', preset)
    try {
      applyPreset(preset)
      console.log('✅ Canvas-Preset erfolgreich geladen:', preset.name)
    } catch (error) {
      console.error('❌ Fehler beim Laden des Canvas-Presets:', error)
    }
  }

  function deletePreset(presetId) {
    savedPresets.value = savedPresets.value.filter((p) => p.id !== presetId)
    persistPresets()
    console.log('🗑️ Preset gelöscht')
  }

  return { savedPresets, loadPresets, saveCurrentAsPreset, loadPreset, deletePreset }
}
