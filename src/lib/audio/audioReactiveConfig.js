/**
 * Gemeinsame Audio-Reaktiv-Konfiguration für Bilder UND den Farb-/Gradient-
 * Hintergrund: Default-Struktur, Presets sowie (De-)Serialisierung.
 *
 * Die Struktur entspricht `fotoSettings.audioReactive` eines Canvas-Bildes,
 * damit Panel (AudioReactivePanel) und Engine (calculateEffectValue /
 * canvasManager._getAudioReactiveValues) für beide Ziele identisch arbeiten.
 *
 * @module audio/audioReactiveConfig
 */
import { EFFECT_NAMES } from './AudioReactiveEffects.js'

/** Standard-Intensitäten pro Effekt (identisch zu fotoManager.defaultSettings). */
export const DEFAULT_EFFECT_INTENSITIES = Object.freeze({
  hue: 80,
  brightness: 80,
  saturation: 80,
  scale: 80,
  glow: 80,
  border: 80,
  blur: 50,
  rotation: 50,
  shake: 50,
  bounce: 50,
  swing: 50,
  orbit: 50,
  figure8: 50,
  wave: 50,
  spiral: 50,
  float: 50,
  contrast: 60,
  grayscale: 80,
  sepia: 70,
  invert: 50,
  skew: 40,
  strobe: 70,
  chromatic: 60,
  perspective: 50,
  beatPulse: 70,
  zoomPunch: 70,
  bpmPulse: 60,
  freqSplit: 60,
  vignettePulse: 60,
  beatFlip: 80,
  colorStrobe: 70,
  impulseShake: 70,
  // Nur Hintergrund (Gradient)
  gradientPulse: 80,
  gradientRotation: 80,
})

/** Zusätzliche, nur für den Gradient-Hintergrund verfügbare Effekte. */
export const GRADIENT_EFFECT_NAMES = Object.freeze(['gradientPulse', 'gradientRotation'])

/** Alle Effekte des Hintergrund-Panels: Bild-Effekte + Gradient-Effekte. */
export const BACKGROUND_EFFECT_NAMES = Object.freeze([...EFFECT_NAMES, ...GRADIENT_EFFECT_NAMES])

/**
 * Erzeugt eine frische Audio-Reaktiv-Konfiguration (alles deaktiviert).
 * @param {readonly string[]} [effectNames=EFFECT_NAMES]
 * @returns {{enabled:boolean, source:string, smoothing:number, easing:string, phase:number, beatBoost:number, gain:number, effects:Record<string,{enabled:boolean,intensity:number,source:string|null}>}}
 */
export function createAudioReactiveConfig(effectNames = EFFECT_NAMES) {
  const effects = {}
  for (const name of effectNames) {
    effects[name] = {
      enabled: false,
      intensity: DEFAULT_EFFECT_INTENSITIES[name] ?? 80,
      source: null,
    }
  }
  return {
    enabled: false,
    source: 'bass',
    smoothing: 50,
    easing: 'linear',
    phase: 0,
    beatBoost: 1.0,
    gain: 1.0,
    effects,
  }
}

