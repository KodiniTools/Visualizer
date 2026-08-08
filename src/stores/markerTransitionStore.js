// src/stores/markerTransitionStore.js
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'visualizer-marker-transition'

/**
 * Marker-Übergang Store
 *
 * Optionaler Aus-/Einblende-Übergang (Dip-to-Color) beim Wechsel durch einen
 * Beat-Marker. Der sichtbare Verlauf wird im Render-Loop über `overlayAlpha()`
 * berechnet; die eigentliche Änderung (Hintergrund/Visualizer/Farbe) wird vom
 * useBeatMarkers-Composable am Mittelpunkt (voll abgedunkelt) angewendet.
 */
export const useMarkerTransitionStore = defineStore('markerTransition', () => {
  const enabled = ref(false)
  // Dauer des gesamten Übergangs (Ausblenden + Einblenden) in Sekunden, 1–5.
  const duration = ref(1.5)
  // Farbe, zu der abgeblendet wird (Standard: Schwarz).
  const color = ref('#000000')

  // Laufzeit-Status (nicht reaktiv – nur vom Render-Loop gelesen)
  let startTime = null
  let durationMs = 0

  // ── Persistenz ────────────────────────────────────────────────────────
  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        enabled.value = Boolean(data.enabled)
        if (typeof data.duration === 'number') {
          duration.value = Math.max(1, Math.min(5, data.duration))
        }
        if (typeof data.color === 'string') color.value = data.color
      }
    } catch (e) {
      console.warn('⚠️ [MarkerTransition] Laden fehlgeschlagen:', e)
    }
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ enabled: enabled.value, duration: duration.value, color: color.value }),
      )
    } catch (e) {
      console.warn('⚠️ [MarkerTransition] Speichern fehlgeschlagen:', e)
    }
  }

  watch([enabled, duration, color], persist)

  // ── Übergang steuern ──────────────────────────────────────────────────

  function clampedDuration() {
    return Math.max(1, Math.min(5, Number(duration.value) || 1))
  }

  /**
   * Startet einen Übergang ab jetzt. `now` optional (Standard performance.now()).
   */
  function start(now = performance.now()) {
    startTime = now
    durationMs = clampedDuration() * 1000
  }

  /**
   * Ob aktuell ein Übergang läuft.
   */
  function isActive() {
    return startTime !== null
  }

  /**
   * Zeit bis zum Mittelpunkt (voll abgedunkelt) in ms – dort soll die
   * Marker-Änderung angewendet werden.
   */
  function midpointMs() {
    return (clampedDuration() * 1000) / 2
  }

  /**
   * Overlay-Deckkraft (0..1) für den aktuellen Frame. Dreieckverlauf:
   * 0 → 1 (Ausblenden) in der ersten Hälfte, 1 → 0 (Einblenden) in der zweiten.
   * @param {number} now
   */
  function overlayAlpha(now = performance.now()) {
    if (startTime === null) return 0
    const elapsed = now - startTime
    if (elapsed >= durationMs || durationMs <= 0) {
      startTime = null
      return 0
    }
    const progress = elapsed / durationMs
    return progress < 0.5 ? progress * 2 : (1 - progress) * 2
  }

  function cancel() {
    startTime = null
  }

  return {
    enabled,
    duration,
    color,
    load,
    start,
    isActive,
    midpointMs,
    overlayAlpha,
    cancel,
  }
})
