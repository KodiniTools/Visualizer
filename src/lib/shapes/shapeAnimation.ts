/**
 * Zeitgesteuerte Animationen für Formen & Symbole (Pulsieren, Ein-/Ausblenden,
 * Blinken, Drehen, Pendeln, Hüpfen, Schweben, Wackeln, Einblenden, Ausblenden,
 * Hereinzoomen).
 *
 * Konfiguration: `shape.animation = { type, duration, intensity, delay }` –
 * Teil der Form (Verlauf, Duplizieren, Presets). Der Startzeitpunkt ist reiner
 * Laufzeit-Zustand im shapeStore (`getAnimationElapsed`), damit Undo/Redo und
 * Snapshots unberührt bleiben.
 *
 * Zwei Arten:
 * - **Schleifen** (pulse, fade, blink, rotate, swing, bounce, float, shake)
 *   wiederholen sich alle `duration` Sekunden.
 * - **Einmalig** (fadeIn, fadeOut, zoomIn) laufen nach `delay` Sekunden einmal
 *   ab und bleiben dann im Endzustand. Sie starten neu, wenn die Wiedergabe am
 *   Anfang beginnt, ein Beat-Marker die Form einblendet oder die Animation im
 *   Panel geändert wird.
 *
 * Gezeichnet wird über `drawShapeAnimated()` – eine Hülle um drawShape(), die
 * sich mit Audio-Reaktiv kombinieren lässt (drawShapeWithAudio(..., draw)).
 *
 * @module shapes/shapeAnimation
 */
import { DISPLAY_DURATION_MAX_S } from '../displayDuration'
import { applyEasing } from '../textManager/animation/easing'
import { SHAPE_KIND, drawShape, getShapeKind, type Shape } from './shapes'

export const SHAPE_ANIMATION_TYPES = Object.freeze([
  'none',
  'pulse',
  'fade',
  'blink',
  'rotate',
  'swing',
  'bounce',
  'float',
  'shake',
  'fadeIn',
  'fadeOut',
  'zoomIn',
] as const)

export type ShapeAnimationType = (typeof SHAPE_ANIMATION_TYPES)[number]

/** Animationen, die einmal ablaufen und im Endzustand bleiben */
export const SHAPE_ANIMATION_ONE_SHOT: readonly ShapeAnimationType[] = Object.freeze([
  'fadeIn',
  'fadeOut',
  'zoomIn',
])

/** Animationen ohne Stärke-Regler (immer volle Wirkung) */
export const SHAPE_ANIMATION_NO_INTENSITY: readonly ShapeAnimationType[] = Object.freeze([
  'rotate',
  'fadeIn',
  'fadeOut',
  'zoomIn',
])

export interface ShapeAnimation {
  type: ShapeAnimationType
  /** Sekunden je Durchlauf (Schleifen) bzw. Dauer (einmalig) */
  duration: number
  /** Stärke 0–100 % */
  intensity: number
  /** Verzögerung in Sekunden (nur einmalige Animationen) */
  delay: number
}

export const SHAPE_ANIMATION_LIMITS = Object.freeze({
  duration: { min: 0.2, max: 10, step: 0.1 },
  intensity: { min: 0, max: 100, step: 1 },
  delay: { min: 0, max: DISPLAY_DURATION_MAX_S, step: 0.1 },
})

/** Startwerte je Animation (Dauer in Sekunden, Stärke in %) */
export const SHAPE_ANIMATION_DEFAULTS: Readonly<
  Record<Exclude<ShapeAnimationType, 'none'>, { duration: number; intensity: number }>
> = Object.freeze({
  pulse: { duration: 1, intensity: 40 },
  fade: { duration: 2, intensity: 100 },
  blink: { duration: 1, intensity: 100 },
  rotate: { duration: 4, intensity: 100 },
  swing: { duration: 2, intensity: 50 },
  bounce: { duration: 1, intensity: 50 },
  float: { duration: 3, intensity: 40 },
  shake: { duration: 0.5, intensity: 40 },
  fadeIn: { duration: 1, intensity: 100 },
  fadeOut: { duration: 1, intensity: 100 },
  zoomIn: { duration: 0.8, intensity: 100 },
})

/** Wirkung eines Animations-Frames (neutral: scale 1, opacity 1, sonst 0) */
export interface ShapeAnimationFx {
  /** Skalierung um den Mittelpunkt */
  scale: number
  /** Faktor auf die Deckkraft der Form, 0–1 */
  opacity: number
  /** zusätzliche Drehung in Grad */
  rotation: number
  /** Versatz in Canvas-Pixeln */
  dx: number
  dy: number
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const num = (v: unknown, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const isType = (v: unknown): v is ShapeAnimationType =>
  (SHAPE_ANIMATION_TYPES as readonly unknown[]).includes(v)

/** Formen mit Animation: alle außer Effekt-Bereichen (wie Audio-Reaktiv). */
export function supportsShapeAnimation(shape: Pick<Shape, 'type'> | null | undefined): boolean {
  return !!shape && getShapeKind(shape.type) !== SHAPE_KIND.EFFECT
}

export function isOneShotAnimation(type: unknown): boolean {
  return (SHAPE_ANIMATION_ONE_SHOT as readonly unknown[]).includes(type)
}

/** Neue Konfiguration mit den Startwerten der Animation. */
export function createShapeAnimation(type: ShapeAnimationType): ShapeAnimation | null {
  if (type === 'none' || !isType(type)) return null
  const d = SHAPE_ANIMATION_DEFAULTS[type]
  return { type, duration: d.duration, intensity: d.intensity, delay: 0 }
}

/**
 * Prüft und begrenzt eine (evtl. alte/fremde) Konfiguration.
 * @returns gültige Konfiguration oder null (keine Animation)
 */
export function normalizeShapeAnimation(raw: unknown): ShapeAnimation | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isType(r.type) || r.type === 'none') return null
  const d = SHAPE_ANIMATION_DEFAULTS[r.type]
  const L = SHAPE_ANIMATION_LIMITS
  return {
    type: r.type,
    duration: clamp(num(r.duration, d.duration), L.duration.min, L.duration.max),
    intensity: clamp(num(r.intensity, d.intensity), L.intensity.min, L.intensity.max),
    delay: clamp(num(r.delay, 0), L.delay.min, L.delay.max),
  }
}

