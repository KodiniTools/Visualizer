// src/stores/markerTransitionStore.js
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'visualizer-marker-transition'

/**
 * Marker-Übergang Store (Crossfade)
 *
 * Optionaler echter Crossfade beim Wechsel durch einen Beat-Marker: Der letzte
 * Frame der alten Szene wird eingefroren, die Änderung angewendet, und der alte
 * Frame über der neuen (live animierten) Szene ausgeblendet.
 *
 * Ablauf (orchestriert von useBeatMarkers + MarkerTransitionRenderer):
 *  1. beginCapture() – kurze Fenster, in dem der Renderer pro Ziel (Live &
 *     Aufnahme) den aktuellen (alten) Frame einfriert.
 *  2. startFade() – nach Anwendung der Marker-Änderung; blendet den alten Frame
 *     über `duration` Sekunden aus.
 */
export const useMarkerTransitionStore = defineStore('markerTransition', () => {
  const enabled = ref(false)
  // Dauer des Crossfades in Sekunden, 1–5.
  const duration = ref(1.5)

  // Laufzeit-Status (nicht reaktiv – nur von Composable/Renderer genutzt)
  let active = false
  let startTime = null
  let durationMs = 0

  // Dauer des Capture-Fensters vor dem Fade (ms). Gibt Live- und Aufnahme-Ziel
  // Zeit, ihren alten Frame einzufrieren, bevor die Änderung greift.
  const captureMs = 40

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
      }
    } catch (e) {
      console.warn('⚠️ [MarkerTransition] Laden fehlgeschlagen:', e)
    }
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ enabled: enabled.value, duration: duration.value }),
      )
    } catch (e) {
      console.warn('⚠️ [MarkerTransition] Speichern fehlgeschlagen:', e)
    }
  }

  watch([enabled, duration], persist)

  // ── Übergang steuern ──────────────────────────────────────────────────

  function clampedDuration() {
    return Math.max(1, Math.min(5, Number(duration.value) || 1))
  }

  /**
   * Startet das Capture-Fenster: Der Renderer friert nun den alten Frame ein.
   */
  function beginCapture() {
    active = true
    startTime = null
  }

  /**
   * Startet den eigentlichen Ausblend-Verlauf (nach Anwenden der Änderung).
   */
  function startFade(now = performance.now()) {
    startTime = now
    durationMs = clampedDuration() * 1000
  }

  /** Capture-Phase aktiv (Frame einfrieren, alte Szene noch sichtbar). */
  function isCapturing() {
    return active && startTime === null
  }

  /** Fade-Phase aktiv (alten Frame ausblenden). */
  function isFading() {
    return active && startTime !== null
  }

  /**
   * Fortschritt der Fade-Phase 0..1, oder null wenn nicht im Fade.
   * @param {number} now
   */
  function fadeProgress(now = performance.now()) {
    if (!isFading()) return null
    if (durationMs <= 0) return 1
    return (now - startTime) / durationMs
  }

  /** Beendet den Übergang. */
  function end() {
    active = false
    startTime = null
  }

  function cancel() {
    end()
  }

  return {
    enabled,
    duration,
    captureMs,
    load,
    beginCapture,
    startFade,
    isCapturing,
    isFading,
    fadeProgress,
    end,
    cancel,
  }
})
