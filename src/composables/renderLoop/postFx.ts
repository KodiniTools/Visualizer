import { createPostProcessor, shouldRunPostFx, type PostFxConfig } from '../../lib/postfx/index'

/** Post-Prozessor (Canvas2D oder WebGL2) */
export type RenderPostProcessor = ReturnType<typeof createPostProcessor>

/**
 * Post-Processing (Bloom / Trails): Prozessor mit passender Größe anlegen bzw.
 * anpassen. Fehler beim Anlegen → null (Post-FX entfällt).
 * @param proc - vorhandener Prozessor
 */
export function ensurePostProcessor(
  proc: RenderPostProcessor | null | undefined,
  width: number,
  height: number,
): RenderPostProcessor | null {
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
 * @param getProcessor - wird nur bei aktivem Post-FX aufgerufen
 */
export function applyPostFx(
  getProcessor: () => RenderPostProcessor | null | undefined,
  canvas: HTMLCanvasElement,
  config: PostFxConfig | null | undefined,
  quality?: number,
): void {
  if (!shouldRunPostFx(config, quality)) return
  const proc = getProcessor()
  if (!proc) return
  try {
    proc.apply(canvas, config ?? undefined, quality)
  } catch {
    // Post-Processing darf den Frame nicht abbrechen
  }
}
