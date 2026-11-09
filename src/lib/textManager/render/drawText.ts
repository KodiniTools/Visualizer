/**
 * Zeichnet ein einzelnes Text-Objekt auf den Canvas.
 *
 * Orchestriert die vier Phasen: Werte berechnen (transform), Farbfilter
 * setzen (filters), Stil anwenden (style/textStyle) und Zeichen ausgeben
 * (textLines).
 *
 * @module textManager/render/drawText
 */
import { getAudioReactiveValues } from '../audio/textEffectValues'
import { applyTextStyleWithAudio, resetShadow, strongestGlow } from '../style/textStyle'
import { getTypewriterText } from '../animation/typewriter'
import { activeEffects } from './effects'
import { applyTextTransform, computeTextTransform } from './transform/index'
import { buildFilterString } from './filters'
import { drawTextLines, drawTypewriterCursor } from './textLines'
import type { TextObject } from '../types'

/**
 * Zeichnet einen einzelnen Text (mit Unterstützung für mehrzeilige Texte),
 * audio-reaktive Effekte und Animationen.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} textObj
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} [now] - Zeitstempel in ms; ein Frame nutzt einen Zeitpunkt
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  textObj: TextObject,
  canvasWidth: number,
  canvasHeight: number,
  now = Date.now(),
): void {
  if (!textObj.content) return

  ctx.save()

  // ✨ AUDIO-REAKTIVE WERTE berechnen
  const audioReactive = getAudioReactiveValues(textObj.audioReactive)

  // Deckkraft, Position und Transformation für diesen Frame
  const transform = computeTextTransform(textObj, audioReactive, canvasWidth, canvasHeight, now)
  ctx.globalAlpha = transform.opacity
  applyTextTransform(ctx, transform)

  // ✨ AUDIO-REAKTIV: Filter anwenden (Hue, Brightness, Strobe, …)
  const filterString = buildFilterString(audioReactive, transform.strobeBrightnessMultiplier)
  if (filterString) {
    ctx.filter = filterString
  }

  // ✨ AUDIO-REAKTIV: Glow-Effekt (überschreibt statischen Schatten temporär)
  // Der Beat-Puls liefert ebenfalls Glow-Werte (glowBlur/glowColor).
  const fx = activeEffects(audioReactive)
  const useAudioGlow = Boolean(fx && strongestGlow(fx))

  // Text-Stil anwenden (mit Audio-Reaktiven Überschreibungen)
  applyTextStyleWithAudio(ctx, textObj, audioReactive, useAudioGlow)

  // ✨ TYPEWRITER-ANIMATION: Hole den sichtbaren Text
  const typewriterResult = getTypewriterText(textObj, now)

  // ✨ Mehrzeilige Texte unterstützen (Zeilenumbrüche mit \n)
  const lines = typewriterResult.text.split('\n')

  // ✨ DYNAMISCHER ZEILENABSTAND (lineHeightMultiplier: 100-300%)
  const lineHeight = textObj.fontSize * ((textObj.lineHeightMultiplier || 120) / 100)

  // Für Positionsberechnung: Original-Content, damit die Zeilen beim Tippen
  // nicht wandern
  const originalLines = textObj.content.split('\n')

  // Berechne Start-Y-Position für zentrierte mehrzeilige Texte
  let startY = transform.pixelY
  if (originalLines.length > 1 && textObj.textBaseline === 'middle') {
    // textBaseline 'middle': nach oben um die halbe Gesamthöhe verschieben
    startY = transform.pixelY - ((originalLines.length - 1) * lineHeight) / 2
  }

  const layout = { lines, pixelX: transform.pixelX, startY, lineHeight }

  drawTextLines(ctx, textObj, { ...layout, audioReactive })
  drawTypewriterCursor(ctx, textObj, { ...layout, typewriterResult, now })

  // 🔧 WICHTIG: Schatten und Filter explizit zurücksetzen VOR restore()
  resetShadow(ctx)
  ctx.filter = 'none'

  ctx.restore()
}
