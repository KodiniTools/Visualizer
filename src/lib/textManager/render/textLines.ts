/**
 * Zeichnen der Textzeilen inklusive Wave-, RGB-Glitch- und Cursor-Darstellung.
 *
 * @module textManager/render/textLines
 */
import { activeEffects } from './effects'
import type { TypewriterResult } from '../animation/typewriter'
import type { TextAudioReactiveValues, TextEffectValues, TextObject } from '../types'

/** Zeilen-Layout eines Texts im aktuellen Frame */
export interface TextLinesLayout {
  lines: string[]
  pixelX: number
  startY: number
  lineHeight: number
}

/**
 * Zeichnet eine Zeile buchstabenweise mit wellenförmiger Y-Verschiebung
 * (La-Ola-Effekt). Setzt textAlign temporär auf 'left', weil jede Position
 * einzeln berechnet wird.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} textObj
 * @param {string} line
 * @param {number} pixelX
 * @param {number} yPos
 * @param {object} wave - fx.wave
 * @param {boolean} withStroke - Kontur mitzeichnen
 */
function drawWaveLine(
  ctx: CanvasRenderingContext2D,
  textObj: TextObject,
  line: string,
  pixelX: number,
  yPos: number,
  wave: TextEffectValues,
  withStroke: boolean,
): void {
  // Wave-Effekt liefert Geschwindigkeit, Frequenz und Amplitude immer
  const waveSpeed = wave.waveSpeed as number
  const waveFrequency = wave.waveFrequency as number
  const waveAmplitude = wave.waveAmplitude as number
  const chars = line.split('')
  let currentX = pixelX
  const letterSpacing = textObj.letterSpacing || 0

  // Bei zentriertem/rechtsbündigem Text: Startposition berechnen
  if (textObj.textAlign === 'center' || textObj.textAlign === 'right') {
    const totalWidth = ctx.measureText(line).width + letterSpacing * (chars.length - 1)
    currentX = textObj.textAlign === 'center' ? pixelX - totalWidth / 2 : pixelX - totalWidth
    ctx.textAlign = 'left' // Temporär auf left setzen für buchstabenweises Rendering
  }

  chars.forEach((char, charIndex) => {
    // Wellenförmige Y-Verschiebung basierend auf Buchstabenindex und Zeit
    const waveOffset = Math.sin(waveSpeed + charIndex * waveFrequency) * waveAmplitude
    const charY = yPos + waveOffset

    if (withStroke) {
      ctx.strokeText(char, currentX, charY)
    }
    ctx.fillText(char, currentX, charY)

    // Nächste X-Position berechnen
    currentX += ctx.measureText(char).width + letterSpacing
  })

  // TextAlign zurücksetzen
  ctx.textAlign = textObj.textAlign
}

/**
 * Zeichnet eine Zeile dreifach mit R/G/B-Versatz (chromatische Aberration).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} line
 * @param {number} pixelX
 * @param {number} yPos
 * @param {object} rgbGlitch - fx.rgbGlitch
 */
function drawGlitchLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  pixelX: number,
  yPos: number,
  rgbGlitch: TextEffectValues,
): void {
  // RGB-Glitch liefert alle Versätze immer
  const { redOffsetX, redOffsetY, blueOffsetX, blueOffsetY } = rgbGlitch as Required<
    Pick<TextEffectValues, 'redOffsetX' | 'redOffsetY' | 'blueOffsetX' | 'blueOffsetY'>
  >
  const originalFillStyle = ctx.fillStyle
  const originalComposite = ctx.globalCompositeOperation

  // Additives Blending für Farbüberlagerung
  ctx.globalCompositeOperation = 'lighter'

  // Rot-Kanal (versetzt nach links-oben)
  ctx.fillStyle = `rgba(255, 0, 0, 0.7)`
  ctx.fillText(line, pixelX + redOffsetX, yPos + redOffsetY)

  // Grün-Kanal (Original-Position)
  ctx.fillStyle = `rgba(0, 255, 0, 0.7)`
  ctx.fillText(line, pixelX, yPos)

  // Blau-Kanal (versetzt nach rechts-unten)
  ctx.fillStyle = `rgba(0, 0, 255, 0.7)`
  ctx.fillText(line, pixelX + blueOffsetX, yPos + blueOffsetY)

  // Zurücksetzen
  ctx.globalCompositeOperation = originalComposite
  ctx.fillStyle = originalFillStyle
}

