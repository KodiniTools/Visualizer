/**
 * Geometric visualizers - Circles, grids, and geometric patterns
 * @module visualizers/geometric
 */

// Export individual visualizers from their modules
export { circles } from './circles.js';
export { vibratingCubes } from './vibratingCubes.js';
export { rainbowCube } from './rainbowCube.js';
export { hexagonGrid } from './hexagonGrid.js';
export { neonGrid } from './neonGrid.js';
export { shardMosaic } from './shardMosaic.js';
export { geometricKaleidoscope } from './geometricKaleidoscope.js';

// Re-import for backwards compatibility object
import { circles } from './circles.js';
import { vibratingCubes } from './vibratingCubes.js';
import { rainbowCube } from './rainbowCube.js';
import { hexagonGrid } from './hexagonGrid.js';
import { neonGrid } from './neonGrid.js';
import { shardMosaic } from './shardMosaic.js';
import { geometricKaleidoscope } from './geometricKaleidoscope.js';

// Backwards compatibility - grouped object export
export const geometricVisualizers = {
  circles,
  vibratingCubes,
  rainbowCube,
  hexagonGrid,
  neonGrid,
  shardMosaic,
  geometricKaleidoscope
};
