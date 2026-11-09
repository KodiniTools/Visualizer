import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { getAudioAnalysisData, type AudioAnalysisData } from '../../lib/audio/audioAnalysisData'
import { historyApplyRevision } from '../../lib/history/historyRecorder'
import {
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
  cloneAudioReactiveConfig,
  type AudioReactiveConfig,
} from '../../lib/audio/audioReactiveConfig'

/** Vom AudioReactivePanel per defineExpose bereitgestellte API */
export interface AudioReactivePanelApi {
  audioLevelBarRef?: HTMLElement | null
  loadSettings(config: unknown): void
}

/** Optionen von useAudioReactiveTarget */
export interface AudioReactiveTargetOptions {
  /** Ref auf das AudioReactivePanel */
  panelRef: Ref<AudioReactivePanelApi | null | undefined>
  /** localStorage-Schlüssel für „Speichern/Anwenden“ */
  storageKey: string
  /** Konsolenmeldung, wenn Speichern scheitert */
  saveWarning: string
  /** Konfiguration (legt sie bei Bedarf an) */
  getConfig: () => AudioReactiveConfig | null | undefined
  /** Konfiguration ohne Anlegen */
  peekConfig?: () => AudioReactiveConfig | null | undefined
  /** Wert für panel.loadSettings() */
  panelConfig?: () => unknown
  /** Ziel für Preset/Backup (ID oder Objekt, null = keins) */
  targetKey: () => unknown
  /** Ein/Aus-Zustand (Standard: peekConfig().enabled) */
  isEnabled?: () => boolean
  /** Schalter setzen; false = kein Ziel */
  setEnabled: (enabled: boolean) => void | false
  /** weitere Auslöser für den Panel-Abgleich */
  syncSources?: Array<() => unknown>
  onPresetApplied?: (config: AudioReactiveConfig) => void
  /** nach Wiederherstellen des Backups */
  onPresetRestored?: (config: AudioReactiveConfig) => void
  onSettingsApplied?: (config: AudioReactiveConfig, saved: object) => void
}

/** Geglätteter Pegel (0–255) der gewählten Quelle; unbekannt → Bass. */
export function levelForSource(
  audioData: Partial<AudioAnalysisData>,
  source: string | null | undefined,
): number {
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
export function levelBarBackground(percent: number): string {
  if (percent > 70) return 'linear-gradient(90deg, #4ade80, #fbbf24, #ef4444)'
  if (percent > 40) return 'linear-gradient(90deg, #4ade80, #fbbf24)'
  return '#4ade80'
}

/**
 * Setter für Master-Regler und Effekte einer Audio-Reaktiv-Konfiguration.
 * @param getConfig liefert (und legt ggf. an) die Konfiguration
 */
export function createAudioReactiveSetters(
  getConfig: () => AudioReactiveConfig | null | undefined,
) {
  return {
    setProperty(property: string, value: unknown) {
      const c = getConfig()
      if (!c || property === 'effects' || !(property in c)) return
      ;(c as unknown as Record<string, unknown>)[property] = value
    },
    setEffectEnabled(name: string, enabled: unknown) {
      const fx = getConfig()?.effects?.[name]
      if (fx) fx.enabled = Boolean(enabled)
    },
    setEffectIntensity(name: string, value: string | number) {
      const fx = getConfig()?.effects?.[name]
      const n = parseInt(String(value))
      if (fx && Number.isFinite(n)) fx.intensity = Math.max(0, Math.min(100, n))
    },
    setEffectSource(name: string, source: string | null | undefined) {
      const fx = getConfig()?.effects?.[name]
      if (fx) fx.source = source ? source : null
    },
  }
}

/** Pro Ziel (Objekt oder ID) gemerkte Werte; Objekte schwach referenziert. */
function createKeyedStore<V>() {
  const byObject = new WeakMap<object, V>()
  const byValue = new Map<unknown, V>()
  // Die WeakMap erhält nur Objekt-Schlüssel (siehe Prüfung)
  const pick = (key: unknown) =>
    key !== null && typeof key === 'object' ? (byObject as unknown as Map<unknown, V>) : byValue
  return {
    get: (key: unknown): V | undefined =>
      key === null || key === undefined ? undefined : pick(key).get(key),
    set: (key: unknown, value: V) => {
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
 * @param o - siehe AudioReactiveTargetOptions
 */
export function useAudioReactiveTarget(o: AudioReactiveTargetOptions) {
  const peekConfig = o.peekConfig ?? o.getConfig
  const panelConfig = o.panelConfig ?? peekConfig
  const isEnabled = o.isEnabled ?? (() => !!peekConfig()?.enabled)

  const revision = ref(0)
  // Undo/Redo gilt als externe Änderung → Panel neu einlesen
  watch(historyApplyRevision, () => revision.value++)

  // ── Presets (aktiv + Backup der eigenen Effekte je Ziel) ──
  const activePresets = createKeyedStore<string | null>()
  const userBackups = createKeyedStore<AudioReactiveConfig>()
  const presetTick = ref(0)
  const activePreset = computed(() => {
    void presetTick.value
    return activePresets.get(o.targetKey()) ?? null
  })
  function setActivePreset(name: string | null) {
    const key = o.targetKey()
    if (key === null || key === undefined) return
    activePresets.set(key, name)
    presetTick.value++
  }

  function togglePreset(name: string) {
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
  function loadSaved(): object | null {
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
  let levelAnimationId: number | null = null
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

  function setEnabled(enabled: unknown) {
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
  const input = (e: Event) => e.target as HTMLInputElement
  const panelListeners = {
    'audio-reactive-toggle': (e: Event) => setEnabled(input(e).checked),
    'source-change': (e: Event) => setters.setProperty('source', input(e).value),
    'smoothing-change': (e: Event) => setters.setProperty('smoothing', parseInt(input(e).value)),
    'easing-change': (e: Event) => setters.setProperty('easing', input(e).value),
    'beat-boost-change': (e: Event) => setters.setProperty('beatBoost', parseFloat(input(e).value)),
    'phase-change': (e: Event) => setters.setProperty('phase', parseInt(input(e).value)),
    'gain-change': (e: Event) => setters.setProperty('gain', parseFloat(input(e).value)),
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
