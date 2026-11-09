/**
 * Audio Visualizers - Modular Architecture
 *
 * This is the main entry point for all visualizers.
 * The API is fully compatible with the original visualizers.js
 *
 * @module visualizers
 */

// Re-export core utilities for external use
export {
  CONSTANTS,
  visualizerState,
  hexToHsl,
  Particle,
  expo01,
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  getFrequencyBasedSmoothing,
  applySmoothValue,
  withSafeCanvasState,
  drawRoundedBar,
} from './core/index'

// Import all visualizer categories
import { spectrumVisualizers } from './spectrum/index'
import { geometricVisualizers } from './geometric/index'
import { organicVisualizers } from './organic/index'
import { particleVisualizers } from './particle/index'
import { techVisualizers } from './tech/index'
import { retroVisualizers } from './retro/index'
import { effectsVisualizers } from './effects/index'
import { glVisualizers } from './gl/index'
import type { VisualizerRegistry } from './core/types'

export type {
  VisualizerContext,
  VisualizerDefinition,
  VisualizerDrawFn,
  VisualizerRegistry,
} from './core/types'

/**
 * All visualizers combined into a single object.
 * This maintains full backward compatibility with the original API.
 */
export const Visualizers: VisualizerRegistry = {
  // Spectrum visualizers (bars, waveforms)
  ...spectrumVisualizers,

  // Geometric visualizers (circles, grids, patterns)
  ...geometricVisualizers,

  // Organic visualizers (natural, flowing patterns)
  ...organicVisualizers,

  // Particle visualizers (particle systems, space effects)
  ...particleVisualizers,

  // Tech visualizers (digital, matrix, network)
  ...techVisualizers,

  // Retro visualizers (80s, synthwave, pixel art)
  ...retroVisualizers,

  // Effects visualizers (special effects, ambient)
  ...effectsVisualizers,

  // GPU visualizers (WebGL2 shader presets, Canvas2D fallback built in)
  ...glVisualizers,
}

// Also export individual category collections for selective imports
export {
  spectrumVisualizers,
  geometricVisualizers,
  organicVisualizers,
  particleVisualizers,
  techVisualizers,
  retroVisualizers,
  effectsVisualizers,
  glVisualizers,
}

// Default export for convenience
export default Visualizers
