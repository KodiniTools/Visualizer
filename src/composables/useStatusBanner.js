import { ref } from 'vue'

/**
 * useStatusBanner - transient status banner shown in the right panel.
 *
 * Owns a single `banner` ref ({ type, message }) that both the shared-files
 * import flow and the handoff flow write to via `showBanner`. Auto-clears after
 * `duration` ms (pass 0 to keep it until the next call).
 */
export function useStatusBanner() {
  const banner = ref(null)
  let timer = null

  function showBanner(type, message, duration = 5000) {
    banner.value = { type, message }
    if (timer) clearTimeout(timer)
    timer = null
    if (duration > 0) {
      timer = setTimeout(() => {
        banner.value = null
        timer = null
      }, duration)
    }
  }

  function clearBanner() {
    banner.value = null
    if (timer) clearTimeout(timer)
    timer = null
  }

  return { banner, showBanner, clearBanner }
}
