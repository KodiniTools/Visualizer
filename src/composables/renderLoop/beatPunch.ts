import {
  createPunchVariationState,
  drawPunchedBands,
  punchScalesUniform,
  updatePunchVariation,
} from '../../lib/visualizers/core/beatPunchVariation'
import { onsetForSource, advancePunch, punchScale } from '../../lib/visualizers/core/onsetReactive'
import { getAudioAnalysisData } from '../../lib/audio/audioAnalysisData'

/** Beat-Punch-Einstellungen (Visualizer-Store oder Layer) */
export interface BeatPunchSettings {
  beatPunchEnabled: boolean
  beatPunchSource: string
  beatPunchStrength: number
  beatPunchVariation?: number
}

/** Zeichen-Callback eines Visualizers */
export type PunchDrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void

/**
 * Beat-Punch: onset-gesteuerter Zoom der gesamten Visualizer-Ebene. Die
 * Hüllkurve läuft einmal pro Frame (update); drawWithPunch wendet den Zoom an
 * jeder Stelle an, an der der Visualizer eingesetzt wird.
 */
export function createBeatPunch(visualizerStore: BeatPunchSettings) {
  let env = 0
  let scale = 1
  // Variation: Zoom je Spalte (null = einheitlich, einfacher Zoom)
  const variationState = createPunchVariationState()
  let bandScales: number[] | null = null

  /** Hüllkurve fortschreiben. Aus (oder ohne Audio) → sauber 1.0. */
  function update() {
    if (!visualizerStore.beatPunchEnabled) {
      env = 0
      scale = 1
      bandScales = null
      return
    }
    const onset = onsetForSource(getAudioAnalysisData(), visualizerStore.beatPunchSource)
    env = advancePunch(env, onset)
    scale = punchScale(env, visualizerStore.beatPunchStrength)

    const variation = visualizerStore.beatPunchVariation
    if (variation !== undefined && variation > 0) {
      const scales = updatePunchVariation(
        variationState,
        onset,
        visualizerStore.beatPunchStrength,
        variation,
      )
      bandScales = punchScalesUniform(scales) ? null : scales
    } else {
      bandScales = null
    }
  }

  /**
   * Ruft den Zeichen-Callback des Visualizers mit dem aktuellen Zoom um die
   * Canvas-Mitte auf. Ohne Zoom (~1.0) unverändert.
   */
  function drawWithPunch(
    cb: PunchDrawFn | null | undefined,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    if (!cb) return
    if (bandScales) {
      drawPunchedBands(ctx, cb as Parameters<typeof drawPunchedBands>[1], width, height, bandScales)
      return
    }
    const s = scale
    if (s <= 1.0001) {
      cb(ctx, width, height)
      return
    }
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.scale(s, s)
    ctx.translate(-width / 2, -height / 2)
    cb(ctx, width, height)
    ctx.restore()
  }

  return { update, drawWithPunch }
}

/**
 * Beat-Punch eines einzelnen Layers (eigene Hüllkurve je Layer-ID).
 */
export function createLayerPunch() {
  const envs = new Map<unknown, number>()
  return {
    /** Hüllkurve fortschreiben und Zoomfaktor liefern (1 = aus). */
    update(layerId: unknown, fx: BeatPunchSettings): number {
      if (!fx.beatPunchEnabled) {
        envs.delete(layerId)
        return 1
      }
      const onset = onsetForSource(getAudioAnalysisData(), fx.beatPunchSource)
      const env = advancePunch(envs.get(layerId) || 0, onset)
      envs.set(layerId, env)
      return punchScale(env, fx.beatPunchStrength)
    },
    prune(keepIds: Set<unknown>): void {
      for (const id of envs.keys()) {
        if (!keepIds.has(id)) envs.delete(id)
      }
    },
  }
}
