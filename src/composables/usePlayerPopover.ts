import { ref } from 'vue'

/**
 * Whether a pointerdown on `target` counts as a click outside the sticky-bar
 * windows. Not outside: the bar itself including its windows (`barEl`),
 * elements outside `#app` (dialogs, color pickers, tooltips teleported to
 * <body>) and triggers marked `data-popover-trigger` that toggle a window
 * themselves.
 */
export function isOutsidePopoverClick(
  target: EventTarget | null,
  barEl: Element | null | undefined,
): boolean {
  if (!(target instanceof Element) || !target.isConnected) return false
  if (barEl?.contains(target)) return false
  return !!target.closest('#app') && !target.closest('[data-popover-trigger]')
}

/**
 * Manages the sticky player bar popovers (audio / volume / markers / playlist /
 * recorder …). Every function has two states:
 *
 * - **active**: the function is switched on in the sticky bar (highlighted).
 * - **open**: its window is visible (always implies active).
 *
 * Interaction model of the sticky bar:
 * - single click on a function → activates it and opens its window (centered)
 * - click outside every window → hides the windows, functions stay active
 *   (`hideAllPopovers`, wired up in StickyPlayerBar)
 * - single click on an active function → reopens its window
 * - double click on a function → deactivates it and closes its window
 * - the window's own close button → deactivates it, too (`closePopover`)
 *
 * Several windows can be open at the same time; each stays movable.
 */
export function usePlayerPopover() {
  // Active functions, in activation order.
  const activePopovers = ref<string[]>([])
  // Names of the currently visible popovers, in the order they were opened
  // (used to cascade their initial position).
  const openPopovers = ref<string[]>([])

  const isOpen = (name: string) => openPopovers.value.includes(name)
  const isActive = (name: string) => activePopovers.value.includes(name)

  /** Activates the function and shows its window. */
  const openPopover = (name: string) => {
    if (!activePopovers.value.includes(name)) activePopovers.value.push(name)
    if (!openPopovers.value.includes(name)) openPopovers.value.push(name)
  }
  /** Hides the window; the function stays active in the sticky bar. */
  const hidePopover = (name: string) => {
    openPopovers.value = openPopovers.value.filter((n) => n !== name)
  }
  /** Hides every window (click outside); all functions stay active. */
  const hideAllPopovers = () => {
    if (openPopovers.value.length) openPopovers.value = []
  }
  /** Closes the window and deactivates the function. */
  const closePopover = (name: string) => {
    hidePopover(name)
    activePopovers.value = activePopovers.value.filter((n) => n !== name)
  }
  const togglePopover = (name: string) => {
    if (isOpen(name)) closePopover(name)
    else openPopover(name)
  }

  /**
   * Single click on a function in the sticky bar: opens (or reopens) its
   * window. The second click of a double click (`event.detail > 1`) is ignored
   * so it does not interfere with `onBarDblClick`.
   */
  const onBarClick = (name: string, event?: MouseEvent) => {
    if ((event?.detail ?? 0) > 1) return
    openPopover(name)
  }
  /** Double click on a function in the sticky bar: deactivates it. */
  const onBarDblClick = (name: string) => closePopover(name)

  // Diagonal offset (px) applied to the Nth simultaneously-open popover so they
  // cascade instead of stacking exactly on top of each other. `center` asks
  // v-popover-drag to place the window in the middle of the screen.
  const cascadeOffset = (name: string) => {
    const idx = Math.max(0, openPopovers.value.indexOf(name))
    return { x: idx * -34, y: idx * -34, center: true }
  }

  return {
    activePopovers,
    openPopovers,
    isOpen,
    isActive,
    openPopover,
    hidePopover,
    hideAllPopovers,
    closePopover,
    togglePopover,
    onBarClick,
    onBarDblClick,
    cascadeOffset,
  }
}
