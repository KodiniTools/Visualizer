import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getAudioAnalysisData } from '../../lib/audio/audioAnalysisData.js'
import { historyApplyRevision } from '../../lib/history/historyRecorder.js'
import {
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
  cloneAudioReactiveConfig,
} from '../../lib/audio/audioReactiveConfig.js'

/** Geglätteter Pegel (0–255) der gewählten Quelle; unbekannt → Bass. */
export function levelForSource(audioData, source) {
  switch (source) {
    case 'mid':
      return audioData.smoothMid ?? 0
    case 'treble':
      return audioData.smoothTreble ?? 0
    case 'volume':
      return audioData.smoothVolume ?? 0
    case 'bass':
    default:
      return audioData.smoothBass ?? 0
  }
}

/** Farbverlauf der Pegelanzeige je nach Aussteuerung. */
export function levelBarBackground(percent) {
  if (percent > 70) return 'linear-gradient(90deg, #4ade80, #fbbf24, #ef4444)'
  if (percent > 40) return 'linear-gradient(90deg, #4ade80, #fbbf24)'
  return '#4ade80'
}

/**
 * Setter für Master-Regler und Effekte einer Audio-Reaktiv-Konfiguration.
 * @param {() => object|null} getConfig liefert (und legt ggf. an) die Konfiguration
 */
export function createAudioReactiveSetters(getConfig) {
  return {
    setProperty(property, value) {
      const c = getConfig()
      if (!c || property === 'effects' || !(property in c)) return
      c[property] = value
    },
    setEffectEnabled(name, enabled) {
      const fx = getConfig()?.effects?.[name]
      if (fx) fx.enabled = Boolean(enabled)
    },
    setEffectIntensity(name, value) {
      const fx = getConfig()?.effects?.[name]
      const n = parseInt(value)
      if (fx && Number.isFinite(n)) fx.intensity = Math.max(0, Math.min(100, n))
    },
    setEffectSource(name, source) {
      const fx = getConfig()?.effects?.[name]
      if (fx) fx.source = source ? source : null
    },
  }
}

/** Pro Ziel (Objekt oder ID) gemerkte Werte; Objekte schwach referenziert. */
function createKeyedStore() {
  const byObject = new WeakMap()
  const byValue = new Map()
  const pick = (key) => (key !== null && typeof key === 'object' ? byObject : byValue)
  return {
    get: (key) => (key === null || key === undefined ? undefined : pick(key).get(key)),
    set: (key, value) => {
      if (key !== null && key !== undefined) pick(key).set(key, value)
    },
  }
}

/**
 * Gemeinsame Logik der Audio-Reaktiv-Ziele (Form, Lauftext, Video) für das
 * AudioReactivePanel: Regler/Effekte, Presets mit Backup der eigenen Effekte
 * (je Ziel), Speichern/Anwenden über localStorage, Panel-Abgleich nach
 * externen Änderungen (Undo/Redo, Ziel gewechselt) und die Pegelanzeige.
 *
 * @param {object} o
 * @param {import('vue').Ref} o.panelRef Ref auf das AudioReactivePanel
 * @param {string} o.storageKey localStorage-Schlüssel für „Speichern/Anwenden“
 * @param {string} o.saveWarning Konsolenmeldung, wenn Speichern scheitert
 * @param {() => object|null} o.getConfig Konfiguration (legt sie bei Bedarf an)
 * @param {() => object|null} [o.peekConfig] Konfiguration ohne Anlegen
 * @param {() => object|null} [o.panelConfig] Wert für panel.loadSettings()
 * @param {() => unknown} o.targetKey Ziel für Preset/Backup (ID oder Objekt, null = keins)
 * @param {() => boolean} [o.isEnabled] Ein/Aus-Zustand (Standard: peekConfig().enabled)
 * @param {(enabled: boolean) => (void|false)} o.setEnabled Schalter setzen; false = kein Ziel
 * @param {Array<() => unknown>} [o.syncSources] weitere Auslöser für den Panel-Abgleich
 * @param {(config: object) => void} [o.onPresetApplied]
 * @param {(config: object) => void} [o.onPresetRestored] nach Wiederherstellen des Backups
 * @param {(config: object, saved: object) => void} [o.onSettingsApplied]
 */
