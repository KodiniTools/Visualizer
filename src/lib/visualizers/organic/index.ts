/**
 * Organic visualizers - Natural, flowing, and living patterns
 * @module visualizers/organic
 */

// Individual visualizer imports
export { spiralGalaxy } from './spiralGalaxy'
export { bloomingMandala } from './bloomingMandala'
export { frequencyBlossoms } from './frequencyBlossoms'
export { centralGlowBlossom } from './centralGlowBlossom'
export { fluidWaves } from './fluidWaves'
export { cellGrowth } from './cellGrowth'
export { fractalTree } from './fractalTree'

// Aggregated export for convenience
import { spiralGalaxy } from './spiralGalaxy'
import { bloomingMandala } from './bloomingMandala'
import { frequencyBlossoms } from './frequencyBlossoms'
import { centralGlowBlossom } from './centralGlowBlossom'
import { fluidWaves } from './fluidWaves'
import { cellGrowth } from './cellGrowth'
import { fractalTree } from './fractalTree'

import type { VisualizerRegistry } from '../core/types'

export const organicVisualizers: VisualizerRegistry = {
  spiralGalaxy,
  bloomingMandala,
  frequencyBlossoms,
  centralGlowBlossom,
  fluidWaves,
  cellGrowth,
  fractalTree,
}
