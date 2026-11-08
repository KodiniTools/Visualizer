/**
 * Audio-Reaktiv für Formen & Symbole: dieselbe Konfiguration, dieselben
 * Presets und dieselbe Effekt-Engine wie bei Canvas-Bildern
 * (`fotoSettings.audioReactive`, multiImageManager). Die Form wird dazu um
 * ihren Mittelpunkt transformiert; Farb-/Filter-Effekte laufen über ctx.filter.
 *
 * Bild-Effekte, die eine Bildfläche voraussetzen (Rahmen, Chromatik,
 * Vignette), entfallen bei Formen.
 */
import {
  EFFECT_NAMES,
  calculateEffectValue,
  type EffectValues,
} from '../audio/AudioReactiveEffects'
import {
  computeAudioReactiveValues,
  type EffectCalculator,
  type EngineAudioSettings,
} from '../audio/audioReactiveEngine'
import {
  createAudioReactiveConfig,
  ensureAudioReactiveConfig,
  type AudioReactiveConfig,
} from '../audio/audioReactiveConfig'
import type { AudioLevelData } from '../audio/AudioLevelCalculator'
import {
  applyAudioFilters,
  applyAudioGeometry,
  applyBaseTransforms,
  transformAround,
} from '../multiImage/drawSteps.js'
import { SHAPE_KIND, drawShape, getShapeKind, type Shape } from './shapes'

/** Effektwerte je aktivem Effekt */
export type ShapeAudioFx = Record<string, EffectValues>

/** Bild-Effekte ohne Entsprechung bei Formen */
export const SHAPE_UNSUPPORTED_EFFECTS: readonly string[] = Object.freeze([
  'border',
  'chromatic',
  'vignettePulse',
])

/** Effekte, die Formen anbieten (Reihenfolge wie bei Bildern) */
export const SHAPE_EFFECT_NAMES: readonly string[] = Object.freeze(
  EFFECT_NAMES.filter((name) => !SHAPE_UNSUPPORTED_EFFECTS.includes(name)),
)

/**
 * Audio-Reaktiv ist für alle Formen außer Effekt-Bereichen (Weichzeichnen,
 * Verpixeln) möglich – diese lesen den Canvas darunter und bleiben statisch.
 * @param {object|null} shape
 */
export function supportsShapeAudio(shape: Pick<Shape, 'type'> | null | undefined): boolean {
  return !!shape && getShapeKind(shape.type) !== SHAPE_KIND.EFFECT
}

/** Frische Konfiguration (alles aus) */
export function createShapeAudioReactive(): AudioReactiveConfig {
  return createAudioReactiveConfig(SHAPE_EFFECT_NAMES)
}

/**
 * Vervollständigt eine (evtl. fehlende/alte) Konfiguration in-place.
 * @returns {object} die Konfiguration
 */
export function ensureShapeAudioReactive(ar: unknown): AudioReactiveConfig {
  return ensureAudioReactiveConfig(ar, SHAPE_EFFECT_NAMES)
}

// Wie bei Bildern: freqSplit liest Bass/Höhen selbst aus, die Intensität
// skaliert nur die Amplitude (siehe multiImageManager.getAudioReactiveValues).
const calculateShapeEffect: EffectCalculator<EffectValues> = (name, level, config) =>
  name === 'freqSplit'
    ? calculateEffectValue(name, (config?.intensity || 80) / 100)
    : calculateEffectValue(name, level)

/**
 * Effektwerte der aktivierten Effekte einer Form (null = keine).
 * @param {object|null|undefined} ar - shape.audioReactive
 * @param {object|null|undefined} audioData - getAudioAnalysisData()
 * @returns {Record<string, object>|null}
 */
export function getShapeAudioFx(
  ar: EngineAudioSettings | null | undefined,
  audioData: AudioLevelData | null | undefined,
): ShapeAudioFx | null {
  if (!ar?.enabled) return null
  const values = computeAudioReactiveValues(ar, ar, audioData, calculateShapeEffect)
  return values?.hasEffects ? values.effects : null
}

/**
 * Zeichnet eine Form mit audio-reaktiven Effekten. Ohne Effekte identisch zu
 * drawShape(). Reihenfolge wie bei Bildern: Filter/Glow → Rotation/Beat-Flip →
 * Bewegung, Verzerrung, Strobe, Pulsieren.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} shape
 * @param {Record<string, object>|null} fx - Ergebnis von getShapeAudioFx()
 * @param {(ctx: CanvasRenderingContext2D, shape: object) => void} [draw]
 */
export function drawShapeWithAudio(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  fx: ShapeAudioFx | null | undefined,
  draw: (ctx: CanvasRenderingContext2D, shape: Shape) => void = drawShape,
): void {
  if (!fx || !supportsShapeAudio(shape)) {
    draw(ctx, shape)
    return
  }
  const width = Math.max(Math.abs(shape.width) || 0, 0.01)
  const height = Math.max(Math.abs(shape.height) || 0, 0.01)
  const bounds = { x: shape.x - width / 2, y: shape.y - height / 2, width, height }

  ctx.save()
  applyAudioFilters(ctx, fx)
  applyBaseTransforms(ctx, bounds, { transition: null, fotoSettings: null, fx })
  const moved = applyAudioGeometry(ctx, bounds, fx)

  // Bewegung und Pulsieren als Transformation um den Mittelpunkt – so gilt
  // beides für jede Formart (auch Linien, Freihand-Striche und Emojis).
  const dx = moved.x + moved.width / 2 - shape.x
  const dy = moved.y + moved.height / 2 - shape.y
  if (dx !== 0 || dy !== 0) ctx.translate(dx, dy)
  const scale = moved.width / width
  if (Number.isFinite(scale) && scale !== 1) {
    transformAround(ctx, shape.x, shape.y, () => ctx.scale(scale, scale))
  }

  // drawShape setzt globalAlpha aus der Deckkraft der Form → Strobe dort einrechnen
  const strobe = fx.strobe?.strobeOpacity
  const target =
    typeof strobe === 'number' && strobe !== 1
      ? { ...shape, opacity: (shape.opacity ?? 100) * Math.max(0, Math.min(1, strobe)) }
      : shape
  draw(ctx, target)
  ctx.restore()
}