/**
 * Wirkung der Animation nach `elapsedMs` Millisekunden seit dem Start.
 * @param raw - shape.animation
 * @param elapsedMs - Zeit seit Start (≥ 0)
 * @param size - Größe der Form (für Bewegungen relativ zur Form)
 * @returns Wirkung oder null (keine Animation)
 */
export function getShapeAnimationFx(
  raw: unknown,
  elapsedMs: number,
  size: { width: number; height: number },
): ShapeAnimationFx | null {
  const anim = normalizeShapeAnimation(raw)
  if (!anim) return null
  const fx: ShapeAnimationFx = { scale: 1, opacity: 1, rotation: 0, dx: 0, dy: 0 }
  const t = Math.max(0, num(elapsedMs, 0)) / 1000
  const duration = anim.duration
  const k = anim.intensity / 100
  const w = Math.abs(num(size?.width, 0))
  const h = Math.abs(num(size?.height, 0))

  if (isOneShotAnimation(anim.type)) {
    const p = clamp((t - anim.delay) / duration, 0, 1)
    const eased = applyEasing(p, 'easeOut')
    if (anim.type === 'fadeIn') fx.opacity = eased
    else if (anim.type === 'fadeOut') fx.opacity = 1 - eased
    else fx.scale = eased // zoomIn
    return fx
  }

  // Phase 0–1 innerhalb des aktuellen Durchlaufs
  const phase = (t / duration) % 1
  const wave = Math.sin(2 * Math.PI * phase) // −1 … 1, Start bei 0
  const swell = (1 - Math.cos(2 * Math.PI * phase)) / 2 // 0 → 1 → 0, Start bei 0

  switch (anim.type) {
    case 'pulse':
      fx.scale = 1 + k * 0.5 * swell
      break
    case 'fade':
      fx.opacity = 1 - k * swell
      break
    case 'blink':
      fx.opacity = phase < 0.5 ? 1 : 1 - k
      break
    case 'rotate':
      fx.rotation = phase * 360
      break
    case 'swing':
      fx.rotation = wave * 45 * k
      break
    case 'bounce':
      // nach oben, Aufprall unten (|sin| ergibt den Bogen)
      fx.dy = -Math.abs(Math.sin(Math.PI * phase)) * h * 0.5 * k
      break
    case 'float':
      fx.dy = wave * h * 0.2 * k
      break
    case 'shake':
      // drei Ausschläge je Durchlauf
      fx.dx = Math.sin(6 * Math.PI * phase) * w * 0.08 * k
      break
    default:
      return null
  }
  return fx
}

/** true, wenn die Wirkung nichts verändert */
export function isNeutralAnimationFx(fx: ShapeAnimationFx | null | undefined): boolean {
  return (
    !fx || (fx.scale === 1 && fx.opacity === 1 && fx.rotation === 0 && fx.dx === 0 && fx.dy === 0)
  )
}

/**
 * Zeichnet eine Form mit der Wirkung eines Animations-Frames. Drehung und
 * Deckkraft wirken über die Felder der Form (gleiche Mitte wie drawShape),
 * Skalierung und Versatz als Transformation um den Mittelpunkt.
 */
export function drawShapeAnimated(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  fx: ShapeAnimationFx | null | undefined,
  draw: (ctx: CanvasRenderingContext2D, shape: Shape) => void = drawShape,
): void {
  if (!fx || isNeutralAnimationFx(fx) || !supportsShapeAnimation(shape)) {
    draw(ctx, shape)
    return
  }
  const opacity = clamp(fx.opacity, 0, 1)
  if (opacity <= 0 || fx.scale <= 0) return

  const target: Shape =
    opacity !== 1 || fx.rotation !== 0
      ? {
          ...shape,
          opacity: (shape.opacity ?? 100) * opacity,
          rotation: (shape.rotation || 0) + fx.rotation,
        }
      : shape

  const transformed = fx.scale !== 1 || fx.dx !== 0 || fx.dy !== 0
  if (!transformed) {
    draw(ctx, target)
    return
  }
  ctx.save()
  ctx.translate(shape.x + fx.dx, shape.y + fx.dy)
  if (fx.scale !== 1) ctx.scale(fx.scale, fx.scale)
  ctx.translate(-shape.x, -shape.y)
  draw(ctx, target)
  ctx.restore()
}
