// src/stores/backgroundBridgeStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Serialisierbarer Hintergrund-Snapshot aus useBgSettings. */
export type BackgroundSnapshot = Record<string, unknown>
export type BackgroundCaptureFn = () => BackgroundSnapshot | null
export type BackgroundApplyFn = (snapshot: BackgroundSnapshot) => void

/**
 * Background-Bridge Store
 *
 * Verbindet die Hintergrund-Einstellungen (die im `useBgSettings`-Composable
 * innerhalb des CanvasControlPanel leben) mit anderen Teilen der App – z.B.
 * der Sticky-Player-Bar, damit Beat-Marker den kompletten Hintergrund
 * (Farbe, Gradient, Audio-Reaktive Effekte) erfassen und an gewählten Stellen
 * wieder anwenden können.
 *
 * `useBgSettings` registriert beim Mounten seine `capture`- und `apply`-
 * Funktionen. Andere Composables lesen/schreiben den Hintergrund dann über
 * diesen Store, ohne die Composable-Instanz direkt zu benötigen.
 */
export const useBackgroundBridgeStore = defineStore('backgroundBridge', () => {
  const captureFn = ref<BackgroundCaptureFn | null>(null)
  const applyFn = ref<BackgroundApplyFn | null>(null)

  /**
   * Registriert die Capture-/Apply-Funktionen aus useBgSettings.
   * @param capture - liefert einen Hintergrund-Snapshot
   * @param apply - wendet einen Snapshot an
   */
  function register(
    capture: BackgroundCaptureFn | null | undefined,
    apply: BackgroundApplyFn | null | undefined,
  ) {
    captureFn.value = capture || null
    applyFn.value = apply || null
  }

  /**
   * Erfasst den aktuellen Hintergrund als serialisierbaren Snapshot.
   * @returns Snapshot oder null, wenn nicht verfügbar
   */
  function captureSnapshot(): BackgroundSnapshot | null {
    if (!captureFn.value) {
      console.warn('⚠️ [BackgroundBridge] Kein Capture-Handler registriert')
      return null
    }
    try {
      return captureFn.value()
    } catch (e) {
      console.error('❌ [BackgroundBridge] Snapshot-Erfassung fehlgeschlagen:', e)
      return null
    }
  }

  /**
   * Wendet einen zuvor erfassten Hintergrund-Snapshot an.
   */
  function applySnapshot(snapshot: BackgroundSnapshot | null | undefined) {
    if (!snapshot) return
    if (!applyFn.value) {
      console.warn('⚠️ [BackgroundBridge] Kein Apply-Handler registriert')
      return
    }
    try {
      applyFn.value(snapshot)
    } catch (e) {
      console.error('❌ [BackgroundBridge] Snapshot-Anwendung fehlgeschlagen:', e)
    }
  }

  /**
   * Ob die Bridge bereit ist (Handler registriert).
   */
  function isReady(): boolean {
    return !!captureFn.value
  }

  return {
    register,
    captureSnapshot,
    applySnapshot,
    isReady,
  }
})
