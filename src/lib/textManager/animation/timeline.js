/**
 * Gemeinsame Zustandsmaschine der zeitgesteuerten Text-Animationen.
 *
 * Fade, Scale und Slide waren drei fast identische Kopien desselben Ablaufs
 * (Start-Verzögerung → Eingang → Halten → Ausgang → Loop) mit jeweils eigener
 * Wertabbildung. Dieses Modul berechnet nur noch den normalisierten
 * Fortschritt `p` ∈ [0, 1]; die Animationen bilden ihn auf ihren Wert ab:
 *
 * | Animation | Wert aus p                            | p = 0        | p = 1      |
 * |-----------|---------------------------------------|--------------|------------|
 * | Fade      | `opacity = p`                         | unsichtbar   | sichtbar   |
 * | Scale     | `startScale + (endScale - startScale) * p` | startScale | endScale |
 * | Slide     | `offset = max * (1 - p)`              | außen        | Position   |
 *
 * Das gilt für alle Phasen einschließlich Start-Verzögerung, Halte-Phase,
 * Abschluss und Loop-Neustart – siehe src/__tests__/canvas/textAnimations.spec.js.
 *
 * @module textManager/animation/timeline
 */
import { applyEasing } from './easing.js'
import { ensureAnimationState } from './state.js'

/** Default-Anzeigedauer, wenn `permanent === false` ohne eigenen Wert. */
const DEFAULT_DISPLAY_DURATION = 5000
/** Default-Pause zwischen zwei Durchläufen. */
const DEFAULT_LOOP_DELAY = 1000
/** Default-Dauer eines Ein-/Ausgangs. */
const DEFAULT_DURATION = 1000

/**
 * Dauer der "Halte"-Phase zwischen Ein- und Ausgang.
 * Permanente Anzeige (Standard) ⇒ 0, dann gibt es keinen Ausgang.
 *
 * @param {object} cfg - Animations-Konfiguration
 * @returns {number} Haltedauer in ms
 */
function holdDuration(cfg) {
  if (cfg.permanent !== false) return 0
  return cfg.displayDuration != null ? cfg.displayDuration : DEFAULT_DISPLAY_DURATION
}

/**
 * Fortschritt am Anfang eines Durchlaufs: "out" startet sichtbar (p = 1),
 * "in"/"inOut" starten am Ausgangswert (p = 0).
 *
 * @param {object} cfg
 * @returns {0|1}
 */
function startProgress(cfg) {
  return cfg.direction === 'out' ? 1 : 0
}

/**
 * Länge eines vollständigen Durchlaufs (für das Loop-Handling).
 *
 * @param {object} cfg
 * @param {number} duration - Dauer eines Ein-/Ausgangs
 * @param {number} hold - Haltedauer
 * @returns {number} Zyklusdauer in ms
 */
function cycleDuration(cfg, duration, hold) {
  if (cfg.direction === 'out') return duration + hold
  if (cfg.direction === 'in' && hold === 0) return duration
  return duration * 2 + hold
}

/**
 * Berechnet den normalisierten Fortschritt einer zeitgesteuerten Animation.
 *
 * Nebeneffekt (gewollt): setzt beim ersten Aufruf den Startzeitpunkt in
 * `animation._state[stateKey]` und verschiebt ihn beim Loop-Neustart. Der
 * Render-Loop fragt jeden Frame neu – ohne diesen Zustand würde jede
 * Animation endlos von vorn beginnen.
 *
 * @param {object} animation - textObj.animation (hält den Zustand)
 * @param {object} cfg - die Konfiguration der Animation (animation.fade o.ä.)
 * @param {string} stateKey - Feld im Zustand, z.B. 'fadeStartTime'
 * @param {number} [now] - Zeitstempel in ms
 * @returns {{p: number, isComplete: boolean}} Fortschritt 0–1 und Abschluss-Flag
 */
export function resolveTimeline(animation, cfg, stateKey, now = Date.now()) {
  const state = ensureAnimationState(animation)

  // Animation starten wenn noch nicht gestartet
  if (!state[stateKey]) {
    state[stateKey] = now + (cfg.startDelay || 0)
  }
  const startTime = state[stateKey]

  // Noch in der Start-Verzögerung?
  if (now < startTime) {
    return { p: startProgress(cfg), isComplete: false }
  }

  const elapsed = now - startTime
  const duration = cfg.duration || DEFAULT_DURATION
  const hold = holdDuration(cfg)
  const easing = cfg.easing

  let p = 1
  let isComplete = false

  switch (cfg.direction) {
    case 'in': {
      // Eingang, danach halten (und ggf. nach Anzeigedauer wieder hinaus)
      if (elapsed < duration) {
        p = applyEasing(elapsed / duration, easing)
      } else if (hold === 0) {
        p = 1
        isComplete = true
      } else {
        const t = elapsed - duration
        if (t < hold) {
          p = 1
        } else if (t < hold + duration) {
          p = 1 - applyEasing((t - hold) / duration, easing)
        } else {
          p = 0
          isComplete = true
        }
      }
      break
    }

    case 'out': {
      // Sichtbar halten (Anzeigedauer), danach Ausgang
      if (hold > 0 && elapsed < hold) {
        p = 1
      } else {
        const t = elapsed - hold
        if (t >= duration) {
          p = 0
          isComplete = true
        } else {
          p = 1 - applyEasing(t / duration, easing)
        }
      }
      break
    }

    case 'inOut': {
      // Eingang → (halten) → Ausgang, immer beide Phasen
      if (elapsed < duration) {
        p = applyEasing(elapsed / duration, easing)
      } else {
        const t = elapsed - duration
        if (t < hold) {
          p = 1
        } else if (t < hold + duration) {
          p = 1 - applyEasing((t - hold) / duration, easing)
        } else {
          p = 0
          isComplete = true
        }
      }
      break
    }
  }

  // Loop-Handling: nach loopDelay von vorn beginnen
  if (isComplete && cfg.loop) {
    const loopDelay = cfg.loopDelay || DEFAULT_LOOP_DELAY
    const completionTime = startTime + cycleDuration(cfg, duration, hold)

    if (now - completionTime >= loopDelay) {
      state[stateKey] = now
      return { p: startProgress(cfg), isComplete: false }
    }
  }

  return { p, isComplete }
}
