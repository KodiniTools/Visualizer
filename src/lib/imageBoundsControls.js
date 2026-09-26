/**
 * Reine Hilfsfunktionen für Positions-/Größenregler von Canvas-Objekten.
 * Alle Werte relativ zur Canvas (0–1); Bounds = { relX, relY, relWidth, relHeight }.
 * Genutzt von normalen Canvas-Bildern und Slideshow-Bildern.
 */

// Grenzen der Größe pro Seite (1–200 % der Canvas)
export const IMAGE_SIZE_MIN = 0.01
export const IMAGE_SIZE_MAX = 2

const BOUND_KEYS = ['relX', 'relY', 'relWidth', 'relHeight']

/** @returns {boolean} true, wenn alle vier Werte endlich und die Größe > 0 ist */
export function isValidBounds(b) {
  return !!b && BOUND_KEYS.every((k) => Number.isFinite(b[k])) && b.relWidth > 0 && b.relHeight > 0
}

/** Mittelpunkt { x, y } der Bounds (relativ) oder null. */
export function getBoundsCenter(b) {
  return isValidBounds(b) ? { x: b.relX + b.relWidth / 2, y: b.relY + b.relHeight / 2 } : null
}

/**
 * Verschiebt Bounds auf einen neuen Mittelpunkt (0–1, begrenzt); Größe bleibt.
 * @param {object} b - Ausgangs-Bounds
 * @param {{centerX?:number, centerY?:number}} position - fehlender Wert = unverändert
 * @returns {{relX:number, relY:number, relWidth:number, relHeight:number}|null}
 */
export function positionBounds(b, { centerX, centerY } = {}) {
  const c = getBoundsCenter(b)
  if (!c) return null
  const clamp = (v) => Math.min(1, Math.max(0, v))
  const cx = Number.isFinite(centerX) ? clamp(centerX) : c.x
  const cy = Number.isFinite(centerY) ? clamp(centerY) : c.y
  return {
    relX: cx - b.relWidth / 2,
    relY: cy - b.relHeight / 2,
    relWidth: b.relWidth,
    relHeight: b.relHeight,
  }
}

/**
 * Ändert die Größe um den Mittelpunkt (pro Seite 1–200 %). Mit keepAspect
 * folgt die andere Seite im aktuellen Seitenverhältnis (keine Verzerrung).
 * @param {object} b - Ausgangs-Bounds
 * @param {{width?:number, height?:number, keepAspect?:boolean}} size - fehlender Wert = unverändert
 * @returns {{relX:number, relY:number, relWidth:number, relHeight:number}|null}
 */
export function resizeBounds(b, { width, height, keepAspect = true } = {}) {
  const c = getBoundsCenter(b)
  if (!c) return null
  const clamp = (v) => Math.min(IMAGE_SIZE_MAX, Math.max(IMAGE_SIZE_MIN, v))
  const ratio = b.relHeight / b.relWidth
  let w = Number.isFinite(width) ? clamp(width) : b.relWidth
  let h = Number.isFinite(height) ? clamp(height) : b.relHeight
  if (keepAspect) {
    if (Number.isFinite(width)) h = w * ratio
    else if (Number.isFinite(height)) w = h / ratio
  }
  return { relX: c.x - w / 2, relY: c.y - h / 2, relWidth: w, relHeight: h }
}

/**
 * Standardgröße eines neu platzierten Bildes (wie MultiImageManager.addImage):
 * 1/3 der Canvas-Breite, Höhe im natürlichen Seitenverhältnis.
 * @param {{width:number, height:number}} imageObject
 * @param {{width:number, height:number}} canvas
 * @returns {{width:number, height:number}|null}
 */
export function getDefaultImageSize(imageObject, canvas) {
  const iw = Number(imageObject?.width || imageObject?.naturalWidth)
  const ih = Number(imageObject?.height || imageObject?.naturalHeight)
  const cw = Number(canvas?.width)
  const ch = Number(canvas?.height)
  if (!(iw > 0 && ih > 0 && cw > 0 && ch > 0)) return null
  const width = 1 / 3
  return { width, height: (width * (ih / iw)) / (ch / cw) }
}
