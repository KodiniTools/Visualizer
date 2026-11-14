/**
 * Zeitgesteuerte Animationen für Canvas-Bilder – dieselben Effekte wie bei
 * Texten (Fade, Scale, Slide mit Richtung, Dauer, Verzögerung, Easing, Loop,
 * Anzeigedauer).
 *
 * Die Berechnung kommt unverändert aus `textManager/animation/*`
 * (resolveTimeline, getDisplayOpacity); hier wird nur der Fortschritt auf
 * den Bild-Transform abgebildet.
 *
 * - Einstellungen: `image.timedAnimation` (serialisierbar, Verlauf/Presets)
 * - Laufzeit-Zustand (Startzeiten): WeakMap je Bild-Objekt, damit er weder
 *   im Verlauf noch in Presets landet und Undo eine laufende Animation nicht
 *   neu startet. Schlüssel ist immer das rohe Objekt (`toRaw`): Die Manager
 *   liegen in Vue-Refs, der Render-Loop sieht also reaktive Proxys, das Panel
 *   je nach Weg Proxy oder Rohobjekt – beide müssen denselben Zustand treffen.
 *
 * @module canvasObjects/imageAnimation
 */
import { toRaw } from 'vue'
import { resolveTimeline, timelineStartForElapsed } from '../textManager/animation/timeline'
import { getDisplayOpacity } from '../textManager/animation/displayOpacity'
import { defaultTextSettings } from '../textDefaults'
import type {
  ScaleAnimation,
  SlideAnimation,
  TextAnimation,
  TextObject,
  TimedTextAnimation,
  TimelineStateKey,
} from '../textManager/types'

/** Effekte, die Bilder von den Texten übernehmen (ohne Schreibmaschine) */
export const IMAGE_ANIMATION_KEYS = ['fade', 'scale', 'slide'] as const
export type ImageAnimationKey = (typeof IMAGE_ANIMATION_KEYS)[number]

/** Einstellungen der Bild-Animationen (gleiche Felder wie bei Texten) */
export interface ImageTimedAnimation {
  fade: TimedTextAnimation
  scale: ScaleAnimation
  slide: SlideAnimation
}

/** Objekt, das Bild-Animationen tragen kann */
export interface ImageAnimationTarget {
  timedAnimation?: ImageTimedAnimation | null
}

/** Anteil der Bild-Animation am Zeichen-Transform */
export interface ImageAnimationTransform {
  opacity: number
  translateX: number
  translateY: number
  scale: number
}

const STATE_KEYS: Record<ImageAnimationKey, TimelineStateKey> = {
  fade: 'fadeStartTime',
  scale: 'scaleStartTime',
  slide: 'slideStartTime',
}

const NEUTRAL: Readonly<ImageAnimationTransform> = Object.freeze({
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scale: 1,
})

/**
 * Laufzeit-Hülle je Bild: trägt `_state` und verweist bei jedem Frame auf
 * die aktuellen Einstellungen, damit die Text-Funktionen sie lesen können.
 */
const runtime = new WeakMap<object, TextAnimation>()

function holderOf(target: object): TextAnimation {
  const key = toRaw(target)
  let holder = runtime.get(key)
  if (!holder) {
    holder = { _state: { startTime: null, isPlaying: false, currentIndex: 0 } }
    runtime.set(key, holder)
  }
  return holder
}

/** Neue Einstellungen mit den Text-Standardwerten (alle Effekte aus). */
export function createImageAnimation(): ImageTimedAnimation {
  const base = defaultTextSettings()
  return {
    fade: { ...base.fade },
    scale: { ...base.scale },
    slide: { ...base.slide },
  }
}

/**
 * Tiefe Kopie; fehlende Effekte oder Felder bekommen die Standardwerte.
 * Unbekannte Eingaben (null, kein Objekt) ergeben die Standardwerte.
 */
export function cloneImageAnimation(source: unknown): ImageTimedAnimation {
  const out = createImageAnimation()
  if (!source || typeof source !== 'object') return out
  const src = source as Partial<Record<ImageAnimationKey, unknown>>
  for (const key of IMAGE_ANIMATION_KEYS) {
    const eff = src[key]
    if (eff && typeof eff === 'object') Object.assign(out[key], eff)
  }
  return out
}

/** true, wenn mindestens ein Effekt aktiv ist */
export function hasImageAnimation(cfg: ImageTimedAnimation | null | undefined): boolean {
  return Boolean(cfg && IMAGE_ANIMATION_KEYS.some((key) => cfg[key]?.enabled))
}

