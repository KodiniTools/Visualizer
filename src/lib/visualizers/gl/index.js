/**
 * GPU (WebGL2) visualizer presets.
 *
 * Each preset is a fragment shader rendered by GLVisualizerEngine and wrapped
 * by createGlVisualizer so it satisfies the same `draw(ctx, …)` contract as
 * every Canvas2D visualizer. On machines without WebGL2 the wrapped preset
 * draws its Canvas2D `fallback` instead.
 *
 * @module visualizers/gl
 */

import { createGlVisualizer } from './createGlVisualizer.js'
import { glBars as glBarsSpec, glBarsMirrored as glBarsMirroredSpec } from './presets/glBars.js'
import { glMandala as glMandalaSpec } from './presets/glMandala.js'
import { glAurora as glAuroraSpec } from './presets/glAurora.js'

export { createGlVisualizer, getSharedEngine, resetSharedEngine } from './createGlVisualizer.js'
export { GLVisualizerEngine } from './GLVisualizerEngine.js'

/** Raw preset specs (id, shader, uniforms, fallback) – useful for tooling/tests. */
export const glPresetSpecs = {
  glBars: glBarsSpec,
  glBarsMirrored: glBarsMirroredSpec,
  glMandala: glMandalaSpec,
  glAurora: glAuroraSpec,
}

/** Registry-ready visualizers, keyed by preset id. */
export const glVisualizers = Object.fromEntries(
  Object.entries(glPresetSpecs).map(([id, spec]) => [id, createGlVisualizer(spec)]),
)
