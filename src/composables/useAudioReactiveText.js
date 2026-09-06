import { computed, reactive, ref } from 'vue'
import {
  AUDIO_REACTIVE_PRESETS,
  TEXT_REACTION_DEFAULTS,
  TEXT_REACTION_PRESETS,
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
  cloneAudioReactiveConfig,
  ensureTextAudioReactive,
} from '../lib/audio/audioReactiveConfig.js'

const AUDIO_EFFECTS_PRESET_KEY = 'visualizer_audio_effects_preset'

// Aktives Effekt-Preset und Backup der Nutzer-Effekte pro Text-ID (modulweit,
// damit ein Wechsel des markierten Textes den Zustand nicht verliert).
const activePresetsByText = reactive({})
const userEffectsBackups = new Map()

function loadSavedPreset() {
  try {
    const raw =
      typeof localStorage !== 'undefined' && localStorage.getItem(AUDIO_EFFECTS_PRESET_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
const savedPreset = ref(loadSavedPreset())

/**
 * Audio-Reaktiv-Logik für Texte. Die Konfiguration hat dieselbe Struktur wie
 * bei Bildern (Master inkl. Easing/Beat-Boost/Phase/Gain, Effekte mit eigener
 * Quelle) plus Text-Extras: Threshold/Attack/Release und Blinken (minimum/ease).
 *
 * @param {import('vue').Ref} selectedText - markiertes Text-Objekt
 * @param {import('vue').Ref} canvasManager
 * @param {object} toastStore
 */
export function useAudioReactiveText(selectedText, canvasManager, toastStore) {
  const hasAudioEffectsPreset = computed(() => savedPreset.value !== null)
  // Zähler für externe Änderungen (Preset/Laden/Reset), damit das Panel neu einliest
  const revision = ref(0)

  function updateText() {
    if (canvasManager.value && canvasManager.value.redrawCallback) {
      canvasManager.value.redrawCallback()
    }
  }

  /** Stellt die vollständige Konfiguration des markierten Textes sicher. */
  function ar() {
    const text = selectedText.value
    if (!text) return null
    text.audioReactive = ensureTextAudioReactive(text.audioReactive)
    return text.audioReactive
  }

  const activeEffectPreset = computed(() => {
    const id = selectedText.value?.id
    return id === undefined ? null : (activePresetsByText[id] ?? null)
  })

  // ── Master ────────────────────────────────────────────────────────────────
  function toggleAudioReactive() {
    const cfg = ar()
    if (!cfg) return
    setAudioEnabled(!cfg.enabled)
  }

  function setAudioEnabled(enabled) {
    const cfg = ar()
    if (!cfg) return
    cfg.enabled = Boolean(enabled)
    if (!enabled && selectedText.value?.id !== undefined) {
      activePresetsByText[selectedText.value.id] = null
    }
    updateText()
  }

  /** @param {'source'|'smoothing'|'easing'|'beatBoost'|'phase'|'gain'|'threshold'|'attack'|'release'} property */
  function setAudioProperty(property, value) {
    const cfg = ar()
    if (!cfg || property === 'effects' || !(property in cfg)) return
    cfg[property] = value
    updateText()
  }

  // ── Effekte ───────────────────────────────────────────────────────────────
  function setEffectEnabled(effectName, enabled) {
    const fx = ar()?.effects?.[effectName]
    if (!fx) return
    fx.enabled = Boolean(enabled)
    updateText()
  }

  function setEffectIntensity(effectName, intensity) {
    const fx = ar()?.effects?.[effectName]
    if (!fx) return
    const n = parseInt(intensity)
    if (!Number.isFinite(n)) return
    fx.intensity = Math.max(0, Math.min(100, n))
    updateText()
  }

  function setEffectSource(effectName, source) {
    const fx = ar()?.effects?.[effectName]
    if (!fx) return
    fx.source = source ? source : null
    updateText()
  }

  // ── Effekt-Presets (gemeinsam mit Bildern/Hintergrund/Kacheln) ────────────
  function toggleEffectPreset(presetName) {
    const cfg = ar()
    const id = selectedText.value?.id
    if (!cfg || id === undefined) return
    if (activePresetsByText[id] === presetName) {
      clearEffectPreset()
      return
    }
    if (!activePresetsByText[id]) {
      userEffectsBackups.set(id, cloneAudioReactiveConfig(cfg))
    }
    if (!applyAudioReactivePreset(cfg, presetName)) return
    activePresetsByText[id] = presetName
    revision.value++
    updateText()
  }

  function clearEffectPreset() {
    const cfg = ar()
    const id = selectedText.value?.id
    if (!cfg || id === undefined) return
    const backup = userEffectsBackups.get(id)
    if (backup) assignAudioReactiveConfig(cfg, backup)
    activePresetsByText[id] = null
    revision.value++
    updateText()
  }

  // ── Text-spezifische Reaktions-Presets (Threshold/Attack/Release …) ───────
  function applyAudioPreset(presetName) {
    const cfg = ar()
    const preset = TEXT_REACTION_PRESETS[presetName]
    if (!cfg || !preset) return
    Object.assign(cfg, preset)
    revision.value++
    updateText()
    console.log(`🎛️ Audio-Preset "${presetName}" angewendet`)
  }

  function resetAudioSettings() {
    const cfg = ar()
    if (!cfg) return
    Object.assign(cfg, TEXT_REACTION_DEFAULTS, { smoothing: 50, beatBoost: 1.0 })
    if (cfg.effects?.opacity) {
      cfg.effects.opacity.minimum = 0
      cfg.effects.opacity.ease = false
    }
    revision.value++
    updateText()
  }

  function resetAllAudioEffects() {
    const cfg = ar()
    if (!cfg?.effects) return
    for (const fx of Object.values(cfg.effects)) {
      fx.enabled = false
      fx.intensity = 50
      if ('minimum' in fx) fx.minimum = 0
      if ('ease' in fx) fx.ease = false
    }
    if (selectedText.value?.id !== undefined) activePresetsByText[selectedText.value.id] = null
    revision.value++
    updateText()
  }

  // ── Speichern / Laden (localStorage) ──────────────────────────────────────
  function checkAudioEffectsPreset() {
    savedPreset.value = loadSavedPreset()
  }

  function saveAudioEffectsPreset() {
    const cfg = ar()
    if (!cfg) {
      toastStore?.warning?.('Keine Effekte zum Speichern')
      return
    }
    try {
      const copy = cloneAudioReactiveConfig(cfg)
      localStorage.setItem(AUDIO_EFFECTS_PRESET_KEY, JSON.stringify(copy))
      savedPreset.value = copy
      toastStore?.success?.('Audio-Effekte gespeichert')
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Presets:', error)
      toastStore?.error?.('Fehler beim Speichern')
    }
  }

  function loadAudioEffectsPreset() {
    const cfg = ar()
    if (!cfg) {
      toastStore?.warning?.('Bitte wähle zuerst einen Text aus')
      return
    }
    const preset = savedPreset.value
    if (!preset) {
      toastStore?.warning?.('Kein Preset gespeichert')
      return
    }
    // Gemeinsame Felder + Effekte übernehmen, danach Text-Extras
    assignAudioReactiveConfig(cfg, { ...preset, enabled: true })
    for (const key of ['threshold', 'attack', 'release']) {
      if (preset[key] !== undefined) cfg[key] = preset[key]
    }
    if (preset.effects?.opacity && cfg.effects.opacity) {
      if (preset.effects.opacity.minimum !== undefined)
        cfg.effects.opacity.minimum = preset.effects.opacity.minimum
      if (preset.effects.opacity.ease !== undefined)
        cfg.effects.opacity.ease = preset.effects.opacity.ease
    }
    if (selectedText.value?.id !== undefined) activePresetsByText[selectedText.value.id] = null
    revision.value++
    updateText()
    toastStore?.success?.('Audio-Effekte geladen')
  }

  return {
    hasAudioEffectsPreset,
    revision,
    activeEffectPreset,
    effectPresetDefinitions: AUDIO_REACTIVE_PRESETS,
    ensureConfig: ar,
    toggleAudioReactive,
    setAudioEnabled,
    setAudioProperty,
    setEffectEnabled,
    setEffectIntensity,
    setEffectSource,
    toggleEffectPreset,
    clearEffectPreset,
    applyAudioPreset,
    resetAudioSettings,
    resetAllAudioEffects,
    checkAudioEffectsPreset,
    saveAudioEffectsPreset,
    loadAudioEffectsPreset,
  }
}
