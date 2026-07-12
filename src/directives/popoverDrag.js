/**
 * v-popover-drag — makes a sticky-player-bar popover draggable by its header
 * (`.spb-popover-header`), so it can be moved off the right sidebar to keep it
 * accessible. The offset is applied as a `transform: translate(...)` relative
 * to the popover's normal anchored position.
 *
 * The position is clamped so the **header row always stays fully on screen** —
 * both for the initial cascade offset and while dragging. This guarantees the
 * drag handle (and its close button) can never end up above the viewport, even
 * for popovers taller than the viewport, so a popover can always be moved back
 * into view.
 *
 * Usage: add `v-popover-drag` to the `.spb-popover` root element. An optional
 * binding value `{ x, y }` sets the initial offset (used to cascade several
 * simultaneously open popovers).
 */
export const vPopoverDrag = {
  mounted(el, binding) {
    const header = el.querySelector('.spb-popover-header')
    if (!header) return

    const MARGIN = 8

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
    const clamp = (desiredDx, desiredDy) => {
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

    const onMove = (e) => {
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

    const onDown = (e) => {
      // Don't start a drag from interactive controls in the header.
      if (e.target.closest('button, input, select, textarea, a, label')) return
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
    const reclamp = () => {
      if (dragging) return
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
    const initDx = Number(binding.value?.x) || 0
    const initDy = Number(binding.value?.y) || 0
    const start = clamp(initDx, initDy)
    dx = start.dx
    dy = start.dy
    apply()

    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(reclamp)
      resizeObserver.observe(el)
    }
    window.addEventListener('resize', reclamp)

    header.addEventListener('pointerdown', onDown)
    el.__popoverDragCleanup = () => {
      header.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', reclamp)
      if (resizeObserver) resizeObserver.disconnect()
      onUp()
    }
  },

  unmounted(el) {
    if (el.__popoverDragCleanup) el.__popoverDragCleanup()
  },
}
