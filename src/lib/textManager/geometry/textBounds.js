/**
 * Begrenzungsrahmen und Treffer-Erkennung für Text-Objekte.
 *
 * 1:1 aus textManager.js herausgelöst (findObjectAt, getObjectBounds,
 * isPointInRect); die Objekt-Liste wird als Parameter übergeben statt über
 * `this` gelesen.
 *
 * @module textManager/geometry/textBounds
 */
import { applyTextStyleForMeasurement } from '../style/textStyle.js'

/**
 * Findet das oberste Text-Objekt an einer bestimmten Position
 * @param {object[]} textObjects - Objekte in Ebenen-Reihenfolge (hinten = oben)
 * @param {number} x
 * @param {number} y
 * @param {HTMLCanvasElement} targetCanvas
 * @returns {object|null}
 */
export function findObjectAt(textObjects, x, y, targetCanvas) {
  // Von hinten nach vorne durchgehen (oberste Ebene zuerst)
  for (let i = textObjects.length - 1; i >= 0; i--) {
    const textObj = textObjects[i]
    const bounds = getObjectBounds(textObj, targetCanvas)

    if (bounds && isPointInRect(x, y, bounds)) {
      return textObj
    }
  }
  return null
}

/**
 * ✅ Berechnet die PRÄZISEN Bounds (Begrenzungsrahmen) eines Text-Objekts
 * Berücksichtigt: Schatten, Stroke, letterSpacing, mehrzeilige Texte
 * @param {object} textObj
 * @param {HTMLCanvasElement} targetCanvas
 * @returns {{x: number, y: number, width: number, height: number}|null}
 */
export function getObjectBounds(textObj, targetCanvas) {
  if (!textObj || textObj.type !== 'text') return null

  const ctx = targetCanvas.getContext('2d')

  // Speichere original Context-State
  ctx.save()

  // Wende Text-Style an (ohne Schatten für saubere Messung)
  applyTextStyleForMeasurement(ctx, textObj)

  // Teile Text in Zeilen auf
  const lines = textObj.content.split('\n')

  // ✨ DYNAMISCHER ZEILENABSTAND
  const lineHeightMultiplier = (textObj.lineHeightMultiplier || 120) / 100
  const lineHeight = textObj.fontSize * lineHeightMultiplier

  // Finde die breiteste Zeile
  let maxWidth = 0
  lines.forEach((line) => {
    const metrics = ctx.measureText(line)
    // ✅ FIX: letterSpacing addiert sich über alle Zeichen
    // Bei positivem letterSpacing wird Text breiter, bei negativem schmaler
    const letterSpacingExtra = (textObj.letterSpacing || 0) * Math.max(0, line.length - 1)
    const totalWidth = metrics.width + letterSpacingExtra

    if (totalWidth > maxWidth) {
      maxWidth = totalWidth
    }
  })

  // Restore Context
  ctx.restore()

  // ✅ FIX: Stroke-Breite einrechnen (erweitert Text nach allen Seiten)
  const strokeWidth = textObj.stroke.enabled ? textObj.stroke.width || 0 : 0

  // ✅ FIX: Schatten-Ausdehnung berechnen
  // Schatten kann den Text in alle Richtungen erweitern
  const shadowBlur = textObj.shadow.blur || 0
  const shadowOffsetX = textObj.shadow.offsetX || 0
  const shadowOffsetY = textObj.shadow.offsetY || 0

  // Schatten-Blur erzeugt eine Ausdehnung in alle Richtungen
  // Schatten-Offset verschiebt den Schatten
  const shadowLeft = Math.max(0, shadowBlur - shadowOffsetX)
  const shadowRight = Math.max(0, shadowBlur + shadowOffsetX)
  const shadowTop = Math.max(0, shadowBlur - shadowOffsetY)
  const shadowBottom = Math.max(0, shadowBlur + shadowOffsetY)

  // Position in Pixel umrechnen
  const pixelX = textObj.relX * targetCanvas.width
  const pixelY = textObj.relY * targetCanvas.height

  // Bounds basierend auf Alignment berechnen (ohne Schatten/Stroke)
  let baseX, baseY

  switch (textObj.textAlign) {
    case 'left':
      baseX = pixelX
      break
    case 'right':
      baseX = pixelX - maxWidth
      break
    case 'center':
    default:
      baseX = pixelX - maxWidth / 2
      break
  }

  switch (textObj.textBaseline) {
    case 'top':
      baseY = pixelY
      break
    case 'bottom':
      baseY = pixelY - lineHeight * lines.length
      break
    case 'middle':
    default:
      baseY = pixelY - (lineHeight * lines.length) / 2
      break
  }

  // ✅ FIX: Minimales Padding für Klickbarkeit (relativ zur Schriftgröße)
  // Kleiner als vorher (10px), aber immer noch nutzbar
  const basePadding = Math.max(3, textObj.fontSize * 0.05)

  // ✅ FIX: Finale Bounds mit Stroke, Schatten UND Padding
  return {
    x: baseX - strokeWidth - shadowLeft - basePadding,
    y: baseY - strokeWidth - shadowTop - basePadding,
    width: maxWidth + strokeWidth * 2 + shadowLeft + shadowRight + basePadding * 2,
    height:
      lineHeight * lines.length + strokeWidth * 2 + shadowTop + shadowBottom + basePadding * 2,
  }
}

/**
 * Prüft ob ein Punkt in einem Rechteck liegt (Ränder inklusive)
 * @param {number} x
 * @param {number} y
 * @param {{x: number, y: number, width: number, height: number}} rect
 * @returns {boolean}
 */
export function isPointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}
