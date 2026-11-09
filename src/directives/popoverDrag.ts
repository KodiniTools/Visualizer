/**
 * v-popover-drag — makes a sticky-player-bar popover draggable by its header
 * (`.spb-popover-header`), so it can be moved off the right sidebar to keep it
 * accessible. The offset is applied as a `transform: translate(...)` relative
 * to the popover's normal anchored position.
 *
 * It also makes the popover **resizable**: thin grab zones on the left, right
 * and bottom edges plus the two bottom corners change width/height (the top
 * edge belongs to the drag handle). The popover is anchored bottom-right and
 * grows leftwards/upwards, so dragging the right or bottom edge also shifts
 * the offset to keep the opposite edge where it is. Sizes are clamped to the
 * viewport and persisted per popover (`spb-popover-size:<name>`, derived from
 * the `spb-popover-<name>` class); double-clicking a handle resets the size.
 *
 * The position is clamped so the **header row always stays fully on screen** —
 * both for the initial cascade offset and while dragging. This guarantees the
 * drag handle (and its close button) can never end up above the viewport, even
 * for popovers taller than the viewport, so a popover can always be moved back
 * into view.
 *
 * Usage: add `v-popover-drag` to the `.spb-popover` root element. An optional
 * binding value `{ x, y }` sets the initial offset (used to cascade several
 * simultaneously open popovers). With `center: true` the popover opens in the
 * middle of the area above the sticky bar (plus that offset); a popover kept
 * mounted with `v-show` is centered again every time it becomes visible.
 */
// Monotonic stacking counter shared by every popover. All popovers live in the
// same stacking context (the sticky player bar), so raising an element's
// z-index above the others reliably brings it to the front — regardless of the
// fixed DOM/template order in which the popovers are rendered.
import type { Directive } from 'vue'

let topZ = 1

/** Popover-Element mit Aufräum-Funktion der Direktive */
type PopoverDragElement = HTMLElement & { __popoverDragCleanup?: () => void }
/** Größengriff mit gemerktem pointerdown-Handler */
type ResizeHandleElement = HTMLDivElement & { __onDown?: (e: PointerEvent) => void }

/** Optionaler Startversatz (Kaskade mehrerer Popover) */
export interface PopoverDragOffset {
  x?: number
  y?: number
  /** Beim Öffnen mittig über der Leiste platzieren */
  center?: boolean
}

interface ResizeHandleSpec {
  dir: string
  cursor: string
  dw: number
  dh: number
  shiftX: boolean
  shiftY: boolean
}

interface StoredSize {
  width: number | null
  height: number | null
}

const MIN_WIDTH = 260
const MIN_HEIGHT = 160
const SIZE_KEY_PREFIX = 'spb-popover-size:'

// Edges/corners that resize the popover. `dw`/`dh` are the direction factors
// applied to the pointer delta; `shiftX`/`shiftY` mean the popover must also be
// translated by the delta so the opposite (anchored) edge stays put.
const RESIZE_HANDLES: ResizeHandleSpec[] = [
  { dir: 'w', cursor: 'ew-resize', dw: -1, dh: 0, shiftX: false, shiftY: false },
  { dir: 'e', cursor: 'ew-resize', dw: 1, dh: 0, shiftX: true, shiftY: false },
  { dir: 's', cursor: 'ns-resize', dw: 0, dh: 1, shiftX: false, shiftY: true },
  { dir: 'sw', cursor: 'nesw-resize', dw: -1, dh: 1, shiftX: false, shiftY: true },
  { dir: 'se', cursor: 'nwse-resize', dw: 1, dh: 1, shiftX: true, shiftY: true },
]

/** Name of the popover from its `spb-popover-<name>` class (for persistence). */
function popoverName(el: HTMLElement): string | null {
  for (const cls of el.classList) {
    const m = /^spb-popover-([a-z0-9-]+)$/i.exec(cls)
    if (m?.[1] && m[1] !== 'dragging') return m[1]
  }
  return null
}

function readStoredSize(name: string | null): StoredSize | null {
  if (!name) return null
  try {
    const raw = localStorage.getItem(SIZE_KEY_PREFIX + name)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const width = Number(parsed?.width)
    const height = Number(parsed?.height)
    return {
      width: Number.isFinite(width) && width > 0 ? width : null,
      height: Number.isFinite(height) && height > 0 ? height : null,
    }
  } catch {
    return null
  }
}

