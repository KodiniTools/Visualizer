import { ref } from 'vue'

/**
 * useStatusBanner - transient status banner shown in the right panel.
 *
 * Owns a single `banner` ref ({ type, message }) that both the shared-files
 * import flow and the handoff flow write to via `showBanner`. Auto-clears after
 * `duration` ms (pass 0 to keep it until the next call).
 */
/** Inhalt des Status-Banners */
export interface StatusBanner {
  type: string
  message: string
}

/** Banner anzeigen; duration 0 = bis zum nächsten Aufruf */
export type ShowBannerFn = (type: string, message: string, duration?: number) => void

export function useStatusBanner() {
  const banner = ref<StatusBanner | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  function showBanner(type: string, message: string, duration = 5000) {
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
