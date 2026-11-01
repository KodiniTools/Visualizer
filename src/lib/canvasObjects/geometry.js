/**
 * Geometrie für auswählbare Canvas-Objekte (Bilder, Videos, Texte, Formen):
 * Hit-Test, Resize-Handles und Löschbutton. Reine Funktionen, alle Werte in
 * Canvas-Pixeln.
 */

/** Kantenlänge eines Resize-Handles in px */
export const HANDLE_SIZE = 10

/** Kantenlänge des runden Löschbuttons in px */
export const DELETE_BUTTON_SIZE = 20

/**
 * Prüft, ob ein Punkt in einem Rechteck liegt (Ränder inklusive).
 * @param {number} x
 * @param {number} y
 * @param {{x: number, y: number, width: number, height: number}} rect
 * @returns {boolean}
 */
export function isPointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

/**
 * Die acht Resize-Handles (Ecken + Kantenmitten) um ein Objekt.
 * @param {{x: number, y: number, width: number, height: number}} bounds
 * @param {number} [size=HANDLE_SIZE]
 * @returns {Record<string, {x: number, y: number, width: number, height: number}>}
 */
export function getResizeHandles(bounds, size = HANDLE_SIZE) {
  const hs = size
  const { x, y, width, height } = bounds
  const centerX = x + width / 2
  const centerY = y + height / 2

  return {
    'resize-tl': { x: x - hs / 2, y: y - hs / 2, width: hs, height: hs },
    'resize-tr': { x: x + width - hs / 2, y: y - hs / 2, width: hs, height: hs },
    'resize-bl': { x: x - hs / 2, y: y + height - hs / 2, width: hs, height: hs },
    'resize-br': { x: x + width - hs / 2, y: y + height - hs / 2, width: hs, height: hs },
    'resize-t': { x: centerX - hs / 2, y: y - hs / 2, width: hs, height: hs },
    'resize-b': { x: centerX - hs / 2, y: y + height - hs / 2, width: hs, height: hs },
    'resize-l': { x: x - hs / 2, y: centerY - hs / 2, width: hs, height: hs },
    'resize-r': { x: x + width - hs / 2, y: centerY - hs / 2, width: hs, height: hs },
  }
}

/**
 * Name des Resize-Handles unter dem Punkt oder null.
 * Reihenfolge wie getResizeHandles (Ecken vor Kanten).
 * @returns {string|null}
 */
export function findResizeHandleAt(x, y, bounds, size = HANDLE_SIZE) {
  const handles = getResizeHandles(bounds, size)
  for (const key in handles) {
    if (isPointInRect(x, y, handles[key])) return key
  }
  return null
}

/**
 * Löschbutton: Quadrat, zentriert auf der oberen rechten Ecke des Objekts.
 * @param {{x: number, y: number, width: number, height: number}} objectBounds
 * @param {number} [size=DELETE_BUTTON_SIZE]
 */
export function getDeleteButtonBounds(objectBounds, size = DELETE_BUTTON_SIZE) {
  const offset = size / 2
  return {
    x: objectBounds.x + objectBounds.width - offset,
    y: objectBounds.y - offset,
    width: size,
    height: size,
  }
}
