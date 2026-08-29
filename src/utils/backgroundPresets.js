// src/utils/backgroundPresets.js
import { BUILT_IN_PRESETS } from '../stores/presetStore.js'

// Gespeicherte Canvas-/Hintergrund-Presets (aus dem Canvas-Panel, PresetsSection)
const USER_CANVAS_PRESETS_KEY = 'visualizer-canvas-presets'

/**
 * Wandelt einen eingebauten Preset-Hintergrund ({color, opacity, ...}) in einen
 * vollständigen Hintergrund-Snapshot um, wie ihn applyBackgroundSnapshot erwartet.
 */
function builtinToSnapshot(bg = {}) {
  return {
    backgroundImage: null,
    backgroundVideo: null,
    backgroundColor: bg.color || '#ffffff',
    backgroundOpacity: bg.opacity ?? 1.0,
    gradientEnabled: Boolean(bg.gradientEnabled),
    gradientColor2: bg.gradientColor2 || '#0066ff',
    gradientType: 'radial',
    gradientAngle: 45,
    bgAudioEnabled: false,
    bgAudioSource: 'bass',
    bgAudioSmoothing: 50,
    bgEffects: {},
    // Eingebaute Vorlagen haben keine Vordergrund-Elemente.
    elements: null,
  }
}

/**
 * Wandelt ein gespeichertes Canvas-Preset in einen Hintergrund-Snapshot um.
 * Diese Presets enthalten bereits die Audio-Reaktiven Einstellungen.
 */
function userPresetToSnapshot(p = {}) {
  return {
    // Bild-Hintergrund (z.B. Galeriebild) inkl. Bild-Audio-Reaktiv durchreichen
    backgroundImage: p.backgroundImage || null,
    // Video-Hintergrund inkl. Bild-Audio-Reaktiv durchreichen
    backgroundVideo: p.backgroundVideo || null,
    backgroundColor: p.backgroundColor || '#ffffff',
    backgroundOpacity: p.backgroundOpacity ?? 1.0,
    gradientEnabled: Boolean(p.gradientEnabled),
    gradientColor2: p.gradientColor2 || '#0066ff',
    gradientType: p.gradientType || 'radial',
    gradientAngle: p.gradientAngle ?? 45,
    bgAudioEnabled: Boolean(p.bgAudioEnabled),
    bgAudioSource: p.bgAudioSource || 'bass',
    bgAudioSmoothing: p.bgAudioSmoothing ?? 50,
    bgEffects: p.bgEffects || {},
    // Vordergrund-Elemente (Bilder, Videos, Texte, Lauftext) durchreichen,
    // damit ein Beat-Marker das komplette Canvas-Preset einsetzt.
    elements: p.elements || null,
  }
}

/**
 * Lädt die vom Nutzer gespeicherten Canvas-Presets aus dem localStorage.
 * @returns {Array}
 */
export function loadUserCanvasPresets() {
  try {
    const stored = localStorage.getItem(USER_CANVAS_PRESETS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    console.warn('⚠️ [BackgroundPresets] Konnte gespeicherte Presets nicht laden:', e)
    return []
  }
}

/**
 * Liefert die Hintergrund-Auswahl für das Marker-Dropdown, gruppiert nach
 * eigenen Presets und Vorlagen. Jede Option enthält einen fertigen Snapshot.
 * @returns {{ user: Array, builtin: Array }}
 */
export function getBackgroundPresetOptions() {
  const user = loadUserCanvasPresets().map((p) => ({
    key: `user:${p.id}`,
    label: p.name || 'Preset',
    snapshot: userPresetToSnapshot(p),
  }))

  const builtin = BUILT_IN_PRESETS.map((p) => ({
    key: `builtin:${p.id}`,
    label: `${p.emoji || ''} ${p.name}`.trim(),
    snapshot: builtinToSnapshot(p.background),
  }))

  return { user, builtin }
}

/**
 * Löst einen Dropdown-Key zu {key, label, snapshot} auf.
 * @param {string} key
 * @returns {{ key: string, label: string, snapshot: object } | null}
 */
export function resolveBackgroundPreset(key) {
  if (!key) return null
  const { user, builtin } = getBackgroundPresetOptions()
  return [...user, ...builtin].find((o) => o.key === key) || null
}
