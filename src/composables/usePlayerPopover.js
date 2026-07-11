import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Manages the sticky player bar popovers (audio / volume / markers / playlist /
 * recorder) and the outside-click behaviour that closes them.
 *
 * @param {import('vue').Ref<HTMLElement|null>} barRef - root element of the bar.
 */
export function usePlayerPopover(barRef) {
  // null | 'audio' | 'volume' | 'markers' | 'playlist' | 'recorder'
  const activePopover = ref(null)

  const togglePopover = (name) => {
    activePopover.value = activePopover.value === name ? null : name
  }
  const closePopover = () => {
    activePopover.value = null
  }
  const handleOutsideClick = (event) => {
    if (!activePopover.value) return
    if (barRef.value && !barRef.value.contains(event.target)) {
      // Keep recorder popover open even on outside clicks so its modals/downloads
      // (which may live outside the bar) remain usable.
      if (activePopover.value === 'recorder') return
      activePopover.value = null
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleOutsideClick)
  })
  onUnmounted(() => {
    document.removeEventListener('click', handleOutsideClick)
  })

  return { activePopover, togglePopover, closePopover }
}