/**
 * Startet einen Effekt (oder ohne `key` alle) beim nächsten Frame neu.
 */
export function restartImageAnimation(
  target: object | null | undefined,
  key?: ImageAnimationKey,
): void {
  if (!target) return
  const state = holderOf(target)._state
  if (!state) return
  const keys = key ? [key] : IMAGE_ANIMATION_KEYS
  for (const k of keys) state[STATE_KEYS[k]] = null
}

/**
 * Übernimmt Animations-Einstellungen (z. B. „Animation beim Hinzufügen“) als
 * eigene Kopie in ein vorhandenes Bild und startet sie von vorn, damit das
 * Ergebnis sofort zu sehen ist. Spätere Änderungen an `source` wirken nicht
 * mehr auf das Bild.
 *
 * @param target Canvas-Bild oder Bild-Hintergrund
 * @param source Einstellungen; ungültig → Standardwerte (alle Effekte aus)
 */
export function applyImageAnimation(
  target: ImageAnimationTarget | null | undefined,
  source: unknown,
): void {
  if (!target) return
  target.timedAnimation = cloneImageAnimation(source)
  restartImageAnimation(target)
}

/**
 * Setzt die aktiven Effekte so, als liefen sie seit `elapsedMs` (Spulen zu
 * einer Stelle, an der ein Beat-Marker das Bild vor `elapsedMs` eingeblendet
 * hat). Inaktive Effekte bleiben unberührt.
 *
 * @param target Bild mit `timedAnimation`
 * @param elapsedMs Zeit seit dem Auslösen in ms
 * @param now Bezugszeitpunkt in ms (wie beim Zeichnen)
 */
export function seekImageAnimation(
  target: ImageAnimationTarget | null | undefined,
  elapsedMs: number,
  now = Date.now(),
): void {
  const cfg = target?.timedAnimation
  if (!target || !cfg || !hasImageAnimation(cfg)) return
  const state = holderOf(target)._state
  if (!state) return
  for (const key of IMAGE_ANIMATION_KEYS) {
    if (cfg[key]?.enabled)
      state[STATE_KEYS[key]] = timelineStartForElapsed(cfg[key], elapsedMs, now)
  }
}

/**
 * Transform der Bild-Animationen zum Zeitpunkt `now`.
 *
 * Abbildung wie bei Texten: Fade → Deckkraft, Scale → Faktor um die
 * Bildmitte, Slide → Versatz in % der Canvas-Breite/-Höhe. Nach Ablauf
 * einer begrenzten Anzeigedauer blendet `getDisplayOpacity` aus.
 *
 * @param target Bild mit `timedAnimation`
 * @param canvas Bezug für den Slide-Versatz
 * @param now Zeitstempel in ms
 */
export function getImageAnimationTransform(
  target: ImageAnimationTarget | null | undefined,
  canvas: { width: number; height: number },
  now = Date.now(),
): ImageAnimationTransform {
  const cfg = target?.timedAnimation
  if (!target || !hasImageAnimation(cfg)) return { ...NEUTRAL }
  const config = cfg as ImageTimedAnimation

  const holder = holderOf(target)
  holder.fade = config.fade
  holder.scale = config.scale
  holder.slide = config.slide

  const out = { ...NEUTRAL }

  if (config.fade.enabled) {
    out.opacity *= resolveTimeline(holder, config.fade, STATE_KEYS.fade, now).p
  }

  if (config.scale.enabled) {
    const { p } = resolveTimeline(holder, config.scale, STATE_KEYS.scale, now)
    const start = config.scale.startScale ?? 0
    const end = config.scale.endScale ?? 1
    out.scale = start + (end - start) * p
  }

  if (config.slide.enabled) {
    const { p } = resolveTimeline(holder, config.slide, STATE_KEYS.slide, now)
    if (p !== 1) {
      const dist = (config.slide.distance || 100) / 100
      const rest = 1 - p
      switch (config.slide.from) {
        case 'left':
          out.translateX = -canvas.width * dist * rest
          break
        case 'right':
          out.translateX = canvas.width * dist * rest
          break
        case 'top':
          out.translateY = -canvas.height * dist * rest
          break
        case 'bottom':
          out.translateY = canvas.height * dist * rest
          break
      }
    }
  }

  // Begrenzte Anzeigedauer (permanent = false): danach ausblenden
  out.opacity *= getDisplayOpacity({ content: '', animation: holder } as unknown as TextObject, now)

  return out
}
