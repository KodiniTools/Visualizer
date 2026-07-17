import { ref, computed } from 'vue'

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

  // Schreibt eine (einfache) Audio-Reaktiv-Konfiguration in-place auf das
  // reaktive `ar`-Objekt zurück – für das Wiederherstellen der Nutzer-Effekte.
  function assignArConfig(ar, cfg) {
    if (!cfg) return
    ar.enabled = cfg.enabled ?? false
    if (cfg.source !== undefined) ar.source = cfg.source
    if (cfg.easing !== undefined) ar.easing = cfg.easing
    if (cfg.beatBoost !== undefined) ar.beatBoost = cfg.beatBoost
    if (cfg.smoothing !== undefined) ar.smoothing = cfg.smoothing
    if (cfg.phase !== undefined) ar.phase = cfg.phase
    if (cfg.gain !== undefined) ar.gain = cfg.gain
    for (const name of Object.keys(ar.effects)) {
      const src = cfg.effects?.[name]
      if (src) {
        ar.effects[name].enabled = src.enabled ?? false
        if (src.intensity !== undefined) ar.effects[name].intensity = src.intensity
        ar.effects[name].source = src.source ?? null
      } else {
        ar.effects[name].enabled = false
      }
    }
  }

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

    const presets = {
      pulse: {
        effects: {
          scale: { enabled: true, intensity: 70 },
          glow: { enabled: true, intensity: 80 },
        },
        source: 'bass',
        easing: 'easeOut',
        beatBoost: 1.5,
        smoothing: 60,
      },
      dance: {
        effects: {
          bounce: { enabled: true, intensity: 60 },
          swing: { enabled: true, intensity: 50 },
          rotation: { enabled: true, intensity: 30 },
        },
        source: 'mid',
        easing: 'bounce',
        beatBoost: 1.3,
        smoothing: 40,
      },
      shake: {
        effects: {
          shake: { enabled: true, intensity: 80 },
          scale: { enabled: true, intensity: 40 },
        },
        source: 'bass',
        easing: 'punch',
        beatBoost: 2.0,
        smoothing: 20,
      },
      glow: {
        effects: {
          glow: { enabled: true, intensity: 90 },
          brightness: { enabled: true, intensity: 50 },
          hue: { enabled: true, intensity: 30 },
        },
        source: 'volume',
        easing: 'easeInOut',
        beatBoost: 1.0,
        smoothing: 70,
      },
      strobe: {
        effects: {
          strobe: { enabled: true, intensity: 85 },
          invert: { enabled: true, intensity: 60 },
        },
        source: 'bass',
        easing: 'linear',
        beatBoost: 2.5,
        smoothing: 10,
      },
      glitch: {
        effects: {
          chromatic: { enabled: true, intensity: 75 },
          skew: { enabled: true, intensity: 50 },
          shake: { enabled: true, intensity: 40 },
        },
        source: 'bass',
        easing: 'elastic',
        beatBoost: 2.0,
        smoothing: 25,
      },
      rhythm: {
        effects: {
          beatPulse: { enabled: true, intensity: 80 },
          glow: { enabled: true, intensity: 55 },
        },
        source: 'bass',
        easing: 'easeOut',
        beatBoost: 1.2,
        smoothing: 35,
      },
    }

    for (const effectName of Object.keys(ar.effects)) {
      ar.effects[effectName].enabled = false
    }

    const preset = presets[presetName]
    if (!preset) return

    ar.enabled = true
    ar.source = preset.source
    ar.easing = preset.easing
    ar.beatBoost = preset.beatBoost
    ar.smoothing = preset.smoothing

    for (const [effectName, config] of Object.entries(preset.effects)) {
      if (ar.effects[effectName]) {
        ar.effects[effectName].enabled = config.enabled
        ar.effects[effectName].intensity = config.intensity
      }
    }

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
