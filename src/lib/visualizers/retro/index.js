/**
 * Retro visualizers - 80s, synthwave, and pixel art styles
 * @module visualizers/retro
 */

export { synthWave } from './synthWave.js';
export { retroOscilloscope } from './retroOscilloscope.js';
export { arcadeBlocks } from './arcadeBlocks.js';
export { chiptunePulse } from './chiptunePulse.js';
export { pixelSpectrum } from './pixelSpectrum.js';

// Re-import for backwards compatibility object
import { synthWave } from './synthWave.js';
import { retroOscilloscope } from './retroOscilloscope.js';
import { arcadeBlocks } from './arcadeBlocks.js';
import { chiptunePulse } from './chiptunePulse.js';
import { pixelSpectrum } from './pixelSpectrum.js';

export const retroVisualizers = {
  synthWave,
  retroOscilloscope,
  arcadeBlocks,
  chiptunePulse,
  pixelSpectrum
};
