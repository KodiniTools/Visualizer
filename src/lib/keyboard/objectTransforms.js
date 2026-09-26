/**
 * Verschieben und Größe ändern per Pfeiltaste (relative Koordinaten 0–1).
 * Schrittweite in Pixeln: 5, mit Shift 20.
 */

const STEP_PX = 5
const FAST_STEP_PX = 20
const MIN_SIZE_PX = 10

// Richtung → Vorzeichen je Achse (x, y)
const MOVE = {
  arrowup: [0, -1],
  arrowdown: [0, 1],
  arrowleft: [-1, 0],
  arrowright: [1, 0],
}

// Richtung → geänderte Seite + Vorzeichen; die andere Seite folgt dem Seitenverhältnis
const RESIZE = {
  arrowup: ['height', -1],
  arrowdown: ['height', 1],
  arrowleft: ['width', -1],
  arrowright: ['width', 1],
}

function relativeSteps(canvas, fast) {
  const step = fast ? FAST_STEP_PX : STEP_PX
  return { x: step / canvas.width, y: step / canvas.height }
}

/** Objekt um einen Schritt verschieben. */
export function moveObject(obj, direction, canvas, fast = false) {
  const delta = MOVE[direction]
  if (!delta) return
  const step = relativeSteps(canvas, fast)
  if (delta[0] < 0) obj.relX -= step.x
  else if (delta[0] > 0) obj.relX += step.x
  if (delta[1] < 0) obj.relY -= step.y
  else if (delta[1] > 0) obj.relY += step.y
}

/** Bild um einen Schritt vergrößern/verkleinern (Seitenverhältnis bleibt, min. 10 px). */
export function resizeImageObject(obj, direction, canvas, fast = false) {
  const change = RESIZE[direction]
  const step = relativeSteps(canvas, fast)
  const aspectRatio = obj.imageObject.width / obj.imageObject.height

  if (change) {
    const [side, sign] = change
    if (side === 'height') {
      if (sign < 0) obj.relHeight -= step.y
      else obj.relHeight += step.y
      obj.relWidth = obj.relHeight * aspectRatio
    } else {
      if (sign < 0) obj.relWidth -= step.x
      else obj.relWidth += step.x
      obj.relHeight = obj.relWidth / aspectRatio
    }
  }

  const minSize = MIN_SIZE_PX / Math.min(canvas.width, canvas.height)
  if (obj.relWidth < minSize) obj.relWidth = minSize
  if (obj.relHeight < minSize) obj.relHeight = minSize
}
