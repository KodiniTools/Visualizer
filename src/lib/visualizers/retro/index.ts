/**
 * Retro visualizers - 80s, synthwave, and pixel art styles
 * @module visualizers/retro
 */

export { synthWave } from './synthWave'
export { retroOscilloscope } from './retroOscilloscope'
export { arcadeBlocks } from './arcadeBlocks'
export { chiptunePulse } from './chiptunePulse'
export { pixelSpectrum } from './pixelSpectrum'
export { vinylRecord } from './vinylRecord'

// Re-import for backwards compatibility object
import { synthWave } from './synthWave'
import { retroOscilloscope } from './retroOscilloscope'
import { arcadeBlocks } from './arcadeBlocks'
import { chiptunePulse } from './chiptunePulse'
import { pixelSpectrum } from './pixelSpectrum'
import { vinylRecord } from './vinylRecord'

import type { VisualizerRegistry } from '../core/types'

export const retroVisualizers: VisualizerRegistry = {
  synthWave,
  retroOscilloscope,
  arcadeBlocks,
  chiptunePulse,
  pixelSpectrum,
  vinylRecord,
}
