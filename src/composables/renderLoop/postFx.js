import { createPostProcessor, shouldRunPostFx } from '../../lib/postfx/index.js'

/**
 * Post-Processing (Bloom / Trails): Prozessor mit passender Größe anlegen bzw.
 * anpassen. Fehler beim Anlegen → null (Post-FX entfällt).
 * @param {object|null} proc - vorhandener Prozessor
 * @returns {object|null}
 */
export function ensurePostProcessor(proc, width, height) {
  if (!proc) {
    try {
      return createPostProcessor(width, height)
    } catch {
      return null
    }
  }
  if (proc.width !== width || proc.height !== height) {
    try {
      proc.resize(width, height)
    } catch {
      // Größenänderung fehlgeschlagen – der Prozessor bleibt nutzbar
    }
  }
  return proc
}

/**
 * Wendet Post-FX auf ein Canvas an, falls die Konfiguration aktiv ist und die
 * Qualitätsstufe reicht. Fehler brechen den Frame nicht ab.
 * @param {() => object|null} getProcessor - wird nur bei aktivem Post-FX aufgerufen
 */
export function applyPostFx(getProcessor, canvas, config, quality) {
  if (!shouldRunPostFx(config, quality)) return
  const proc = getProcessor()
  if (!proc) return
  try {
    proc.apply(canvas, config, quality)
  } catch {
    // Post-Processing darf den Frame nicht abbrechen
  }
}
