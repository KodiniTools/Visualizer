/**
 * Schreibmaschinen-Animation: berechnet den sichtbaren Teiltext.
 *
 * @module textManager/animation/typewriter
 */
import { ensureAnimationState } from './state.js'

/**
 * Berechnet den sichtbaren Text für die Typewriter-Animation.
 *
 * @param {object} textObj
 * @param {number} [now] - Zeitstempel in ms
 * @returns {{text: string, showCursor: boolean, cursorChar?: string, isComplete: boolean}}
 */
export function getTypewriterText(textObj, now = Date.now()) {
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

  // Noch in der Start-Verzögerung?
  if (now < state.startTime) {
    return {
      text: '',
      showCursor: tw.showCursor,
      cursorChar: tw.cursorChar || '|',
      isComplete: false,
    }
  }

  // Berechne wie viele Buchstaben sichtbar sein sollten
  const elapsed = now - state.startTime
  const speed = tw.speed || 50
  const targetIndex = Math.floor(elapsed / speed)

  // Alle Buchstaben angezeigt?
  if (targetIndex >= fullText.length) {
    // Animation komplett
    if (tw.loop) {
      // Nach loopDelay neu starten
      const completionTime = state.startTime + fullText.length * speed
      const timeSinceComplete = now - completionTime

      if (timeSinceComplete >= (tw.loopDelay || 1000)) {
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
export function restartTypewriter(textObj) {
  if (!textObj || !textObj.animation) return

  const state = ensureAnimationState(textObj.animation)
  state.startTime = null
  state.isPlaying = false
  state.currentIndex = 0
}
