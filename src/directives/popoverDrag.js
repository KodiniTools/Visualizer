/**
 * v-popover-drag — makes a sticky-player-bar popover draggable by its header
 * (`.spb-popover-header`), so it can be moved off the right sidebar to keep it
 * accessible. The offset is applied as a `transform: translate(...)` relative
 * to the popover's normal anchored position and is clamped to the viewport.
 *
 * Usage: add `v-popover-drag` to the `.spb-popover` root element.
 */
export const vPopoverDrag = {
  mounted(el) {
    const header = el.querySelector('.spb-popover-header')
    if (!header) return

    let dx = 0
    let dy = 0
    let startX = 0
    let startY = 0
    let baseX = 0 // dx at drag start
    let baseY = 0
    let baseLeft = 0 // element left when dx === 0
    let baseTop = 0
    let dragging = false

    const apply = () => {
      el.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : ''
    }

    const onMove = (e) => {
      if (!dragging) return
      const margin = 4
      const rect = el.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width - margin - baseLeft
      const maxY = window.innerHeight - rect.height - margin - baseTop
      dx = Math.min(Math.max(baseX + (e.clientX - startX), margin - baseLeft), maxX)
      dy = Math.min(Math.max(baseY + (e.clientY - startY), margin - baseTop), maxY)
      apply()
    }

    const onUp = () => {
      dragging = false
      el.classList.remove('spb-popover-dragging')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    const onDown = (e) => {
      // Don't start a drag from interactive controls in the header.
      if (e.target.closest('button, input, select, textarea, a, label')) return
      const rect = el.getBoundingClientRect()
      baseLeft = rect.left - dx
      baseTop = rect.top - dy
      baseX = dx
      baseY = dy
      startX = e.clientX
      startY = e.clientY
      dragging = true
      el.classList.add('spb-popover-dragging')
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      e.preventDefault()
    }

    header.addEventListener('pointerdown', onDown)
    el.__popoverDragCleanup = () => {
      header.removeEventListener('pointerdown', onDown)
      onUp()
    }
  },

  unmounted(el) {
    if (el.__popoverDragCleanup) el.__popoverDragCleanup()
  },
}