/**
 * Zeichnet alle Zeilen eines Textes.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} textObj
 * @param {object} layout
 * @param {string[]} layout.lines - anzuzeigende Zeilen (ggf. Typewriter-Teiltext)
 * @param {number} layout.pixelX
 * @param {number} layout.startY - Y der ersten Zeile
 * @param {number} layout.lineHeight
 * @param {object|null} layout.audioReactive
 */
export function drawTextLines(
  ctx: CanvasRenderingContext2D,
  textObj: TextObject,
  {
    lines,
    pixelX,
    startY,
    lineHeight,
    audioReactive,
  }: TextLinesLayout & { audioReactive: TextAudioReactiveValues | null },
): void {
  const fx = activeEffects(audioReactive)

  // ✨ AUDIO-REAKTIV: RGB-Glitch und Wave-Effekt prüfen
  const rgbGlitch = fx && fx.rgbGlitch ? fx.rgbGlitch : null
  const wave = fx && fx.wave && fx.wave.waveEnabled ? fx.wave : null

  // ✨ KONTUR zeichnen (wenn aktiviert oder audio-reaktiv)
  const hasStroke = Boolean(textObj.stroke.enabled || (fx && fx.strokeWidth))

  lines.forEach((line, lineIndex) => {
    const yPos = startY + lineIndex * lineHeight

    if (wave && (wave.waveAmplitude ?? 0) > 0) {
      drawWaveLine(ctx, textObj, line, pixelX, yPos, wave, hasStroke && !rgbGlitch)
    } else if (rgbGlitch && (rgbGlitch.glitchIntensity ?? 0) > 0) {
      drawGlitchLine(ctx, line, pixelX, yPos, rgbGlitch)
    } else {
      // ✨ Standard-Rendering (ohne Wave/RGB-Glitch)
      if (hasStroke) {
        ctx.strokeText(line, pixelX, yPos)
      }
      // Text füllen (normal)
      ctx.fillText(line, pixelX, yPos)
    }
  })
}

/**
 * Zeichnet den blinkenden Typewriter-Cursor hinter der letzten Zeile.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} textObj
 * @param {object} layout
 * @param {string[]} layout.lines
 * @param {number} layout.pixelX
 * @param {number} layout.startY
 * @param {number} layout.lineHeight
 * @param {object} layout.typewriterResult - Ergebnis von getTypewriterText()
 * @param {number} [layout.now] - Zeitstempel in ms
 */
export function drawTypewriterCursor(
  ctx: CanvasRenderingContext2D,
  textObj: TextObject,
  {
    lines,
    pixelX,
    startY,
    lineHeight,
    typewriterResult,
    now = Date.now(),
  }: TextLinesLayout & { typewriterResult: TypewriterResult; now?: number },
): void {
  if (!typewriterResult.showCursor || typewriterResult.isComplete) return

  const lastLineIndex = lines.length - 1
  const lastLine = lines[lastLineIndex] || ''
  const yPos = startY + lastLineIndex * lineHeight

  // Cursor-Position berechnen (nach dem letzten Zeichen)
  const lastLineWidth = ctx.measureText(lastLine).width
  const letterSpacingExtra = (textObj.letterSpacing || 0) * Math.max(0, lastLine.length)

  let cursorX = pixelX
  // Position basierend auf textAlign
  switch (textObj.textAlign) {
    case 'left':
      cursorX = pixelX + lastLineWidth + letterSpacingExtra
      break
    case 'right':
      cursorX = pixelX
      break
    case 'center':
    default:
      cursorX = pixelX + (lastLineWidth + letterSpacingExtra) / 2
      break
  }

  // Blinkender Cursor (500ms Intervall)
  const cursorVisible = Math.floor(now / 500) % 2 === 0
  if (cursorVisible) {
    ctx.fillText(typewriterResult.cursorChar || '|', cursorX, yPos)
  }
}
