/**
 * Text-Liste: einheitliche Anzeigedauer beim Abspielen aller Texte
 * (dauerhaft gespeichert, beim Laden geprüft).
 */
export const TEXT_SEQUENCE_KEY = 'visualizer-text-sequence'
export const TEXT_SEQUENCE_DEFAULTS = Object.freeze({ enabled: false, duration: 5000 })

const clampDuration = (v) => Math.min(30000, Math.max(500, v))

export function loadTextSequenceSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(TEXT_SEQUENCE_KEY) || 'null')
    return {
      enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : TEXT_SEQUENCE_DEFAULTS.enabled,
      duration: Number.isFinite(raw?.duration)
        ? clampDuration(raw.duration)
        : TEXT_SEQUENCE_DEFAULTS.duration,
    }
  } catch {
    return { ...TEXT_SEQUENCE_DEFAULTS }
  }
}

export function saveTextSequenceSettings({ enabled, duration }) {
  try {
    const d = Number(duration)
    localStorage.setItem(
      TEXT_SEQUENCE_KEY,
      JSON.stringify({
        enabled: !!enabled,
        duration: Number.isFinite(d) ? clampDuration(d) : TEXT_SEQUENCE_DEFAULTS.duration,
      }),
    )
    return true
  } catch {
    return false // Speicher nicht verfügbar – gilt nur für diese Sitzung
  }
}
