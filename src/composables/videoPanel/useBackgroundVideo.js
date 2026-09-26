import { computed } from 'vue'
import {
  seekTo,
  seekBackwardBy,
  seekForwardBy,
  displayVolume,
  setBackgroundVideoVolume,
} from './videoElements.js'

/**
 * Zustand + Steuerung eines Hintergrund-Videos des CanvasManagers
 * (`videoBackground` oder `workspaceVideoBackground`).
 *
 * @param {import('vue').Ref<object|null>} canvasManager
 * @param {'videoBackground'|'workspaceVideoBackground'} key
 * @param {import('vue').Ref<number>} tick - wird regelmäßig erhöht (Zeit-/Lautstärke-Anzeige)
 * @param {string} label - Bezeichnung für Log-Ausgaben, z. B. 'Video-Hintergrund'
 */
export function useBackgroundVideo(canvasManager, key, tick, label) {
  const entry = computed(() => {
    const cm = canvasManager.value
    if (!cm) return null
    return cm[key]
  })

  /** Video-Element des Hintergrunds (null ohne Hintergrund). */
  function element() {
    return entry.value?.videoElement || null
  }

  const isPlaying = computed(() => {
    tick.value
    const el = element()
    return el ? !el.paused : false
  })

  const time = computed(() => {
    tick.value
    return element()?.currentTime || 0
  })

  const duration = computed(() => element()?.duration || 0)

  const volume = computed(() => {
    tick.value
    const el = element()
    return el ? displayVolume(el) : 1
  })

  /** Führt fn mit dem Video-Element aus (ohne Hintergrund: nichts). */
  const withElement =
    (fn) =>
    (...args) => {
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

  const updateVolume = withElement((el, value) => {
    const v = setBackgroundVideoVolume(el, value)
    tick.value++
    console.log(`🔊 ${label} Lautstärke:`, Math.round(v * 100) + '%')
  })

  function remove() {
    const cm = canvasManager.value
    if (!cm || !cm[key]) return
    const video = cm[key].videoElement
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
