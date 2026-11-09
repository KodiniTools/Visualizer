/**
 * Tech visualizers - Digital, matrix, and network effects
 * @module visualizers/tech
 */

// Export individual visualizers from their modules
export { matrixRain } from './matrixRain'
export { digitalRain } from './digitalRain'
export { networkPlexus } from './networkPlexus'
export { neuralNetwork } from './neuralNetwork'
export { electricWeb } from './electricWeb'

// Re-import for backwards compatibility object
import { matrixRain } from './matrixRain'
import { digitalRain } from './digitalRain'
import { networkPlexus } from './networkPlexus'
import { neuralNetwork } from './neuralNetwork'
import { electricWeb } from './electricWeb'

import type { VisualizerRegistry } from '../core/types'

export const techVisualizers: VisualizerRegistry = {
  matrixRain,
  digitalRain,
  networkPlexus,
  neuralNetwork,
  electricWeb,
}