/** Presets (identisch für Bilder und Hintergrund). */
export const AUDIO_REACTIVE_PRESETS = Object.freeze({
  pulse: {
    effects: { scale: { enabled: true, intensity: 70 }, glow: { enabled: true, intensity: 80 } },
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
    effects: { shake: { enabled: true, intensity: 80 }, scale: { enabled: true, intensity: 40 } },
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
    effects: { strobe: { enabled: true, intensity: 85 }, invert: { enabled: true, intensity: 60 } },
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
})

/** Preset-Liste für die UI (Reihenfolge = Anzeige). */
export const AUDIO_REACTIVE_PRESET_LIST = Object.freeze([
  { id: 'pulse', name: 'Pulse', icon: '💓' },
  { id: 'dance', name: 'Dance', icon: '💃' },
  { id: 'shake', name: 'Shake', icon: '🎸' },
  { id: 'glow', name: 'Glow', icon: '✨' },
  { id: 'strobe', name: 'Strobe', icon: '⚡' },
  { id: 'glitch', name: 'Glitch', icon: '🔥' },
  { id: 'rhythm', name: 'Rhythm', icon: '🥁' },
])

/**
 * Wendet ein Preset in-place auf eine Konfiguration an: alle Effekte aus,
 * dann Preset-Effekte und Master-Werte setzen.
 * @param {object} ar - Konfiguration (wird mutiert)
 * @param {string} presetName
 * @returns {boolean} false, wenn das Preset unbekannt ist (ar bleibt unverändert)
 */
export function applyAudioReactivePreset(ar, presetName) {
  const preset = AUDIO_REACTIVE_PRESETS[presetName]
  if (!ar || !ar.effects || !preset) return false

  for (const name of Object.keys(ar.effects)) ar.effects[name].enabled = false

  ar.enabled = true
  ar.source = preset.source
  ar.easing = preset.easing
  ar.beatBoost = preset.beatBoost
  ar.smoothing = preset.smoothing

  for (const [name, cfg] of Object.entries(preset.effects)) {
    if (ar.effects[name]) {
      ar.effects[name].enabled = cfg.enabled
      ar.effects[name].intensity = cfg.intensity
    }
  }
  return true
}

/**
 * Schreibt eine (einfache, evtl. unvollständige) Konfiguration in-place auf
 * `ar` zurück. Fehlende Effekte werden deaktiviert, unbekannte ignoriert.
 * @param {object} ar - Zielkonfiguration (wird mutiert)
 * @param {object|null|undefined} cfg
 */
export function assignAudioReactiveConfig(ar, cfg) {
  if (!ar || !cfg) return
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

/**
 * Tiefe, reaktivitätsfreie Kopie einer Konfiguration.
 * @param {object} ar
 * @returns {object}
 */
export function cloneAudioReactiveConfig(ar) {
  return JSON.parse(JSON.stringify(ar))
}

// ─── Hintergrund: Snapshot-/Preset-Format ────────────────────────────────────
// Canvas-Presets und Beat-Marker-Snapshots speichern die Hintergrund-Audio-
// Einstellungen flach (`bgAudioEnabled`, `bgAudioSource`, …, `bgEffects`).
// Das Format bleibt rückwärtskompatibel: alte Snapshots enthalten nur wenige
// Effekte und keine Easing/Beat-Boost/Phase/Gain-Felder.

/**
 * @param {object} ar - Hintergrund-Konfiguration
 * @returns {object} flache Felder für Preset/Snapshot
 */
export function serializeBackgroundAudio(ar) {
  const effects = {}
  for (const [name, fx] of Object.entries(ar.effects || {})) {
    effects[name] = {
      enabled: Boolean(fx.enabled),
      intensity: fx.intensity,
      ...(fx.source ? { source: fx.source } : {}),
    }
  }
  return {
    bgAudioEnabled: Boolean(ar.enabled),
    bgAudioSource: ar.source || 'bass',
    bgAudioSmoothing: ar.smoothing ?? 50,
    bgAudioEasing: ar.easing || 'linear',
    bgAudioBeatBoost: ar.beatBoost ?? 1.0,
    bgAudioPhase: ar.phase ?? 0,
    bgAudioGain: ar.gain ?? 1.0,
    bgEffects: effects,
  }
}

/**
 * Übernimmt flache Snapshot-/Preset-Felder in-place in eine Hintergrund-
 * Konfiguration. Nicht enthaltene Effekte werden deaktiviert (Intensität bleibt).
 * @param {object} ar - Zielkonfiguration (wird mutiert)
 * @param {object|null|undefined} snapshot
 */
export function applyBackgroundAudioSnapshot(ar, snapshot) {
  const s = snapshot || {}
  ar.enabled = Boolean(s.bgAudioEnabled)
  ar.source = s.bgAudioSource || 'bass'
  ar.smoothing = s.bgAudioSmoothing ?? 50
  ar.easing = s.bgAudioEasing || 'linear'
  ar.beatBoost = s.bgAudioBeatBoost ?? 1.0
  ar.phase = s.bgAudioPhase ?? 0
  ar.gain = s.bgAudioGain ?? 1.0
  const fx = s.bgEffects || {}
  for (const name of Object.keys(ar.effects)) {
    const src = fx[name]
    ar.effects[name].enabled = Boolean(src?.enabled)
    if (src?.intensity !== undefined && src.intensity !== null) {
      ar.effects[name].intensity = src.intensity
    }
    ar.effects[name].source = src?.source || null
  }
}
