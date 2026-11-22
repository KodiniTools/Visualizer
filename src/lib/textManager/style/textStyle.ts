/**
 * Canvas-Style für Text-Objekte: Font, Farbe, Buchstabenabstand, Schatten und
 * Kontur – statisch wie audio-reaktiv.
 *
 * 1:1 aus textManager.js herausgelöst (applyTextStyleForMeasurement,
 * applyTextStyle, resetShadow, _strongestGlow, applyTextStyleWithAudio).
 *
 * @module textManager/style/textStyle
 */
import type { TextAudioReactiveValues, TextEffectMap, TextEffectValues, TextObject } from '../types'

/**
 * ✅ Wendet Text-Stil für MESSUNG an (OHNE Schatten)
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} textObj
 */
export function applyTextStyleForMeasurement(
  ctx: CanvasRenderingContext2D,
  textObj: TextObject,
): void {
  ctx.font = `${textObj.fontStyle} ${textObj.fontWeight} ${textObj.fontSize}px ${textObj.fontFamily}`
  ctx.textAlign = textObj.textAlign
  ctx.textBaseline = textObj.textBaseline

  // letterSpacing für Messung
  if (textObj.letterSpacing !== undefined && textObj.letterSpacing !== 0) {
    ctx.letterSpacing = `${textObj.letterSpacing}px`
  } else {
    ctx.letterSpacing = '0px'
  }

  // Schatten explizit NICHT setzen für saubere Messung
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

/**
 * Wendet Text-Stil auf den Context an (für Zeichnen)
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} textObj
 */
export function applyTextStyle(ctx: CanvasRenderingContext2D, textObj: TextObject): void {
  ctx.font = `${textObj.fontStyle} ${textObj.fontWeight} ${textObj.fontSize}px ${textObj.fontFamily}`
  ctx.fillStyle = textObj.color
  ctx.textAlign = textObj.textAlign
  ctx.textBaseline = textObj.textBaseline

  // ✨ BUCHSTABENABSTAND anwenden
  if (textObj.letterSpacing !== undefined && textObj.letterSpacing !== 0) {
    ctx.letterSpacing = `${textObj.letterSpacing}px`
  } else {
    ctx.letterSpacing = '0px'
  }

  // ✨ SCHATTEN anwenden
  if (textObj.shadow.blur > 0 || textObj.shadow.offsetX !== 0 || textObj.shadow.offsetY !== 0) {
    ctx.shadowColor = textObj.shadow.color
    ctx.shadowBlur = textObj.shadow.blur
    ctx.shadowOffsetX = textObj.shadow.offsetX
    ctx.shadowOffsetY = textObj.shadow.offsetY
  } else {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  // Kontur vorbereiten
  if (textObj.stroke.enabled) {
    ctx.strokeStyle = textObj.stroke.color
    ctx.lineWidth = textObj.stroke.width
    ctx.lineJoin = 'round'
  }
}

/**
 * 🔧 Setzt ALLE Schatten-Eigenschaften explizit zurück
 * Verhindert "Schatten-Lecks" auf nachfolgende Canvas-Elemente
 * @param {CanvasRenderingContext2D} ctx
 */
export function resetShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

/**
 * Stärkstes Leuchten aus allen glow-liefernden Effekten (oder null).
 * @param {object} effects - `audioReactive.effects`
 * @returns {object|null} der Effekt mit dem größten glowBlur
 */
export function strongestGlow(effects: TextEffectMap): TextEffectValues | null {
  const candidates = [effects.glow, effects.beatPulse, effects.bpmPulse, effects.freqSplit].filter(
    (e): e is TextEffectValues => !!e && (e.glowBlur ?? 0) > 0,
  )
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => ((b.glowBlur ?? 0) > (a.glowBlur ?? 0) ? b : a))
}

/**
 * ✨ Wendet Text-Stil mit Audio-Reaktiven Überschreibungen an
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} textObj
 * @param {object|null} audioReactive - Ergebnis von getAudioReactiveValues()
 * @param {boolean} useAudioGlow - true ⇒ Audio-Glow ersetzt den statischen Schatten
 */
export function applyTextStyleWithAudio(
  ctx: CanvasRenderingContext2D,
  textObj: TextObject,
  audioReactive: TextAudioReactiveValues | null,
  useAudioGlow: boolean,
): void {
  ctx.font = `${textObj.fontStyle} ${textObj.fontWeight} ${textObj.fontSize}px ${textObj.fontFamily}`
  ctx.fillStyle = textObj.color
  ctx.textAlign = textObj.textAlign
  ctx.textBaseline = textObj.textBaseline

  // ✨ BUCHSTABENABSTAND (statisch + audio-reaktiv)
  let letterSpacing = textObj.letterSpacing || 0
  if (audioReactive && audioReactive.hasEffects && audioReactive.effects.letterSpacing) {
    // der letterSpacing-Effekt liefert den Wert immer
    letterSpacing += audioReactive.effects.letterSpacing.letterSpacing as number
  }
  ctx.letterSpacing = `${letterSpacing}px`

  // ✨ SCHATTEN / GLOW
  const audioGlow = useAudioGlow && audioReactive ? strongestGlow(audioReactive.effects) : null
  if (audioGlow) {
    // Audio-reaktiver Glow überschreibt statischen Schatten (stärkstes Leuchten
    // aus Glow/Beat-Puls/BPM-Puls/Frequenz-Split gewinnt).
    // Glow-Effekte liefern Farbe und Stärke immer (glowBlur > 0 geprüft)
    ctx.shadowColor = audioGlow.glowColor as string
    ctx.shadowBlur = audioGlow.glowBlur as number
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  } else if (
    textObj.shadow.blur > 0 ||
    textObj.shadow.offsetX !== 0 ||
    textObj.shadow.offsetY !== 0
  ) {
    // Statischer Schatten
    ctx.shadowColor = textObj.shadow.color
    ctx.shadowBlur = textObj.shadow.blur
    ctx.shadowOffsetX = textObj.shadow.offsetX
    ctx.shadowOffsetY = textObj.shadow.offsetY
  } else {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  // ✨ KONTUR (statisch + audio-reaktiv)
  let strokeWidth = textObj.stroke.width || 2
  let strokeEnabled = textObj.stroke.enabled

  if (audioReactive && audioReactive.hasEffects && audioReactive.effects.strokeWidth) {
    // Audio-reaktive Kontur aktivieren und Breite setzen
    strokeEnabled = true
    strokeWidth = Math.max(strokeWidth, audioReactive.effects.strokeWidth.strokeWidth as number)
  }

  if (strokeEnabled) {
    ctx.strokeStyle = textObj.stroke.color
    ctx.lineWidth = strokeWidth
    ctx.lineJoin = 'round'
  }
}
