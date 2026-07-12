/**
 * v-popover-drag — makes a sticky-player-bar popover draggable by its header
 * (`.spb-popover-header`), so it can be moved off the right sidebar to keep it
 * accessible. The offset is applied as a `transform: translate(...)` relative
 * to the popover's normal anchored position and is clamped to the viewport.
 *
 * Usage: add `v-popover-drag` to the `.spb-popover` root element. An optional
 * binding value `{ x, y }` sets the initial offset (used to cascade several
 * simultaneously open popovers).
 */
export const vPopoverDrag = {
  mounted(el, binding) {
    const header = el.querySelector('.spb-popover-header')
    if (!header) return

    let dx = Number(binding.value?.x) || 0
    let dy = Number(binding.value?.y) || 0
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
      document.body.style.userSelect = ''
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
      // Prevent text selection across the page while dragging.
      document.body.style.userSelect = 'none'
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      e.preventDefault()
    }

    // Apply the initial cascade offset (if any) once mounted.
    if (dx || dy) apply()

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
