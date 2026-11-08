import { BUILT_IN_PRESETS } from '../data/builtInPresets'

/** Hintergrund eines eingebauten Presets */
interface BuiltinBackground {
  color?: string
  opacity?: number
  gradientEnabled?: boolean
  gradientColor2?: string
}

/** Gespeichertes Canvas-Preset (localStorage, Felder optional: alte Presets) */
export interface UserCanvasPreset {
  id?: string | number
  name?: string
  backgroundImage?: unknown
  backgroundVideo?: unknown
  backgroundColor?: string
  backgroundOpacity?: number
  gradientEnabled?: boolean
  gradientColor2?: string
  gradientType?: string
  gradientAngle?: number
  bgAudioEnabled?: boolean
  bgAudioSource?: string
  bgAudioSmoothing?: number
  bgAudioEasing?: string
  bgAudioBeatBoost?: number
  bgAudioPhase?: number
  bgAudioGain?: number
  bgEffects?: Record<string, unknown>
  elements?: unknown
}

/** Vollständiger Hintergrund-Snapshot (applyBackgroundSnapshot) */
export interface BackgroundPresetSnapshot {
  backgroundImage: unknown
  backgroundVideo: unknown
  backgroundColor: string
  backgroundOpacity: number
  gradientEnabled: boolean
  gradientColor2: string
  gradientType: string
  gradientAngle: number
  bgAudioEnabled: boolean
  bgAudioSource: string
  bgAudioSmoothing: number
  bgAudioEasing: string
  bgAudioBeatBoost: number
  bgAudioPhase: number
  bgAudioGain: number
  bgEffects: Record<string, unknown>
  elements: unknown
}

export interface BackgroundPresetOption {
  key: string
  label: string
  snapshot: BackgroundPresetSnapshot
}

// Gespeicherte Canvas-/Hintergrund-Presets (aus dem Canvas-Panel, PresetsSection)
const USER_CANVAS_PRESETS_KEY = 'visualizer-canvas-presets'

/**
 * Wandelt einen eingebauten Preset-Hintergrund ({color, opacity, ...}) in einen
 * vollständigen Hintergrund-Snapshot um, wie ihn applyBackgroundSnapshot erwartet.
 */
function builtinToSnapshot(bg: BuiltinBackground = {}): BackgroundPresetSnapshot {
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
    bgAudioEasing: 'linear',
    bgAudioBeatBoost: 1.0,
    bgAudioPhase: 0,
    bgAudioGain: 1.0,
    bgEffects: {},
    // Eingebaute Vorlagen haben keine Vordergrund-Elemente.
    elements: null,
  }
}

/**
 * Wandelt ein gespeichertes Canvas-Preset in einen Hintergrund-Snapshot um.
 * Diese Presets enthalten bereits die Audio-Reaktiven Einstellungen.
 */
function userPresetToSnapshot(p: UserCanvasPreset = {}): BackgroundPresetSnapshot {
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
    // Erweiterte Master-Einstellungen (neuere Presets; alte haben sie nicht)
    bgAudioEasing: p.bgAudioEasing || 'linear',
    bgAudioBeatBoost: p.bgAudioBeatBoost ?? 1.0,
    bgAudioPhase: p.bgAudioPhase ?? 0,
    bgAudioGain: p.bgAudioGain ?? 1.0,
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
export function loadUserCanvasPresets(): UserCanvasPreset[] {
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
export function getBackgroundPresetOptions(): {
  user: BackgroundPresetOption[]
  builtin: BackgroundPresetOption[]
} {
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
export function resolveBackgroundPreset(
  key: string | null | undefined,
): BackgroundPresetOption | null {
  if (!key) return null
  const { user, builtin } = getBackgroundPresetOptions()
  return [...user, ...builtin].find((o) => o.key === key) || null
}
