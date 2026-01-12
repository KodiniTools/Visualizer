/**
 * Spectrum visualizers - Bar, waveform, and frequency-based effects
 * @module visualizers/spectrum
 */

// Export individual visualizers from their modules
export { bars } from './bars.js';
export { mirroredBars } from './mirroredBars.js';
export { radialBars } from './radialBars.js';
export { waveform } from './waveform.js';
export { waveformHorizon } from './waveformHorizon.js';
export { soundWaves } from './soundWaves.js';

// Re-import for backwards compatibility object
import { bars } from './bars.js';
import { mirroredBars } from './mirroredBars.js';
import { radialBars } from './radialBars.js';
import { waveform } from './waveform.js';
import { waveformHorizon } from './waveformHorizon.js';
import { soundWaves } from './soundWaves.js';

export const spectrumVisualizers = {
  bars,
  mirroredBars,
  radialBars,
  waveform,
  waveformHorizon,
  soundWaves
};
