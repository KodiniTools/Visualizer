/**
 * Gesamtdauer eines Beat-Drop-Markers aus der Anzeigedauer seiner Elemente.
 *
 * Ein Marker blendet Elemente ein (Text, platziertes Bild, Hintergrund-Bild,
 * Video, Form). Jedes Element ist entweder **begrenzt** sichtbar – seine
 * Animation blendet es nach Verzögerung + Einblenden + Anzeigedauer +
 * Ausblenden aus – oder **dauerhaft**, bis ein anderer Marker es ablöst.
 * Die Gesamtdauer des Markers ist das längste begrenzte Element.
 *
 * Die Zyklen entsprechen `textManager/animation/displayOpacity.ts` und
 * `timeline.ts`: Ein Element ist begrenzt, sobald mindestens ein aktiver
 * Effekt „Permanent anzeigen“ aus hat und nicht in Schleife läuft. Die
 * 0,5 s Sicherheits-Ausblenden nach dem Zyklus zählen nicht mit.
 *
 * Reine Funktionen ohne Vue-Abhängigkeit (Einheiten: Animationen in ms,
 * Formen und Ergebnis in Sekunden).
 *
 * @module markerDuration
 */
import type { TextAnimation, TimedTextAnimation } from './textManager/types'
import type { ImageTimedAnimation } from './canvasObjects/imageAnimation'
import { normalizeShapeAnimation } from './shapes/shapeAnimation'

/** Defaults wie in timeline.ts / displayOpacity.ts */
const DEFAULT_DISPLAY_DURATION_MS = 5000
const DEFAULT_DURATION_MS = 1000
const DEFAULT_TYPEWRITER_SPEED_MS = 50

/** Art eines Marker-Elements */
export type MarkerElementKind = 'text' | 'image' | 'backgroundImage' | 'video' | 'shape'

/** Anzeigedauer eines Elements; `seconds === null` = dauerhaft */
export interface MarkerElementDuration {
  kind: MarkerElementKind
  seconds: number | null
}

/** Zusammenfassung eines Markers */
export interface MarkerDurationSummary {
  /** Längste begrenzte Anzeigedauer in s (null = kein begrenztes Element) */
  seconds: number | null
  /** Mindestens ein Element bleibt dauerhaft sichtbar */
  hasPermanent: boolean
  /** Anzahl berücksichtigter Elemente */
  count: number
}

/** Begrenzt: aktiv, „Permanent anzeigen“ aus, keine Schleife */
const isTimed = (cfg: TimedTextAnimation | null | undefined): cfg is TimedTextAnimation =>
  !!cfg?.enabled && cfg.permanent === false && !cfg.loop

const finite = (n: unknown, fallback: number): number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : fallback

/**
 * Ende eines begrenzten Effekts ab dem Auslösen (ms): Start-Verzögerung +
 * Einblenden + Anzeigedauer + Ausblenden („Aus“ hat keinen Eingang).
 */
export function timedEffectEndMs(cfg: TimedTextAnimation): number {
  const delay = finite(cfg.startDelay, 0)
  const duration = finite(cfg.duration || DEFAULT_DURATION_MS, DEFAULT_DURATION_MS)
  const display = finite(cfg.displayDuration ?? DEFAULT_DISPLAY_DURATION_MS, 0)
  const cycle = cfg.direction === 'out' ? duration + display : duration * 2 + display
  return delay + cycle
}

/**
 * Anzeigedauer (s) aus Fade/Scale/Slide (+ optional Schreibmaschine).
 * null = keine begrenzte Animation → Element bleibt dauerhaft sichtbar.
 *
 * @param effects - Effekt-Einstellungen (inaktive/fehlende werden ignoriert)
 * @param typewriter - Schreibmaschine mit Zeichenanzahl des Textes
 */
export function animationDisplaySeconds(
  effects: (TimedTextAnimation | null | undefined)[],
  typewriter?: { cfg: TextAnimation['typewriter']; chars: number } | null,
): number | null {
  let maxMs: number | null = null
  for (const cfg of effects) {
    if (!isTimed(cfg)) continue
    const end = timedEffectEndMs(cfg)
    if (maxMs === null || end > maxMs) maxMs = end
  }
  const tw = typewriter?.cfg
  if (isTimed(tw)) {
    // Tippen (Zeichen × Geschwindigkeit) + Anzeigedauer, kein eigener Ausgang
    const typing = Math.max(0, typewriter?.chars ?? 0) * (tw.speed || DEFAULT_TYPEWRITER_SPEED_MS)
    const end =
      finite(tw.startDelay, 0) +
      typing +
      finite(tw.displayDuration ?? DEFAULT_DISPLAY_DURATION_MS, 0)
    if (maxMs === null || end > maxMs) maxMs = end
  }
  return maxMs === null ? null : maxMs / 1000
}

/** Text: Animation + Inhalt (für die Schreibmaschine) */
export function textDisplaySeconds(
  text: { content?: string | null; animation?: TextAnimation | null } | null | undefined,
): number | null {
  const a = text?.animation
  if (!a) return null
  return animationDisplaySeconds([a.fade, a.scale, a.slide], {
    cfg: a.typewriter,
    chars: (text?.content || '').length,
  })
}

/** Platziertes Bild oder Hintergrund-Bild mit `timedAnimation` */
export function imageDisplaySeconds(anim: ImageTimedAnimation | null | undefined): number | null {
  if (!anim) return null
  return animationDisplaySeconds([anim.fade, anim.scale, anim.slide])
}

/**
 * Form: Nur „Ausblenden“ (fadeOut) beendet die Anzeige nach Verzögerung +
 * Dauer; alle anderen Animationen lassen die Form stehen.
 */
export function shapeDisplaySeconds(animation: unknown): number | null {
  const anim = normalizeShapeAnimation(animation)
  if (!anim || anim.type !== 'fadeOut') return null
  return anim.delay + anim.duration
}

/**
 * Marker-Video: einmal abgespielt endet es nach seiner Länge; in Schleife
 * (Standard) oder mit unbekannter Länge bleibt es dauerhaft.
 */
export function videoDisplaySeconds(loop: boolean, durationSeconds: unknown): number | null {
  if (loop) return null
  return typeof durationSeconds === 'number' &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0
    ? durationSeconds
    : null
}

/** Längste begrenzte Dauer + ob Elemente dauerhaft bleiben */
export function summarizeMarkerDuration(elements: MarkerElementDuration[]): MarkerDurationSummary {
  let seconds: number | null = null
  let hasPermanent = false
  for (const el of elements) {
    if (el.seconds === null) hasPermanent = true
    else if (seconds === null || el.seconds > seconds) seconds = el.seconds
  }
  return { seconds, hasPermanent, count: elements.length }
}