function writeStoredSize(name: string | null, size: StoredSize | null) {
  if (!name) return
  try {
    if (!size || (size.width === null && size.height === null)) {
      localStorage.removeItem(SIZE_KEY_PREFIX + name)
    } else {
      localStorage.setItem(SIZE_KEY_PREFIX + name, JSON.stringify(size))
    }
  } catch {
    // Speicherfehler ignorieren
  }
}

export const vPopoverDrag: Directive<PopoverDragElement, PopoverDragOffset | null | undefined> = {
  mounted(el, binding) {
    const header = el.querySelector<HTMLElement>('.spb-popover-header')
    if (!header) return

    const MARGIN = 8

    // Bring this popover in front of all others (newest-opened wins, and any
    // click on a popover raises it again).
    const bringToFront = () => {
      el.style.zIndex = String(++topZ)
    }
    // A freshly opened popover starts on top.
    bringToFront()
    // Raise on interaction anywhere within the popover (pointerdown bubbles up
    // from child controls, so this covers the whole surface, not just the
    // header). Capture phase so it fires before the drag handler.
    el.addEventListener('pointerdown', bringToFront, true)

    let dx = 0
    let dy = 0
    let startX = 0
    let startY = 0
    let baseX = 0 // dx at drag start
    let baseY = 0
    let dragging = false

    const apply = () => {
      el.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : ''
    }

    // Clamp a desired offset so the header stays fully within the viewport.
    // Returns the clamped { dx, dy }.
    const clamp = (desiredDx: number, desiredDy: number) => {
      const rect = el.getBoundingClientRect()
      const headerH = header.offsetHeight || 44
      // Untransformed anchor position (where dx === dy === 0).
      const originLeft = rect.left - dx
      const originTop = rect.top - dy

      const minTop = MARGIN
      // Keep at least the full header height visible above the bottom edge.
      const maxTop = Math.max(minTop, window.innerHeight - headerH - MARGIN)
      const minLeft = MARGIN
      const maxLeft = Math.max(minLeft, window.innerWidth - rect.width - MARGIN)

      const clampedTop = Math.min(Math.max(originTop + desiredDy, minTop), maxTop)
      const clampedLeft = Math.min(Math.max(originLeft + desiredDx, minLeft), maxLeft)
      return { dx: clampedLeft - originLeft, dy: clampedTop - originTop }
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const next = clamp(baseX + (e.clientX - startX), baseY + (e.clientY - startY))
      dx = next.dx
      dy = next.dy
      apply()
    }

    const onUp = () => {
      dragging = false
      el.classList.remove('spb-popover-dragging')
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    const onDown = (e: PointerEvent) => {
      // Don't start a drag from interactive controls in the header.
      if ((e.target as Element | null)?.closest('button, input, select, textarea, a, label')) return
      userPlaced = true
      baseX = dx
      baseY = dy
      startX = e.clientX
      startY = e.clientY
      dragging = true
      el.classList.add('spb-popover-dragging')
      // Prevent text selection across the page while dragging.
      document.body.style.userSelect = 'none'
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      e.preventDefault()
    }

    // Re-clamp the current offset (used when the popover's size or the viewport
    // changes). Because a popover is anchored at its bottom and grows upward,
    // content that expands *after* opening (e.g. the audio-reactive panel loads
    // the active image's settings on the next tick) would otherwise push the
    // header above the viewport.
    // Ausgeblendetes Popover (v-show → display: none) hat keine Box; ein
    // Klemmen auf Basis von Nullmaßen würde den Versatz verfälschen.
    const isHidden = () => {
      const rect = el.getBoundingClientRect()
      return rect.width === 0 && rect.height === 0
    }

    const reclamp = () => {
      if (dragging || isHidden()) return
      const next = clamp(dx, dy)
      if (next.dx !== dx || next.dy !== dy) {
        dx = next.dx
        dy = next.dy
        apply()
      }
    }

    // Apply the initial cascade offset, clamped so the header stays visible even
    // when several popovers cascade upward or the anchored position of a tall
    // popover would otherwise land partly above the viewport.
    // With ResizeObserver the clamp is left to its initial callback (below),
    // which runs after layout but before paint – measuring synchronously here
    // would force a layout of the freshly mounted DOM (forced reflow).
    const initDx = Number(binding.value?.x) || 0
    const initDy = Number(binding.value?.y) || 0
    const deferClamp = typeof ResizeObserver !== 'undefined'
    const start = deferClamp ? { dx: initDx, dy: initDy } : clamp(initDx, initDy)
    dx = start.dx
    dy = start.dy
    apply()

    // Mittig platzieren: horizontal im Viewport, vertikal im Bereich über der
    // Leiste (Oberkante des Positionierungs-Elternelements), jeweils plus
    // Kaskaden-Versatz. Erst möglich, wenn das Layout steht (Maße > 0). Bis der
    // Nutzer das Fenster verschiebt oder skaliert, bleibt es auch dann mittig,
    // wenn sein Inhalt nachträglich wächst (z.B. nachgeladene Galerie).
    const wantCenter = binding.value?.center === true
    let userPlaced = false
    const center = () => {
      if (!wantCenter || userPlaced || isHidden()) return
      const rect = el.getBoundingClientRect()
      const parentTop = (el.offsetParent as HTMLElement | null)?.getBoundingClientRect().top
      const areaBottom =
        parentTop && parentTop > 0 ? Math.min(parentTop, window.innerHeight) : window.innerHeight
      const left = (window.innerWidth - rect.width) / 2 + initDx
      const top = (areaBottom - rect.height) / 2 + initDy
      const next = clamp(dx + (left - rect.left), dy + (top - rect.top))
      dx = next.dx
      dy = next.dy
      apply()
    }

    // ══════════════════ Resize (edges + bottom corners) ══════════════════
    const name = popoverName(el)
    const MARGIN2 = MARGIN * 2
    let sizeW: number | null = null // explicit width in px (null = CSS default)
    let sizeH: number | null = null // explicit height in px (null = CSS default / content)
    let resizing: ResizeHandleSpec | null = null // active handle spec
    let rStartX = 0
    let rStartY = 0
    let rBaseW = 0
    let rBaseH = 0
    let rBaseDx = 0
    let rBaseDy = 0

    const currentWidth = () =>
      el.getBoundingClientRect().width ||
      el.offsetWidth ||
      sizeW ||
      parseFloat(el.style.width) ||
      340
    const currentHeight = () =>
      el.getBoundingClientRect().height ||
      el.offsetHeight ||
      sizeH ||
      parseFloat(el.style.height) ||
      400

    const maxWidth = () => Math.max(MIN_WIDTH, window.innerWidth - MARGIN2)
    const maxHeight = () => Math.max(MIN_HEIGHT, window.innerHeight - MARGIN2)

    const applySize = () => {
      if (sizeW !== null) {
        el.style.width = `${Math.round(sizeW)}px`
        el.style.maxWidth = `calc(100vw - ${MARGIN2}px)`
      } else {
        el.style.width = ''
        el.style.maxWidth = ''
      }
      if (sizeH !== null) {
        el.style.height = `${Math.round(sizeH)}px`
        el.style.maxHeight = `calc(100vh - ${MARGIN2}px)`
      } else {
        el.style.height = ''
        el.style.maxHeight = ''
      }
    }

    const clampSize = (w: number | null, h: number | null): StoredSize => ({
      width: w === null ? null : Math.min(Math.max(w, MIN_WIDTH), maxWidth()),
      height: h === null ? null : Math.min(Math.max(h, MIN_HEIGHT), maxHeight()),
    })

    const onResizeMove = (e: PointerEvent) => {
      if (!resizing) return
      const deltaX = e.clientX - rStartX
      const deltaY = e.clientY - rStartY
      const wantW = resizing.dw ? rBaseW + resizing.dw * deltaX : sizeW
      const wantH = resizing.dh ? rBaseH + resizing.dh * deltaY : sizeH
      const next = clampSize(wantW, wantH)
      // Keep the opposite edge in place when dragging the right/bottom edge:
      // the popover is anchored bottom-right, so growing would otherwise push
      // it leftwards/upwards.
      let wantDx = rBaseDx
      let wantDy = rBaseDy
      if (resizing.shiftX && next.width !== null) wantDx = rBaseDx + (next.width - rBaseW)
      if (resizing.shiftY && next.height !== null) wantDy = rBaseDy + (next.height - rBaseH)
      sizeW = next.width
      sizeH = next.height
      applySize()
      const pos = clamp(wantDx, wantDy)
      dx = pos.dx
      dy = pos.dy
      apply()
    }

    const onResizeUp = () => {
      if (!resizing) return
      resizing = null
      el.classList.remove('spb-popover-resizing')
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', onResizeMove)
      window.removeEventListener('pointerup', onResizeUp)
      window.removeEventListener('pointercancel', onResizeUp)
      writeStoredSize(name, { width: sizeW, height: sizeH })
    }

    const startResize = (spec: ResizeHandleSpec, e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return
      userPlaced = true
      resizing = spec
      rStartX = e.clientX
      rStartY = e.clientY
      rBaseW = currentWidth()
      rBaseH = currentHeight()
      rBaseDx = dx
      rBaseDy = dy
      el.classList.add('spb-popover-resizing')
      document.body.style.userSelect = 'none'
      document.body.style.cursor = spec.cursor
      window.addEventListener('pointermove', onResizeMove)
      window.addEventListener('pointerup', onResizeUp)
      window.addEventListener('pointercancel', onResizeUp)
      e.preventDefault()
      e.stopPropagation()
    }

    const resetSize = () => {
      sizeW = null
      sizeH = null
      applySize()
      writeStoredSize(name, null)
      reclamp()
    }

    // Griffe + gespeicherte Größe erst einrichten, wenn das Layout ohnehin steht
    // (erster ResizeObserver-Callback): getComputedStyle direkt im mounted
    // erzwingt sonst eine Stil-Neuberechnung der ganzen Seite (forced reflow).
    let handles: ResizeHandleElement[] = []
    let resizeReady = false
    const initResize = () => {
      resizeReady = true
      // Griffe nur an Popover hängen, die NICHT selbst scrollen. Scrollt der
      // Popover-Rahmen selbst, liegen die Griffe über dem Inhalt am unteren bzw.
      // seitlichen Rand und fangen dort Klicks ab (z.B. auf die letzte Reihe der
      // Preset-Kacheln). Die großen Panel-Popover setzen stattdessen
      // `overflow: hidden` und scrollen einen inneren Bereich – dort stören die
      // Griffe nicht und die Größe lässt sich ändern.
      const rootOverflowY = getComputedStyle(el).overflowY
      const rootScrolls = rootOverflowY === 'auto' || rootOverflowY === 'scroll'

      // Handles are created dynamically; copy the component's scoped-style
      // attributes (data-v-*) so the scoped popover CSS applies to them.
      const scopeAttrs = Array.from(el.attributes).filter((a) => a.name.startsWith('data-v-'))
      handles = (rootScrolls ? [] : RESIZE_HANDLES).map((spec) => {
        const h: ResizeHandleElement = document.createElement('div')
        h.className = `spb-resize-handle spb-resize-${spec.dir}`
        h.setAttribute('aria-hidden', 'true')
        h.title = 'Ziehen: Größe ändern · Doppelklick: zurücksetzen'
        for (const a of scopeAttrs) h.setAttribute(a.name, a.value)
        const onHandleDown = (e: PointerEvent) => startResize(spec, e)
        h.__onDown = onHandleDown
        h.addEventListener('pointerdown', onHandleDown)
        h.addEventListener('dblclick', resetSize)
        el.appendChild(h)
        return h
      })

      // Restore a persisted size (clamped to the current viewport).
      const stored = rootScrolls ? null : readStoredSize(name)
      if (stored && (stored.width !== null || stored.height !== null)) {
        const next = clampSize(stored.width, stored.height)
        sizeW = next.width
        sizeH = next.height
        applySize()
      }
    }

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (!resizeReady) initResize()
        // v-show: beim Ausblenden merken, beim nächsten Einblenden neu zentrieren.
        if (isHidden()) userPlaced = false
        center()
        reclamp()
      })
      resizeObserver.observe(el)
    } else {
      initResize()
      center()
    }
    window.addEventListener('resize', reclamp)

    header.addEventListener('pointerdown', onDown)
    el.__popoverDragCleanup = () => {
      header.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerdown', bringToFront, true)
      window.removeEventListener('resize', reclamp)
      if (resizeObserver) resizeObserver.disconnect()
      onUp()
      onResizeUp()
      for (const h of handles) {
        if (h.__onDown) h.removeEventListener('pointerdown', h.__onDown)
        h.removeEventListener('dblclick', resetSize)
        h.remove()
      }
    }
  },

  unmounted(el) {
    if (el.__popoverDragCleanup) el.__popoverDragCleanup()
  },
}
