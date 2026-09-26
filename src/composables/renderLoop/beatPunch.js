import {
  createPunchVariationState,
  drawPunchedBands,
  punchScalesUniform,
  updatePunchVariation,
} from '../../lib/visualizers/core/beatPunchVariation.js'
import {
  onsetForSource,
  advancePunch,
  punchScale,
} from '../../lib/visualizers/core/onsetReactive.js'

/**
 * Beat-Punch: onset-gesteuerter Zoom der gesamten Visualizer-Ebene. Die
 * Hüllkurve läuft einmal pro Frame (update); drawWithPunch wendet den Zoom an
 * jeder Stelle an, an der der Visualizer eingesetzt wird.
 * @param {object} visualizerStore
 */
export function createBeatPunch(visualizerStore) {
  let env = 0
  let scale = 1
  // Variation: Zoom je Spalte (null = einheitlich, einfacher Zoom)
  const variationState = createPunchVariationState()
  let bandScales = null

  /** Hüllkurve fortschreiben. Aus (oder ohne Audio) → sauber 1.0. */
  function update() {
    if (!visualizerStore.beatPunchEnabled) {
      env = 0
      scale = 1
      bandScales = null
      return
    }
    const onset = onsetForSource(window.audioAnalysisData, visualizerStore.beatPunchSource)
    env = advancePunch(env, onset)
    scale = punchScale(env, visualizerStore.beatPunchStrength)

    const variation = visualizerStore.beatPunchVariation
    if (variation > 0) {
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
  function drawWithPunch(cb, ctx, width, height) {
    if (!cb) return
    if (bandScales) {
      drawPunchedBands(ctx, cb, width, height, bandScales)
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
 * @returns {{ update(layerId, fx): number, prune(keepIds: Set) }}
 */
export function createLayerPunch() {
  const envs = new Map()
  return {
    /** Hüllkurve fortschreiben und Zoomfaktor liefern (1 = aus). */
    update(layerId, fx) {
      if (!fx.beatPunchEnabled) {
        envs.delete(layerId)
        return 1
      }
      const onset = onsetForSource(window.audioAnalysisData, fx.beatPunchSource)
      const env = advancePunch(envs.get(layerId) || 0, onset)
      envs.set(layerId, env)
      return punchScale(env, fx.beatPunchStrength)
    },
    prune(keepIds) {
      for (const id of envs.keys()) {
        if (!keepIds.has(id)) envs.delete(id)
      }
    },
  }
}
