/**
 * Zeiger- und Tastatur-Interaktion mit Formen & Symbolen auf dem Haupt-Canvas
 * (Port von useShapeInteraction aus KodiniTools/Bildkonverter):
 * Auswählen, Verschieben, Größe über die Eck-Griffe (Shift = Seitenverhältnis),
 * Drehen über den Drehgriff (Shift = 15°-Schritte), im Zeichenmodus ein
 * Freihand-Strich pro Zug. Entf/Rücktaste löscht, Pfeile verschieben,
 * Strg/Cmd+D dupliziert, Esc beendet den Zeichenmodus bzw. hebt die Auswahl auf.
 *
 * Die Listener hängen in der Capture-Phase am Eltern-Element des Canvas bzw.
 * am Fenster. Behandelt die Form-Ebene ein Ereignis, stoppt sie es – der
 * MouseHandler des CanvasManagers (Texte, Bilder, Videos) sieht es dann nicht.
 * Texte liegen über den Formen und gewinnen deshalb immer.
 */
import {
  findShapeAt,
  findShapeHandleAt,
  fitFreehandPoints,
  getDefaultDrawWidth,
  getShapeHandles,
  resizeFromCorner,
  rotationFromPointer,
  SHAPE_CORNERS,
  supportsShapeText,
} from './shapes.js'

// Auswahl in Bildschirm-Pixeln: Abstand Rahmen ↔ Form, Griffgröße, Drehgriff-Abstand
export const SHAPE_SELECTION_PAD = 6
export const SHAPE_HANDLE_SIZE = 10
export const SHAPE_ROTATE_GAP = 26

// Zusätzlicher Trefferradius in Bildschirm-Pixeln
const HIT_SLOP = 4
const ROTATE_SNAP = 15
// Mindestabstand zwischen zwei Freihand-Punkten in Bildschirm-Pixeln
const DRAW_MIN_DISTANCE = 2
// Pfeiltasten: Schritt in Canvas-Pixeln (Shift = groß)
const NUDGE = 1
const NUDGE_LARGE = 10

const CORNER_CURSORS = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
}

/** Ereignis, mit dem die Form-Ebene das Formen-Popover öffnen lässt */
export const SHAPES_OPEN_EVENT = 'shapes:openPanel'
/** Ereignis nach Doppelklick auf eine Form mit Text: Texteingabe fokussieren */
export const SHAPES_FOCUS_TEXT_EVENT = 'shapes:focusText'

/**
 * Bildschirm-Pixel pro Canvas-Pixel (Canvas mit object-fit: contain).
 * Fällt auf 1 zurück, wenn der Canvas nicht im Layout hängt.
 */
export function getCanvasDisplayScale(canvas) {
  if (!canvas?.width || !canvas?.height) return 1
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return 1
  return Math.min(rect.width / canvas.width, rect.height / canvas.height) || 1
}

/** Mausposition in Canvas-Pixeln (berücksichtigt das Letterboxing) */
export function getCanvasPointer(canvas, event) {
  const rect = canvas.getBoundingClientRect()
  const scale = getCanvasDisplayScale(canvas)
  const offsetX = (rect.width - canvas.width * scale) / 2
  const offsetY = (rect.height - canvas.height * scale) / 2
  return {
    x: (event.clientX - rect.left - offsetX) / scale,
    y: (event.clientY - rect.top - offsetY) / scale,
  }
}

/**
 * Auswahlrahmen, Eck-Griffe und Drehgriff der Form. Nur Editor-Overlay –
 * landet nie in Aufnahme oder Screenshot.
 * @param {number} displayScale Bildschirm-Pixel pro Canvas-Pixel
 * @param {string} accent Farbe des Rahmens
 */
