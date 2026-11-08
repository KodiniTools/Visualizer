/**
 * Particle visualizers - Particle systems and space effects
 * @module visualizers/particle
 */

export { particleStorm } from './particleStorm'
export { rippleEffect } from './rippleEffect'
export { cosmicNebula } from './cosmicNebula'
export { pixelFireworks } from './pixelFireworks'
export { audioFire } from './audioFire'

// Re-import for backwards compatibility object
import { particleStorm } from './particleStorm'
import { rippleEffect } from './rippleEffect'
import { cosmicNebula } from './cosmicNebula'
import { pixelFireworks } from './pixelFireworks'
import { audioFire } from './audioFire'

import type { VisualizerRegistry } from '../core/types'

export const particleVisualizers: VisualizerRegistry = {
  particleStorm,
  rippleEffect,
  cosmicNebula,
  pixelFireworks,
  audioFire,
}
