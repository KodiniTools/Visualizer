import { ref, computed, type Ref } from 'vue'
import {
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
  type AudioReactiveConfig,
} from '../lib/audio/audioReactiveConfig'
import type { FotoImageObject, FotoManager, FotoSettings } from '../lib/fotoManager'

/**
 * Shared (singleton) state + logic for the per-image audio-reactive controls.
 *
 * The "active image" is the image currently selected on the canvas. It is the
 * single source of truth shared between the FotoPanel filter/layer controls
 * (left sidebar) and the audio-reactive panel (sticky player bar), and it is
 * driven externally through the foto panel bridge (lib/fotoPanelBridge.js),
 * set by the canvas selection when an image is selected on the canvas.
 *
 * State lives at module scope so every consumer works on the same refs.
 */

// One active image + audio-reactive state across all consumers.
const currentActiveImage = ref<FotoImageObject | null>(null)
const activeAudioPreset = ref<string | null>(null)

// Snapshot of the user's own (non-preset) audio-reactive config per image id.
// Taken right before the first preset is applied, so "Kein Preset" can restore
// the user's custom effects instead of leaving the preset (or nothing) behind.
const userEffectsBackups = new Map<unknown, AudioReactiveConfig>()

function loadSavedPresetFromStorage(): AudioReactiveConfig | null {
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

/** Foto-Einstellungen nach fotoManager.initializeImageSettings() (dann immer gesetzt) */
const settingsOf = (img: FotoImageObject) => img.fotoSettings as FotoSettings

/**
 * @param fotoManagerRef - injected fotoManager ref;
 *   required for the mutating handlers, optional for state-only consumers.
 */
/**
 * Natives Input-Event oder Pseudo-Event aus AudioReactivePanel
 * (`{ target: { checked } }` bzw. `{ target: { value } }`).
 */
type InputLikeEvent = { target: unknown }

export function useImageAudioReactive(fotoManagerRef?: Ref<FotoManager | null | undefined>) {
  function updateAudioReactiveSetting(property: string, value: unknown) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    ;(settingsOf(currentActiveImage.value).audioReactive as unknown as Record<string, unknown>)[
      property
    ] = value
  }

  function onAudioReactiveToggle(event: InputLikeEvent) {
    const enabled = (event.target as HTMLInputElement).checked
    updateAudioReactiveSetting('enabled', enabled)
    if (!enabled) activeAudioPreset.value = null
  }
  function onAudioReactiveSourceChange(event: InputLikeEvent) {
    updateAudioReactiveSetting('source', (event.target as HTMLInputElement).value)
  }
  function onAudioReactiveSmoothingChange(event: InputLikeEvent) {
    updateAudioReactiveSetting('smoothing', parseInt((event.target as HTMLInputElement).value))
  }
  function onAudioReactiveEasingChange(event: InputLikeEvent) {
    updateAudioReactiveSetting('easing', (event.target as HTMLInputElement).value)
  }
  function onAudioReactiveBeatBoostChange(event: InputLikeEvent) {
    updateAudioReactiveSetting('beatBoost', parseFloat((event.target as HTMLInputElement).value))
  }
  function onAudioReactivePhaseChange(event: InputLikeEvent) {
    updateAudioReactiveSetting('phase', parseInt((event.target as HTMLInputElement).value))
  }
  function onAudioReactiveGainChange(event: InputLikeEvent) {
    updateAudioReactiveSetting('gain', parseFloat((event.target as HTMLInputElement).value))
  }

  function toggleAudioPreset(presetName: string) {
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
    const ar = settingsOf(currentActiveImage.value).audioReactive
    for (const effectName of Object.keys(ar.effects)) {
      ;(ar.effects[effectName] as AudioReactiveConfig['effects'][string]).enabled = false
    }
    ar.enabled = false
    activeAudioPreset.value = null
  }

  // Gemeinsame Implementierung (Bilder + Hintergrund) in audioReactiveConfig.js
  const assignArConfig = assignAudioReactiveConfig

  function applyAudioPreset(presetName: string) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = settingsOf(currentActiveImage.value).audioReactive

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
    const ar = settingsOf(currentActiveImage.value).audioReactive
    const backup = userEffectsBackups.get(currentActiveImage.value.id)
    if (backup) {
      assignArConfig(ar, backup)
    }
    activeAudioPreset.value = null
  }

  function onEffectToggle(effectName: string, enabled: boolean) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = settingsOf(currentActiveImage.value).audioReactive
    if (ar.effects && ar.effects[effectName]) {
      ar.effects[effectName].enabled = enabled
    }
  }

  function onEffectIntensityChange(effectName: string, value: string | number) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = settingsOf(currentActiveImage.value).audioReactive
    if (ar.effects && ar.effects[effectName]) {
      ar.effects[effectName].intensity = parseInt(String(value))
    }
  }

  function onEffectSourceChange(effectName: string, value: string) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = settingsOf(currentActiveImage.value).audioReactive
    if (ar.effects && ar.effects[effectName]) {
      ar.effects[effectName].source = value === '' ? null : value
    }
  }

  function saveAudioReactiveSettings() {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return
    fotoManager.initializeImageSettings(currentActiveImage.value)
    const ar = settingsOf(currentActiveImage.value).audioReactive
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
    settingsOf(currentActiveImage.value).audioReactive = JSON.parse(
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