export function drawShapeSelection(ctx, shape, displayScale = 1, accent = '#c9a227') {
  const px = 1 / (displayScale || 1)
  const handles = getShapeHandles(shape, SHAPE_SELECTION_PAD * px, SHAPE_ROTATE_GAP * px)
  const size = SHAPE_HANDLE_SIZE * px

  ctx.save()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = accent
  ctx.lineWidth = 1.5 * px
  ctx.setLineDash([6 * px, 4 * px])
  ctx.beginPath()
  SHAPE_CORNERS.forEach((c, i) => {
    const p = handles.corners[c]
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.closePath()
  ctx.stroke()
  ctx.setLineDash([])

  ctx.beginPath()
  ctx.moveTo(handles.topCenter.x, handles.topCenter.y)
  ctx.lineTo(handles.rotate.x, handles.rotate.y)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 2 * px
  for (const c of SHAPE_CORNERS) {
    const p = handles.corners[c]
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)
    ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size)
  }

  ctx.beginPath()
  ctx.arc(handles.rotate.x, handles.rotate.y, size / 2 + px, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** true, wenn der Fokus in einem Eingabefeld liegt (Tasten gehören dann dem Feld) */
function isTypingTarget(target) {
  if (!target || typeof target !== 'object') return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target.isContentEditable
}

/**
 * @param {object} deps
 * @param {HTMLCanvasElement} deps.canvas
 * @param {object} deps.store            shapeStore
 * @param {() => object|null} [deps.getCanvasManager]  für Text-Priorität und Auswahl-Exklusivität
 * @param {(name?: string) => void} [deps.commit]      Verlaufsschritt anlegen
 * @param {Window} [deps.win]
 * @returns {{ destroy: () => void, isDragging: () => boolean }}
 */
export function createShapeInteraction({
  canvas,
  store,
  getCanvasManager = () => null,
  commit = () => {},
  win = window,
}) {
  const target = canvas.parentElement || canvas
  let drag = null

  const unit = () => 1 / getCanvasDisplayScale(canvas)
  const selected = () => store.selectedShape
  const pointer = (e) => getCanvasPointer(canvas, e)

  function handleAt(pos) {
    const shape = selected()
    if (!shape) return null
    const u = unit()
    return findShapeHandleAt(shape, pos.x, pos.y, {
      pad: SHAPE_SELECTION_PAD * u,
      rotateGap: SHAPE_ROTATE_GAP * u,
      radius: (SHAPE_HANDLE_SIZE / 2 + HIT_SLOP) * u,
    })
  }

  // Von Beat-Markern ausgeblendete Formen sind nicht anklickbar
  const visibleShapes = () =>
    typeof store.isMarkerHidden === 'function'
      ? store.shapes.filter((s) => !store.isMarkerHidden(s.id))
      : store.shapes
  const shapeAt = (pos) => findShapeAt(visibleShapes(), pos.x, pos.y, HIT_SLOP * unit())

  /** Text über der Position? Texte liegen über den Formen. */
  function textAt(pos) {
    return getCanvasManager()?.selectionManager?.getTextAtPos?.(pos.x, pos.y) ?? null
  }

  /** Griff oder Löschknopf des aktiven Canvas-Objekts (Bild/Video/Text) unter der Position? */
  function canvasObjectControlAt(pos) {
    const cm = getCanvasManager()
    const active = cm?.activeObject
    if (!active || !cm.selectionManager) return false
    const bounds = cm.getObjectBounds?.(active)
    if (!bounds) return false
    const sm = cm.selectionManager
    if (sm.getHandleAtPos?.(bounds, pos.x, pos.y)) return true
    const del = sm.getDeleteButtonBounds?.(bounds)
    return !!(del && sm.isPointInRect?.(pos.x, pos.y, del))
  }

  function selectShape(id) {
    store.selectShape(id)
    if (id !== null) {
      const cm = getCanvasManager()
      if (cm?.activeObject) cm.setActiveObject(null)
      win.dispatchEvent(new CustomEvent(SHAPES_OPEN_EVENT))
    }
  }

  function setCursor(value) {
    canvas.style.cursor = value
  }

  function stop(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  function startDraw(pos) {
    const tool = store.drawTool
    if (store.drawSettings?.[tool]?.width == null) {
      store.updateDrawSettings(tool, {
        width: getDefaultDrawWidth(tool, canvas.width, canvas.height),
      })
    }
    store.syncCanvasSize(canvas.width, canvas.height)
    if (store.selectedShapeId !== null) store.selectShape(null)
    const points = [{ x: pos.x, y: pos.y }]
    const shape = store.addFreehandShape(points, tool)
    if (!shape) return false
    drag = { mode: 'draw', id: shape.id, points }
    return true
  }

  function onMouseDown(e) {
    if (e.button !== 0) return
    const pos = pointer(e)

    if (store.drawTool) {
      if (startDraw(pos)) {
        stop(e)
        addDragListeners()
      }
      return
    }

    const hit = handleAt(pos)
    if (hit) {
      const shape = selected()
      drag = { ...hit, id: shape.id, start: { ...shape }, pointer: pos }
      setCursor(hit.mode === 'rotate' ? 'grabbing' : CORNER_CURSORS[hit.corner])
      stop(e)
      addDragListeners()
      return
    }

    // Texte und die Griffe des aktiven Canvas-Objekts haben Vorrang
    if (textAt(pos) || canvasObjectControlAt(pos)) {
      if (store.selectedShapeId !== null) store.selectShape(null)
      return
    }

    const shape = shapeAt(pos)
    if (!shape) {
      if (store.selectedShapeId !== null) store.selectShape(null)
      return
    }
    selectShape(shape.id)
    drag = { mode: 'move', id: shape.id, start: { ...shape }, pointer: pos }
    setCursor('grabbing')
    stop(e)
    addDragListeners()
  }

  function onDragMove(e) {
    if (!drag) return
    const shape = store.shapes.find((s) => s.id === drag.id)
    if (!shape) {
      endDrag()
      return
    }
    const pos = pointer(e)
    if (drag.mode === 'draw') {
      const last = drag.points[drag.points.length - 1]
      if (Math.hypot(pos.x - last.x, pos.y - last.y) < DRAW_MIN_DISTANCE * unit()) return
      drag.points.push({ x: pos.x, y: pos.y })
      Object.assign(shape, fitFreehandPoints(drag.points))
    } else if (drag.mode === 'move') {
      shape.x = Math.round(drag.start.x + pos.x - drag.pointer.x)
      shape.y = Math.round(drag.start.y + pos.y - drag.pointer.y)
    } else if (drag.mode === 'resize') {
      const next = resizeFromCorner(drag.start, drag.corner, pos, e.shiftKey)
      shape.x = Math.round(next.x * 10) / 10
      shape.y = Math.round(next.y * 10) / 10
      shape.width = Math.round(next.width)
      shape.height = Math.round(next.height)
    } else if (drag.mode === 'rotate') {
      shape.rotation = rotationFromPointer(shape, pos, e.shiftKey ? ROTATE_SNAP : 0)
    }
    stop(e)
  }

  function endDrag() {
    if (!drag) return
    const shape = store.shapes.find((s) => s.id === drag.id)
    const changed =
      drag.mode === 'draw'
        ? !!shape
        : !!shape &&
          ['x', 'y', 'width', 'height', 'rotation'].some((key) => shape[key] !== drag.start[key])
    drag = null
    removeDragListeners()
    setCursor(store.drawTool ? 'crosshair' : 'default')
    if (changed) commit()
  }

  function onDragEnd(e) {
    if (!drag) return
    stop(e)
    endDrag()
  }

  function addDragListeners() {
    win.addEventListener('mousemove', onDragMove, true)
    win.addEventListener('mouseup', onDragEnd, true)
  }

  function removeDragListeners() {
    win.removeEventListener('mousemove', onDragMove, true)
    win.removeEventListener('mouseup', onDragEnd, true)
  }

  /** Hover: Cursor setzen, solange eine Form/ein Griff unter dem Zeiger liegt */
  function onHover(e) {
    if (drag) return
    if (store.drawTool) {
      setCursor('crosshair')
      e.stopPropagation()
      return
    }
    const pos = pointer(e)
    const hit = handleAt(pos)
    if (hit) {
      setCursor(hit.mode === 'rotate' ? 'grab' : CORNER_CURSORS[hit.corner])
      e.stopPropagation()
      return
    }
    if (textAt(pos) || canvasObjectControlAt(pos)) return
    if (shapeAt(pos)) {
      setCursor('move')
      e.stopPropagation()
    }
  }

  function onDoubleClick(e) {
    if (store.drawTool) {
      stop(e)
      return
    }
    const pos = pointer(e)
    if (textAt(pos)) return
    const shape = shapeAt(pos)
    if (!shape) return
    stop(e)
    selectShape(shape.id)
    if (supportsShapeText(shape.type)) win.dispatchEvent(new CustomEvent(SHAPES_FOCUS_TEXT_EVENT))
  }

  function onKeyDown(e) {
    if (isTypingTarget(e.target)) return
    const key = e.key
    if (key === 'Escape' && store.drawTool) {
      store.setDrawTool(null)
      setCursor('default')
      stop(e)
      return
    }
    const shape = selected()
    if (!shape) return
    const ctrl = e.ctrlKey || e.metaKey
    if (key === 'Delete' || key === 'Backspace') {
      store.deleteShape(shape.id)
      commit()
      stop(e)
    } else if (key === 'Escape') {
      store.selectShape(null)
      stop(e)
    } else if (ctrl && key.toLowerCase() === 'd') {
      if (store.duplicateShape(shape.id)) commit()
      stop(e)
    } else if (key.startsWith('Arrow') && !ctrl) {
      const step = e.shiftKey ? NUDGE_LARGE : NUDGE
      const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0
      const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0
      store.updateShape(shape.id, { x: shape.x + dx, y: shape.y + dy })
      commit()
      stop(e)
    } else if (!ctrl && !e.altKey && key.length === 1 && key !== ' ') {
      // Zeichen öffnen sonst den Texteditor des Canvas – bei ausgewählter Form nicht
      e.stopPropagation()
    }
  }

  target.addEventListener('mousedown', onMouseDown, true)
  target.addEventListener('mousemove', onHover, true)
  target.addEventListener('dblclick', onDoubleClick, true)
  win.addEventListener('keydown', onKeyDown, true)

  return {
    isDragging: () => drag !== null,
    destroy() {
      removeDragListeners()
      target.removeEventListener('mousedown', onMouseDown, true)
      target.removeEventListener('mousemove', onHover, true)
      target.removeEventListener('dblclick', onDoubleClick, true)
      win.removeEventListener('keydown', onKeyDown, true)
    },
  }
}
