/**
 * Effects visualizers - Special effects and ambient visuals
 * @module visualizers/effects
 */

// Re-export individual visualizers from their modules
export { pulsingOrbs } from './pulsingOrbs'
export { lightBeams } from './lightBeams'
export { vortexPortal } from './vortexPortal'
export { liquidCrystals } from './liquidCrystals'
export { orbitingLight } from './orbitingLight'
export { heartbeat } from './heartbeat'
export { texturedWave } from './texturedWave'
export { weatherStorm } from './weatherStorm'

// Import for backwards compatibility object
import { pulsingOrbs } from './pulsingOrbs'
import { lightBeams } from './lightBeams'
import { vortexPortal } from './vortexPortal'
import { liquidCrystals } from './liquidCrystals'
import { orbitingLight } from './orbitingLight'
import { heartbeat } from './heartbeat'
import { texturedWave } from './texturedWave'
import { weatherStorm } from './weatherStorm'

/**
 * Collection of all effects visualizers for backwards compatibility
 */
import type { VisualizerRegistry } from '../core/types'

export const effectsVisualizers: VisualizerRegistry = {
  pulsingOrbs,
  lightBeams,
  vortexPortal,
  liquidCrystals,
  orbitingLight,
  heartbeat,
  texturedWave,
  weatherStorm,
}
