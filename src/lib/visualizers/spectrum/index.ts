/**
 * Spectrum visualizers - Bar, waveform, and frequency-based effects
 * @module visualizers/spectrum
 */

// Export individual visualizers from their modules
export { bars } from './bars'
export { mirroredBars } from './mirroredBars'
export { radialBars } from './radialBars'
export { waveform } from './waveform'
export { waveformHorizon } from './waveformHorizon'
export { soundWaves } from './soundWaves'
export { vibratingStrings } from './vibratingStrings'
export { classicWaveform } from './classicWaveform'
export { bars3D } from './bars3D'

// Re-import for backwards compatibility object
import { bars } from './bars'
import { mirroredBars } from './mirroredBars'
import { radialBars } from './radialBars'
import { waveform } from './waveform'
import { waveformHorizon } from './waveformHorizon'
import { soundWaves } from './soundWaves'
import { vibratingStrings } from './vibratingStrings'
import { classicWaveform } from './classicWaveform'
import { bars3D } from './bars3D'

import type { VisualizerRegistry } from '../core/types'

export const spectrumVisualizers: VisualizerRegistry = {
  bars,
  mirroredBars,
  radialBars,
  waveform,
  waveformHorizon,
  soundWaves,
  vibratingStrings,
  classicWaveform,
  bars3D,
}
