import { computed, type Ref } from 'vue'
import type { CanvasManagerRef } from '../types'
import {
  seekTo,
  seekBackwardBy,
  seekForwardBy,
  displayVolume,
  setBackgroundVideoVolume,
} from './videoElements'

/** Schlüssel der Hintergrund-Videos im CanvasManager */
export type BackgroundVideoKey = 'videoBackground' | 'workspaceVideoBackground'

/**
 * Zustand + Steuerung eines Hintergrund-Videos des CanvasManagers
 * (`videoBackground` oder `workspaceVideoBackground`).
 *
 * @param tick - wird regelmäßig erhöht (Zeit-/Lautstärke-Anzeige)
 * @param label - Bezeichnung für Log-Ausgaben, z. B. 'Video-Hintergrund'
 */
export function useBackgroundVideo(
  canvasManager: CanvasManagerRef,
  key: BackgroundVideoKey,
  tick: Ref<number>,
  label: string,
) {
  const entry = computed(() => {
    const cm = canvasManager.value
    if (!cm) return null
    return cm[key]
  })

  /** Video-Element des Hintergrunds (null ohne Hintergrund). */
  function element(): HTMLVideoElement | null {
    return entry.value?.videoElement || null
  }

  const isPlaying = computed(() => {
    void tick.value
    const el = element()
    return el ? !el.paused : false
  })

  const time = computed(() => {
    void tick.value
    return element()?.currentTime || 0
  })

  const duration = computed(() => element()?.duration || 0)

  const volume = computed(() => {
    void tick.value
    const el = element()
    return el ? displayVolume(el) : 1
  })

  /** Führt fn mit dem Video-Element aus (ohne Hintergrund: nichts). */
  const withElement =
    <A extends unknown[]>(fn: (el: HTMLVideoElement, ...args: A) => void) =>
    (...args: A) => {
      const el = element()
      if (el) fn(el, ...args)
    }

  const toggle = withElement((el) => {
    if (el.paused) {
      el.play().catch(() => {})
      console.log(`▶️ ${label} gestartet`)
    } else {
      el.pause()
      console.log(`⏸️ ${label} pausiert`)
    }
  })

  const seek = withElement(seekTo)
  const seekBackward = withElement(seekBackwardBy)
  const seekForward = withElement(seekForwardBy)

  const updateVolume = withElement((el, value: string | number) => {
    const v = setBackgroundVideoVolume(el, value)
    tick.value++
    console.log(`🔊 ${label} Lautstärke:`, Math.round(v * 100) + '%')
  })

  function remove() {
    const cm = canvasManager.value
    const bgEntry = cm?.[key]
    if (!cm || !bgEntry) return
    const video = bgEntry.videoElement
    if (video) {
      video.pause()
      video.src = ''
    }
    cm[key] = null
    cm.redrawCallback?.()
    console.log(`🗑️ ${label} entfernt`)
  }

  return {
    entry,
    isPlaying,
    time,
    duration,
    volume,
    toggle,
    seek,
    seekBackward,
    seekForward,
    updateVolume,
    remove,
  }
}
