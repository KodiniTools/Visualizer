import { ref, computed } from 'vue'
import {
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
} from '../lib/audio/audioReactiveConfig.js'

/**
 * Shared (singleton) state + logic for the per-image audio-reactive controls.
 *
 * The "active image" is the image currently selected on the canvas. It is the
 * single source of truth shared between the FotoPanel filter/layer controls
 * (left sidebar) and the audio-reactive panel (sticky player bar), and it is
 * driven externally through `window.fotoPanelControls.currentActiveImage`
 * (set by VisualizerApp when an image is selected on the canvas).
 *
 * State lives at module scope so every consumer works on the same refs.
 */

// One active image + audio-reactive state across all consumers.
const currentActiveImage = ref(null)
const activeAudioPreset = ref(null)

// Snapshot of the user's own (non-preset) audio-reactive config per image id.
// Taken right before the first preset is applied, so "Kein Preset" can restore
// the user's custom effects instead of leaving the preset (or nothing) behind.
const userEffectsBackups = new Map()

function loadSavedPresetFromStorage() {
  try {
    const savedPreset = localStorage.getItem('visualizer_audioReactivePreset')
    if (savedPreset) return JSON.parse(savedPreset)
  } catch (e) {
    console.warn('⚠️ Konnte Audio-Reaktiv Preset nicht laden:', e)
  }
  return null
}

// Loaded eagerly so `hasSavedAudioSettings` is correct even before the
// audio-reactive panel is opened (e.g. for the slideshow "apply" hint).
const savedAudioReactiveSettings = ref(loadSavedPresetFromStorage())

const hasSavedAudioSettings = computed(() => savedAudioReactiveSettings.value !== null)

/**
 * @param {import('vue').Ref} [fotoManagerRef] - injected fotoManager ref;
 *   required for the mutating handlers, optional for state-only consumers.
 */
export function useImageAudioReactive(fotoManagerRef) {
  function updateAudioReactiveSetting(property, value) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    currentActiveImage.value.fotoSettings.audioReactive[property] = value
  }

  function onAudioReactiveToggle(event) {
    const enabled = event.target.checked
    updateAudioReactiveSetting('enabled', enabled)
    if (!enabled) activeAudioPreset.value = null
  }
  function onAudioReactiveSourceChange(event) {
    updateAudioReactiveSetting('source', event.target.value)
  }
  function onAudioReactiveSmoothingChange(event) {
    updateAudioReactiveSetting('smoothing', parseInt(event.target.value))
  }
  function onAudioReactiveEasingChange(event) {
    updateAudioReactiveSetting('easing', event.target.value)
  }
  function onAudioReactiveBeatBoostChange(event) {
    updateAudioReactiveSetting('beatBoost', parseFloat(event.target.value))
  }
  function onAudioReactivePhaseChange(event) {
    updateAudioReactiveSetting('phase', parseInt(event.target.value))
  }
  function onAudioReactiveGainChange(event) {
    updateAudioReactiveSetting('gain', parseFloat(event.target.value))
  }

  function toggleAudioPreset(presetName) {
    if (activeAudioPreset.value === presetName) {
      deactivateAudioPreset()
    } else {
      applyAudioPreset(presetName)
    }
  }

  function deactivateAudioPreset() {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = currentActiveImage.value.fotoSettings.audioReactive
    for (const effectName of Object.keys(ar.effects)) {
      ar.effects[effectName].enabled = false
    }
    ar.enabled = false
    activeAudioPreset.value = null
  }

  // Gemeinsame Implementierung (Bilder + Hintergrund) in audioReactiveConfig.js
  const assignArConfig = assignAudioReactiveConfig

  function applyAudioPreset(presetName) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = currentActiveImage.value.fotoSettings.audioReactive

    // Vor dem ersten Preset die eigenen (benutzerdefinierten) Effekte sichern,
    // damit "Kein Preset" sie später exakt wiederherstellen kann. Nur sichern,
    // wenn gerade KEIN Preset aktiv ist (sonst würde ein Preset-Zustand als
    // "eigene" Effekte gesichert werden).
    if (activeAudioPreset.value === null) {
      userEffectsBackups.set(currentActiveImage.value.id, JSON.parse(JSON.stringify(ar)))
    }

    if (!applyAudioReactivePreset(ar, presetName)) return

    activeAudioPreset.value = presetName
  }

  // "Kein Preset": Preset-Auswahl aufheben und die zuvor gesicherten
  // benutzerdefinierten Audio-Reaktiv-Effekte wieder übernehmen.
  function clearAudioPreset() {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = currentActiveImage.value.fotoSettings.audioReactive
    const backup = userEffectsBackups.get(currentActiveImage.value.id)
    if (backup) {
      assignArConfig(ar, backup)
    }
    activeAudioPreset.value = null
  }

  function onEffectToggle(effectName, enabled) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = currentActiveImage.value.fotoSettings.audioReactive
    if (ar.effects && ar.effects[effectName]) {
      ar.effects[effectName].enabled = enabled
    }
  }

  function onEffectIntensityChange(effectName, value) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = currentActiveImage.value.fotoSettings.audioReactive
    if (ar.effects && ar.effects[effectName]) {
      ar.effects[effectName].intensity = parseInt(value)
    }
  }

  function onEffectSourceChange(effectName, value) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = currentActiveImage.value.fotoSettings.audioReactive
    if (ar.effects && ar.effects[effectName]) {
      ar.effects[effectName].source = value === '' ? null : value
    }
  }

  function saveAudioReactiveSettings() {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = currentActiveImage.value.fotoSettings.audioReactive
    savedAudioReactiveSettings.value = JSON.parse(JSON.stringify(ar))
    try {
      localStorage.setItem('visualizer_audioReactivePreset', JSON.stringify(ar))
      console.log('💾 Audio-Reaktiv Einstellungen gespeichert')
    } catch (e) {
      console.warn('⚠️ Konnte nicht in localStorage speichern:', e)
    }
  }

  function applyAudioReactiveSettings() {
    if (!currentActiveImage.value || !savedAudioReactiveSettings.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    currentActiveImage.value.fotoSettings.audioReactive = JSON.parse(
      JSON.stringify(savedAudioReactiveSettings.value),
    )
    console.log('📋 Audio-Reaktiv Einstellungen angewendet')
  }

  return {
    currentActiveImage,
    activeAudioPreset,
    savedAudioReactiveSettings,
    hasSavedAudioSettings,
    onAudioReactiveToggle,
    onAudioReactiveSourceChange,
    onAudioReactiveSmoothingChange,
    onAudioReactiveEasingChange,
    onAudioReactiveBeatBoostChange,
    onAudioReactivePhaseChange,
    onAudioReactiveGainChange,
    toggleAudioPreset,
    clearAudioPreset,
    onEffectToggle,
    onEffectIntensityChange,
    onEffectSourceChange,
    saveAudioReactiveSettings,
    applyAudioReactiveSettings,
  }
}
