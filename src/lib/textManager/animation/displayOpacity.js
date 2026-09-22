/**
 * Anzeigedauer: blendet Texte aus, deren Animation nicht permanent ist.
 *
 * 1:1 aus textManager.js herausgelöst; einzige Änderung ist der injizierbare
 * Zeitpunkt `now` (Default Date.now()).
 *
 * @module textManager/animation/displayOpacity
 */

/**
 * Deckkraft-Faktor (0–1) aus der eingestellten Anzeigedauer.
 * Permanente und geloopte Animationen liefern immer 1.
 *
 * @param {object} textObj
 * @param {number} [now] - Zeitstempel in ms
 * @returns {number} Faktor 0–1
 */
export function getDisplayOpacity(textObj, now = Date.now()) {
  const animation = textObj.animation
  if (!animation || !animation._state) return 1

  const state = animation._state

  // Dauer der Tipp-Phase für den Schreibmaschinen-Effekt abschätzen
  const typewriterInDuration = () => {
    const tw = animation.typewriter
    const chars = (textObj.content || '').length
    return chars * (tw.speed || 50)
  }

  const effects = [
    { cfg: animation.typewriter, startTime: state.startTime, inDuration: typewriterInDuration() },
    { cfg: animation.fade, startTime: state.fadeStartTime, inDuration: null },
    { cfg: animation.scale, startTime: state.scaleStartTime, inDuration: null },
    { cfg: animation.slide, startTime: state.slideStartTime, inDuration: null },
  ]

  let hasTimed = false
  let maxCycleEnd = null

  for (const { cfg, startTime, inDuration } of effects) {
    if (!cfg || !cfg.enabled) continue

    // Permanent, Loop oder noch nicht gestartet => kein zeitgesteuertes Ausblenden
    if (cfg.permanent !== false || cfg.loop || !startTime) continue

    hasTimed = true

    const displayDuration = cfg.displayDuration != null ? cfg.displayDuration : 5000
    const duration = inDuration != null ? inDuration : cfg.duration || 1000
    // Voller Zyklus = Eingang + Anzeigedauer + Ausgang.
    // Der Schreibmaschinen-Effekt hat keinen eigenen Ausgang (inDuration != null).
    const cycle =
      inDuration != null
        ? duration + displayDuration
        : cfg.direction === 'out'
          ? duration + displayDuration
          : duration * 2 + displayDuration
    const cycleEnd = startTime + cycle
    if (maxCycleEnd === null || cycleEnd > maxCycleEnd) {
      maxCycleEnd = cycleEnd
    }
  }

  // Keine zeitgesteuerte Animation aktiv => voll sichtbar
  if (!hasTimed || maxCycleEnd === null) return 1

  // Vor dem Zyklus-Ende blenden die Animationen selbst aus (Fade/Slide/Scale).
  if (now < maxCycleEnd) return 1

  // Nach dem Zyklus-Ende: garantiertes, sanftes Ausblenden (v.a. für Typewriter)
  const FADE_OUT_MS = 500
  const elapsed = now - maxCycleEnd
  if (elapsed >= FADE_OUT_MS) return 0
  return 1 - elapsed / FADE_OUT_MS
}
