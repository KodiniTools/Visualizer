/**
 * Schreibmaschinen-Animation: berechnet den sichtbaren Teiltext.
 *
 * @module textManager/animation/typewriter
 */
import { ensureAnimationState } from './state'
import type { TextObject } from '../types'

/** Sichtbarer Text im aktuellen Frame */
export interface TypewriterResult {
  text: string
  showCursor: boolean | undefined
  cursorChar?: string
  isComplete: boolean
}

/** Default-Pause zwischen zwei Durchläufen (wie in ./timeline.js). */
const DEFAULT_LOOP_DELAY = 1000

/**
 * Berechnet den sichtbaren Text für die Typewriter-Animation.
 *
 * @param {object} textObj
 * @param {number} [now] - Zeitstempel in ms
 * @returns {{text: string, showCursor: boolean, cursorChar?: string, isComplete: boolean}}
 */
export function getTypewriterText(textObj: TextObject, now = Date.now()): TypewriterResult {
  const animation = textObj.animation

  // Wenn keine Animation oder Typewriter nicht aktiviert
  if (!animation || !animation.typewriter || !animation.typewriter.enabled) {
    return { text: textObj.content, showCursor: false, isComplete: true }
  }

  const tw = animation.typewriter
  const state = ensureAnimationState(animation)
  const fullText = textObj.content

  // Animation starten wenn noch nicht gestartet
  if (!state.isPlaying && !state.startTime) {
    state.startTime = now + (tw.startDelay || 0)
    state.isPlaying = true
    state.currentIndex = 0
  }

  // null zählt wie 0 (wie bisher bei der Arithmetik mit null)
  const startTime = state.startTime ?? 0

  // Noch in der Start-Verzögerung?
  if (now < startTime) {
    return {
      text: '',
      showCursor: tw.showCursor,
      cursorChar: tw.cursorChar || '|',
      isComplete: false,
    }
  }

  // Berechne wie viele Buchstaben sichtbar sein sollten
  const elapsed = now - startTime
  const speed = tw.speed || 50
  const targetIndex = Math.floor(elapsed / speed)

  // Alle Buchstaben angezeigt?
  if (targetIndex >= fullText.length) {
    // Animation komplett
    if (tw.loop) {
      // Nach loopDelay neu starten
      const completionTime = startTime + fullText.length * speed
      const timeSinceComplete = now - completionTime

      // `??` statt `||`: eine bewusst eingestellte Pause von 0 ms bedeutet
      // "nahtlos wiederholen" und darf nicht zum Default werden.
      if (timeSinceComplete >= (tw.loopDelay ?? DEFAULT_LOOP_DELAY)) {
        // Neustart
        state.startTime = now
        state.currentIndex = 0
        return {
          text: '',
          showCursor: tw.showCursor,
          cursorChar: tw.cursorChar || '|',
          isComplete: false,
        }
      }
    }

    // Fertig - zeige vollen Text
    state.isPlaying = false
    return {
      text: fullText,
      showCursor: tw.showCursor && tw.loop, // Cursor nur bei Loop weiter anzeigen
      cursorChar: tw.cursorChar || '|',
      isComplete: true,
    }
  }

  // Teiltext anzeigen
  state.currentIndex = targetIndex
  const visibleText = fullText.substring(0, targetIndex + 1)

  return {
    text: visibleText,
    showCursor: tw.showCursor,
    cursorChar: tw.cursorChar || '|',
    isComplete: false,
  }
}

/**
 * Startet die Typewriter-Animation neu.
 * @param {object} textObj
 */
export function restartTypewriter(textObj: TextObject | null | undefined): void {
  if (!textObj || !textObj.animation) return

  const state = ensureAnimationState(textObj.animation)
  state.startTime = null
  state.isPlaying = false
  state.currentIndex = 0
}
