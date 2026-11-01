import { ref, watch, onUnmounted } from 'vue'
import {
  loadTextSequenceSettings,
  saveTextSequenceSettings,
} from '../../lib/textSequenceSettings.js'
import { sortTextsById, textObjectsOf, resetAnimationState } from './textOrder.js'

/** Anzeigedauer für Texte ohne Animation. */
export const DEFAULT_SLOT_MS = 4000
/** Kleiner Puffer zwischen zwei Texten. */
const SLOT_GAP_MS = 400
const ANIMATION_KEYS = ['typewriter', 'fade', 'scale', 'slide']

/**
 * Wie lange ein Text in der Reihenwiedergabe sichtbar bleibt.
 * Mit globaler Dauer gilt sie für jeden Text gleich, sonst Einlauf-Dauer der
 * aktiven Animationen + Anzeigedauer (ohne Animation ein Standardwert).
 */
export function textSlotMs(obj, { globalEnabled = false, globalDuration = 0 } = {}) {
  if (globalEnabled) return Math.max(500, globalDuration) + SLOT_GAP_MS
  const a = obj.animation
  if (!a || !a.type || a.type === 'none') return DEFAULT_SLOT_MS
  let hold = 0
  let lead = 0
  for (const key of ANIMATION_KEYS) {
    const eff = a[key]
    if (eff && eff.enabled) {
      hold = Math.max(hold, eff.displayDuration ?? 5000)
      if (typeof eff.duration === 'number') lead = Math.max(lead, eff.duration)
    }
  }
  if (hold <= 0) hold = DEFAULT_SLOT_MS
  return lead + hold + SLOT_GAP_MS
}

/**
 * Globale Wiedergabe: alle Texte auf dem Canvas der Reihe nach abspielen.
 * Während der Wiedergabe ist nur der aktuelle Text sichtbar (Opacity); danach
 * wird der ursprüngliche Zustand wiederhergestellt. Der laufende Render-Loop
 * zeichnet die Änderungen (auch für den Recorder). Die Deckkraft-Animation
 * erzeugt keinen Verlaufsschritt (history hold auf 'texts').
 * @param {object} deps
 * @param {import('vue').Ref} deps.canvasManager
 * @param {{ hold: (segments: string[]) => () => void }} deps.historyRecorder
 */
export function useTextSequence({ canvasManager, historyRecorder }) {
  const sequencePlaying = ref(false)
  // Optionale globale Anzeigedauer, dauerhaft gespeichert (lib/textSequenceSettings.js)
  const saved = loadTextSequenceSettings()
  const globalDurationEnabled = ref(saved.enabled)
  const globalDuration = ref(saved.duration)
  watch([globalDurationEnabled, globalDuration], ([enabled, duration]) =>
    saveTextSequenceSettings({ enabled, duration }),
  )

  let sequenceTimer = null
  let sequenceIndex = 0
  let savedOpacities = new Map()
  let releaseTextsHistory = null

  function clearTimer() {
    if (sequenceTimer) {
      clearTimeout(sequenceTimer)
      sequenceTimer = null
    }
  }

  function releaseHistory() {
    releaseTextsHistory?.()
    releaseTextsHistory = null
  }

  // Reihenwiedergabe: nur Texte, die auf dem Canvas liegen
  function orderedTextObjects() {
    return sortTextsById(textObjectsOf(canvasManager).filter((o) => !o.offCanvas))
  }

  function playSequenceStep() {
    if (!sequencePlaying.value) return
    const objs = orderedTextObjects()
    if (sequenceIndex >= objs.length) {
      stopTextSequence()
      return
    }
    const current = objs[sequenceIndex]
    objs.forEach((o) => {
      o.opacity = 0
    })
    current.opacity = savedOpacities.get(current.id) ?? 100
    if (current.animation) resetAnimationState(current)
    canvasManager.value?.redrawCallback?.()

    sequenceTimer = setTimeout(
      () => {
        sequenceIndex += 1
        playSequenceStep()
      },
      textSlotMs(current, {
        globalEnabled: globalDurationEnabled.value,
        globalDuration: globalDuration.value,
      }),
    )
  }

  function startTextSequence() {
    const objs = orderedTextObjects()
    if (objs.length === 0) return
    // Laufende Wiedergabe zunächst ohne Wiederherstellung beenden.
    clearTimer()
    savedOpacities = new Map(objs.map((o) => [o.id, o.opacity ?? 100]))
    if (!releaseTextsHistory) releaseTextsHistory = historyRecorder.hold(['texts'])
    sequencePlaying.value = true
    sequenceIndex = 0
    playSequenceStep()
  }

  function stopTextSequence() {
    clearTimer()
    sequencePlaying.value = false
    if (savedOpacities.size) {
      // Alle Texte (auch inzwischen vom Canvas entfernte) zurücksetzen
      textObjectsOf(canvasManager).forEach((o) => {
        if (savedOpacities.has(o.id)) o.opacity = savedOpacities.get(o.id)
      })
      canvasManager.value?.redrawCallback?.()
    }
    releaseHistory()
  }

  // Laufende Sequenz beim Unmount stoppen (Timer + Verlaufssperre aufräumen)
  onUnmounted(() => {
    clearTimer()
    releaseHistory()
  })

  return {
    sequencePlaying,
    globalDurationEnabled,
    globalDuration,
    startTextSequence,
    stopTextSequence,
  }
}
