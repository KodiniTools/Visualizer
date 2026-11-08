/**
 * Geometric visualizers - Circles, grids, and geometric patterns
 * @module visualizers/geometric
 */

// Export individual visualizers from their modules
export { circles } from './circles'
export { vibratingCubes } from './vibratingCubes'
export { rainbowCube } from './rainbowCube'
export { hexagonGrid } from './hexagonGrid'
export { neonGrid } from './neonGrid'
export { shardMosaic } from './shardMosaic'
export { geometricKaleidoscope } from './geometricKaleidoscope'

// Re-import for backwards compatibility object
import { circles } from './circles'
import { vibratingCubes } from './vibratingCubes'
import { rainbowCube } from './rainbowCube'
import { hexagonGrid } from './hexagonGrid'
import { neonGrid } from './neonGrid'
import { shardMosaic } from './shardMosaic'
import { geometricKaleidoscope } from './geometricKaleidoscope'

// Backwards compatibility - grouped object export
import type { VisualizerRegistry } from '../core/types'

export const geometricVisualizers: VisualizerRegistry = {
  circles,
  vibratingCubes,
  rainbowCube,
  hexagonGrid,
  neonGrid,
  shardMosaic,
  geometricKaleidoscope,
}
