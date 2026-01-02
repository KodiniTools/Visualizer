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
  drawRoundedBar
} from './core/index.js';

// Import all visualizer categories
import { spectrumVisualizers } from './spectrum/index.js';
import { geometricVisualizers } from './geometric/index.js';
import { organicVisualizers } from './organic/index.js';
import { particleVisualizers } from './particle/index.js';
import { techVisualizers } from './tech/index.js';
import { retroVisualizers } from './retro/index.js';
import { effectsVisualizers } from './effects/index.js';

/**
 * All visualizers combined into a single object.
 * This maintains full backward compatibility with the original API.
 *
 * @type {Object.<string, {name_de: string, name_en: string, draw: Function, init?: Function, needsTimeData?: boolean}>}
 */
export const Visualizers = {
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
  ...effectsVisualizers
};

// Also export individual category collections for selective imports
export {
  spectrumVisualizers,
  geometricVisualizers,
  organicVisualizers,
  particleVisualizers,
  techVisualizers,
  retroVisualizers,
  effectsVisualizers
};

// Default export for convenience
export default Visualizers;
