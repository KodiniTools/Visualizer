import { ref, reactive, computed } from 'vue'
import {
  BACKGROUND_EFFECT_NAMES,
  applyAudioReactivePreset,
  applyBackgroundAudioSnapshot,
  assignAudioReactiveConfig,
  cloneAudioReactiveConfig,
  createAudioReactiveConfig,
} from '../../lib/audio/audioReactiveConfig.js'

const BG_AUDIO_STORAGE_KEY = 'visualizer_bgAudioReactivePreset'

function loadSavedBgAudioSettings() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(BG_AUDIO_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Audio-Reaktiv für die Hintergrundfarbe: identische Struktur/Einstellungen
 * wie Bild-Audio-Reaktiv (Master, Presets, alle Effekte mit Intensität +
 * eigener Quelle) plus die beiden Gradient-Effekte. Einzige Quelle der
 * Wahrheit für das Panel.
 * @param {import('vue').Ref<object|null>} canvasManager
 */
export function useBgAudioReactive(canvasManager) {
  const bgAudioReactive = reactive(createAudioReactiveConfig(BACKGROUND_EFFECT_NAMES))
  const activeBgAudioPreset = ref(null)
  // Wird bei externen Änderungen (Preset/Snapshot/Anwenden) erhöht, damit das
  // Panel seine DOM-Controls neu einliest.
  const bgAudioRevision = ref(0)
  // Nutzer-Effekte vor dem ersten Preset sichern ("Kein Preset" stellt sie wieder her)
  let bgUserEffectsBackup = null
  const savedBgAudioSettings = ref(loadSavedBgAudioSettings())
  const hasSavedBgAudioSettings = computed(() => savedBgAudioSettings.value !== null)

  function updateBgAudioReactive() {
    if (!canvasManager.value) return
    // Reaktivitätsfreie Kopie an den Renderer (wird pro Frame gelesen)
    canvasManager.value.setBackgroundColorAudioReactive(cloneAudioReactiveConfig(bgAudioReactive))
  }

  function bumpBgAudioRevision() {
    bgAudioRevision.value++
  }

  // ── Handler für das Audio-Reaktiv-Panel (gleiche Semantik wie bei Bildern) ──
  function setBgAudioEnabled(enabled) {
    bgAudioReactive.enabled = Boolean(enabled)
    if (!enabled) activeBgAudioPreset.value = null
    updateBgAudioReactive()
  }

  /** @param {'source'|'smoothing'|'easing'|'beatBoost'|'phase'|'gain'} property */
  function setBgAudioProperty(property, value) {
    if (!(property in bgAudioReactive) || property === 'effects') return
    bgAudioReactive[property] = value
    updateBgAudioReactive()
  }

  function setBgEffectEnabled(effectName, enabled) {
    const fx = bgAudioReactive.effects[effectName]
    if (!fx) return
    fx.enabled = Boolean(enabled)
    updateBgAudioReactive()
  }

  function setBgEffectIntensity(effectName, intensity) {
    const fx = bgAudioReactive.effects[effectName]
    if (!fx) return
    const n = parseInt(intensity)
    if (!Number.isFinite(n)) return
    fx.intensity = Math.max(0, Math.min(100, n))
    updateBgAudioReactive()
  }

  function setBgEffectSource(effectName, source) {
    const fx = bgAudioReactive.effects[effectName]
    if (!fx) return
    fx.source = source ? source : null
    updateBgAudioReactive()
  }

  function toggleBgAudioPreset(presetName) {
    if (activeBgAudioPreset.value === presetName) {
      clearBgAudioPreset()
      return
    }
    if (activeBgAudioPreset.value === null) {
      bgUserEffectsBackup = cloneAudioReactiveConfig(bgAudioReactive)
    }
    if (!applyAudioReactivePreset(bgAudioReactive, presetName)) return
    activeBgAudioPreset.value = presetName
    updateBgAudioReactive()
    bumpBgAudioRevision()
  }

  function clearBgAudioPreset() {
    if (bgUserEffectsBackup) assignAudioReactiveConfig(bgAudioReactive, bgUserEffectsBackup)
    activeBgAudioPreset.value = null
    updateBgAudioReactive()
    bumpBgAudioRevision()
  }

  function saveBgAudioSettings() {
    const copy = cloneAudioReactiveConfig(bgAudioReactive)
    savedBgAudioSettings.value = copy
    try {
      localStorage.setItem(BG_AUDIO_STORAGE_KEY, JSON.stringify(copy))
    } catch (e) {
      console.warn('⚠️ Hintergrund-Audio-Einstellungen konnten nicht gespeichert werden:', e)
    }
  }

  function applyBgAudioSettings() {
    if (!savedBgAudioSettings.value) return
    assignAudioReactiveConfig(bgAudioReactive, savedBgAudioSettings.value)
    activeBgAudioPreset.value = null
    updateBgAudioReactive()
    bumpBgAudioRevision()
  }

  /** Flache Snapshot-Felder (Preset/Beat-Marker) in die Konfiguration übernehmen. */
  function restoreBgAudioFromSnapshot(snapshot) {
    applyBackgroundAudioSnapshot(bgAudioReactive, snapshot)
    activeBgAudioPreset.value = null
    bumpBgAudioRevision()
  }

  return {
    bgAudioReactive,
    activeBgAudioPreset,
    bgAudioRevision,
    hasSavedBgAudioSettings,
    updateBgAudioReactive,
    bumpBgAudioRevision,
    setBgAudioEnabled,
    setBgAudioProperty,
    setBgEffectEnabled,
    setBgEffectIntensity,
    setBgEffectSource,
    toggleBgAudioPreset,
    clearBgAudioPreset,
    saveBgAudioSettings,
    applyBgAudioSettings,
    restoreBgAudioFromSnapshot,
  }
}