export function useAudioReactiveTarget(o) {
  const peekConfig = o.peekConfig ?? o.getConfig
  const panelConfig = o.panelConfig ?? peekConfig
  const isEnabled = o.isEnabled ?? (() => !!peekConfig()?.enabled)

  const revision = ref(0)
  // Undo/Redo gilt als externe Änderung → Panel neu einlesen
  watch(historyApplyRevision, () => revision.value++)

  // ── Presets (aktiv + Backup der eigenen Effekte je Ziel) ──
  const activePresets = createKeyedStore()
  const userBackups = createKeyedStore()
  const presetTick = ref(0)
  const activePreset = computed(() => {
    presetTick.value
    return activePresets.get(o.targetKey()) ?? null
  })
  function setActivePreset(name) {
    const key = o.targetKey()
    if (key === null || key === undefined) return
    activePresets.set(key, name)
    presetTick.value++
  }

  function togglePreset(name) {
    const c = o.getConfig()
    if (!c) return
    if (activePreset.value === name) {
      clearPreset()
      return
    }
    if (activePreset.value === null) userBackups.set(o.targetKey(), cloneAudioReactiveConfig(c))
    if (!applyAudioReactivePreset(c, name)) return
    o.onPresetApplied?.(c)
    setActivePreset(name)
    revision.value++
  }

  function clearPreset() {
    const c = o.getConfig()
    if (!c) return
    const backup = userBackups.get(o.targetKey())
    if (backup) {
      assignAudioReactiveConfig(c, backup)
      o.onPresetRestored?.(c)
    }
    setActivePreset(null)
    revision.value++
  }

  // ── Speichern / Anwenden ──
  function loadSaved() {
    try {
      const raw = typeof localStorage !== 'undefined' && localStorage.getItem(o.storageKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  const savedSettings = ref(loadSaved())
  const hasSavedSettings = computed(() => savedSettings.value !== null)

  function saveSettings() {
    const c = o.getConfig()
    if (!c) return
    const copy = cloneAudioReactiveConfig(c)
    savedSettings.value = copy
    try {
      localStorage.setItem(o.storageKey, JSON.stringify(copy))
    } catch (e) {
      console.warn(o.saveWarning, e)
    }
  }

  function applySettings() {
    const c = o.getConfig()
    if (!c || !savedSettings.value) return
    assignAudioReactiveConfig(c, savedSettings.value)
    o.onSettingsApplied?.(c, savedSettings.value)
    setActivePreset(null)
    revision.value++
  }

  // ── Pegelanzeige ──
  let levelAnimationId = null
  function updateLevel() {
    levelAnimationId = null
    const bar = o.panelRef.value?.audioLevelBarRef
    if (!bar || !isEnabled()) return
    const audioData = getAudioAnalysisData()
    if (audioData) {
      const percent = Math.min(100, (levelForSource(audioData, peekConfig()?.source) / 255) * 100)
      bar.style.width = percent + '%'
      bar.style.background = levelBarBackground(percent)
    }
    levelAnimationId = requestAnimationFrame(updateLevel)
  }
  function startLevelIndicator() {
    if (levelAnimationId === null) levelAnimationId = requestAnimationFrame(updateLevel)
  }
  function stopLevelIndicator() {
    if (levelAnimationId !== null) cancelAnimationFrame(levelAnimationId)
    levelAnimationId = null
  }
  function refreshLevelIndicator() {
    if (isEnabled()) startLevelIndicator()
    else stopLevelIndicator()
  }

  function setEnabled(enabled) {
    if (o.setEnabled(Boolean(enabled)) === false) return
    if (!enabled) setActivePreset(null)
    // Nicht-reaktive Ziele (Video-Objekte): Pegelanzeige explizit steuern
    nextTick(refreshLevelIndicator)
  }

  // ── Panel-Abgleich ──
  function syncPanel() {
    o.panelRef.value?.loadSettings(panelConfig())
  }
  watch([revision, ...(o.syncSources ?? [])], async () => {
    await nextTick()
    syncPanel()
  })
  // Nach externen Änderungen (Preset/Anwenden) Pegelanzeige neu bewerten
  watch(revision, refreshLevelIndicator)
  watch(isEnabled, async () => {
    await nextTick()
    refreshLevelIndicator()
  })

  onMounted(async () => {
    await nextTick()
    syncPanel()
    if (isEnabled()) startLevelIndicator()
  })
  onBeforeUnmount(stopLevelIndicator)

  const setters = createAudioReactiveSetters(o.getConfig)

  /** Listener für <AudioReactivePanel v-on="panelListeners" />. */
  const panelListeners = {
    'audio-reactive-toggle': (e) => setEnabled(e.target.checked),
    'source-change': (e) => setters.setProperty('source', e.target.value),
    'smoothing-change': (e) => setters.setProperty('smoothing', parseInt(e.target.value)),
    'easing-change': (e) => setters.setProperty('easing', e.target.value),
    'beat-boost-change': (e) => setters.setProperty('beatBoost', parseFloat(e.target.value)),
    'phase-change': (e) => setters.setProperty('phase', parseInt(e.target.value)),
    'gain-change': (e) => setters.setProperty('gain', parseFloat(e.target.value)),
    'toggle-preset': togglePreset,
    'clear-preset': clearPreset,
    'effect-toggle': setters.setEffectEnabled,
    'effect-intensity-change': setters.setEffectIntensity,
    'effect-source-change': setters.setEffectSource,
    'save-settings': saveSettings,
    'apply-settings': applySettings,
  }

  return {
    activePreset,
    hasSavedSettings,
    panelListeners,
    setEnabled,
    togglePreset,
    clearPreset,
    saveSettings,
    applySettings,
    ...setters,
  }
}
