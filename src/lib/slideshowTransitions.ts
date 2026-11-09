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
/** Zustand eines Bildes während einer Überblendung */
export interface TransitionState {
  opacity: number
  /** Versatz in Bildbreiten */
  translateX: number
  /** Versatz in Bildhöhen */
  translateY: number
  scale: number
  scaleX: number
  /** Grad */
  rotation: number
  /** px */
  blur: number
  /** sichtbarer Bereich (0–1) beim Wischen */
  wipe: { start: number; end: number } | null
}

/** Relative Bild-Bounds */
export interface RelBounds {
  relX: number
  relY: number
  relWidth: number
  relHeight: number
}

export const SLIDESHOW_TRANSITIONS: readonly { id: string; icon: string }[] = Object.freeze([
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
export function isValidTransition(id: unknown): id is string {
  return typeof id === 'string' && TRANSITION_IDS.has(id)
}

/**
 * Übergang eines Bildes: eigener Wert, sonst der globale, sonst Überblenden.
 * @param {{ transition?: string }|null|undefined} imageConfig
 * @param {string} [fallback]
 * @returns {string}
 */
export function resolveTransition(
  imageConfig: { transition?: unknown } | null | undefined,
  fallback?: unknown,
): string {
  const transition = imageConfig?.transition
  if (isValidTransition(transition)) return transition
  return isValidTransition(fallback) ? fallback : SLIDESHOW_TRANSITION_DEFAULT
}

const NEUTRAL: Readonly<TransitionState> = Object.freeze({
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scale: 1,
  scaleX: 1,
  rotation: 0,
  blur: 0,
  wipe: null,
})

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp01(v: unknown): number {
  return Math.max(0, Math.min(1, typeof v === 'number' && Number.isFinite(v) ? v : 0))
}

/**
 * Zustand eines Bildes während eines Übergangs.
 * @param {string} type - Übergangs-ID
 * @param {'in'|'display'|'out'} phase
 * @param {number} progress - 0–1 innerhalb der Phase
 * @returns {typeof NEUTRAL}
 */
export function computeTransitionState(
  type: unknown,
  phase: unknown,
  progress: unknown,
): TransitionState {
  if (phase !== 'in' && phase !== 'out') return { ...NEUTRAL }
  const p = clamp01(progress)
  const e = easeInOutCubic(p)
  // „Sichtbarkeit“: rein 0→1, raus 1→0
  const v = phase === 'in' ? e : 1 - e
  const state: TransitionState = { ...NEUTRAL }

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

/**
 * Bereich, in dem ein Bild mit Übergangszustand tatsächlich gezeichnet wird –
 * gleiche Rechnung wie MultiImageManager.drawImages(): Kippen (scaleX) um die
 * Mitte, Verschiebung als Anteil der Bildgröße, Skalierung um die Mitte.
 * Drehung wird nicht berücksichtigt (Rahmen bleibt achsparallel).
 * @param {{ relX:number, relY:number, relWidth:number, relHeight:number }} bounds
 * @param {ReturnType<typeof computeTransitionState>|null|undefined} state
 * @returns {{ relX:number, relY:number, relWidth:number, relHeight:number }} neue Bounds
 */
export function applyTransitionToBounds<B extends RelBounds>(
  bounds: B,
  state: Partial<TransitionState> | null | undefined,
): B {
  const b = { ...bounds }
  if (!state) return b
  const flip = Math.max(
    0.001,
    Math.abs(typeof state.scaleX === 'number' && Number.isFinite(state.scaleX) ? state.scaleX : 1),
  )
  if (flip !== 1) {
    const cx = b.relX + b.relWidth / 2
    b.relWidth *= flip
    b.relX = cx - b.relWidth / 2
  }
  b.relX += (state.translateX || 0) * bounds.relWidth
  b.relY += (state.translateY || 0) * bounds.relHeight
  const scale = typeof state.scale === 'number' && Number.isFinite(state.scale) ? state.scale : 1
  if (scale !== 1) {
    const cx = b.relX + b.relWidth / 2
    const cy = b.relY + b.relHeight / 2
    b.relWidth *= scale
    b.relHeight *= scale
    b.relX = cx - b.relWidth / 2
    b.relY = cy - b.relHeight / 2
  }
  return b
}
