import { ref } from 'vue'

/**
 * Manages the sticky player bar popovers (audio / volume / markers / playlist /
 * recorder). Several popovers can be open at the same time; each is a movable
 * window closed via its own close button, so there is no outside-click auto
 * close.
 */
export function usePlayerPopover() {
  // Names of the currently open popovers, in the order they were opened
  // (used to cascade their initial position).
  const openPopovers = ref([])

  const isOpen = (name) => openPopovers.value.includes(name)

  const openPopover = (name) => {
    if (!openPopovers.value.includes(name)) openPopovers.value.push(name)
  }
  const closePopover = (name) => {
    openPopovers.value = openPopovers.value.filter((n) => n !== name)
  }
  const togglePopover = (name) => {
    if (isOpen(name)) closePopover(name)
    else openPopover(name)
  }

  // Diagonal offset (px) applied to the Nth simultaneously-open popover so they
  // cascade instead of stacking exactly on top of each other.
  const cascadeOffset = (name) => {
    const idx = Math.max(0, openPopovers.value.indexOf(name))
    return { x: idx * -34, y: idx * -34 }
  }

  return { openPopovers, isOpen, openPopover, closePopover, togglePopover, cascadeOffset }
}
