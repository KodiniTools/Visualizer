/**
 * Übergangsanimationen der Slideshow.
 *
 * Jeder Übergang beschreibt das Ein- (phase 'in') und Ausblenden ('out') eines
 * Bildes. Die Dauer kommt aus den Slideshow-Einstellungen (Einblenden/Ausblenden).
 * computeTransitionState() liefert einen reinen Zustand, den MultiImageManager
 * beim Zeichnen anwendet:
 *   opacity    0–1
 *   translateX / translateY  Verschiebung als Anteil der Bildbreite/-höhe
 *   scale      Skalierung (1 = normal)
 *   scaleX     horizontale Skalierung für „Kippen“ (1 = normal)
 *   rotation   Grad
 *   blur       Weichzeichner in px
 *   wipe       sichtbarer Bereich als Anteil der Bildbreite { start, end } oder null
 */

export const SLIDESHOW_TRANSITION_DEFAULT = 'fade'

/** Übergänge für die UI (Reihenfolge = Anzeige), Label per i18n `slideshow.transitions.<id>`. */
export const SLIDESHOW_TRANSITIONS = Object.freeze([
  { id: 'fade', icon: '◐' },
  { id: 'none', icon: '▮' },
  { id: 'slideLeft', icon: '⇠' },
  { id: 'slideRight', icon: '⇢' },
  { id: 'slideUp', icon: '⇡' },
  { id: 'slideDown', icon: '⇣' },
  { id: 'zoomIn', icon: '⊕' },
  { id: 'zoomOut', icon: '⊖' },
  { id: 'blur', icon: '≋' },
  { id: 'rotate', icon: '↻' },
  { id: 'flip', icon: '⇋' },
  { id: 'wipe', icon: '▤' },
])

const TRANSITION_IDS = new Set(SLIDESHOW_TRANSITIONS.map((t) => t.id))

/** @param {unknown} id @returns {boolean} */
export function isValidTransition(id) {
  return typeof id === 'string' && TRANSITION_IDS.has(id)
}

/**
 * Übergang eines Bildes: eigener Wert, sonst der globale, sonst Überblenden.
 * @param {{ transition?: string }|null|undefined} imageConfig
 * @param {string} [fallback]
 * @returns {string}
 */
export function resolveTransition(imageConfig, fallback) {
  if (isValidTransition(imageConfig?.transition)) return imageConfig.transition
  return isValidTransition(fallback) ? fallback : SLIDESHOW_TRANSITION_DEFAULT
}

const NEUTRAL = Object.freeze({
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scale: 1,
  scaleX: 1,
  rotation: 0,
  blur: 0,
  wipe: null,
})

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))
}

/**
 * Zustand eines Bildes während eines Übergangs.
 * @param {string} type - Übergangs-ID
 * @param {'in'|'display'|'out'} phase
 * @param {number} progress - 0–1 innerhalb der Phase
 * @returns {typeof NEUTRAL}
 */
export function computeTransitionState(type, phase, progress) {
  if (phase !== 'in' && phase !== 'out') return { ...NEUTRAL }
  const p = clamp01(progress)
  const e = easeInOutCubic(p)
  // „Sichtbarkeit“: rein 0→1, raus 1→0
  const v = phase === 'in' ? e : 1 - e
  const state = { ...NEUTRAL }

  switch (resolveTransition({ transition: type })) {
    case 'none':
      // Harter Schnitt: sichtbar bis zum Ende der Ausblendphase
      state.opacity = phase === 'out' && p >= 1 ? 0 : 1
      break
    case 'slideLeft':
      // von rechts herein, nach links hinaus
      state.translateX = phase === 'in' ? 1 - e : -e
      break
    case 'slideRight':
      state.translateX = phase === 'in' ? e - 1 : e
      break
    case 'slideUp':
      state.translateY = phase === 'in' ? 1 - e : -e
      break
    case 'slideDown':
      state.translateY = phase === 'in' ? e - 1 : e
      break
    case 'zoomIn':
      // klein → normal, beim Ausblenden weiter vergrößern
      state.opacity = v
      state.scale = phase === 'in' ? 0.5 + 0.5 * e : 1 + 0.5 * e
      break
    case 'zoomOut':
      state.opacity = v
      state.scale = phase === 'in' ? 1.5 - 0.5 * e : 1 - 0.5 * e
      break
    case 'blur':
      state.opacity = v
      state.blur = 20 * (1 - v)
      break
    case 'rotate':
      state.opacity = v
      state.rotation = phase === 'in' ? -90 * (1 - e) : 90 * e
      state.scale = 0.6 + 0.4 * v
      break
    case 'flip':
      // Kartendreh um die senkrechte Achse
      state.scaleX = Math.max(0.001, v)
      break
    case 'wipe':
      // von links aufdecken, nach rechts verschwinden
      state.wipe = phase === 'in' ? { start: 0, end: e } : { start: e, end: 1 }
      break
    case 'fade':
    default:
      // linear wie bisher
      state.opacity = phase === 'in' ? p : 1 - p
  }
  return state
}
