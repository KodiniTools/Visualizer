/**
 * Effects visualizers - Special effects and ambient visuals
 * @module visualizers/effects
 */

// Re-export individual visualizers from their modules
export { pulsingOrbs } from './pulsingOrbs.js';
export { lightBeams } from './lightBeams.js';
export { vortexPortal } from './vortexPortal.js';
export { liquidCrystals } from './liquidCrystals.js';
export { orbitingLight } from './orbitingLight.js';
export { heartbeat } from './heartbeat.js';
export { texturedWave } from './texturedWave.js';
export { weatherStorm } from './weatherStorm.js';

// Import for backwards compatibility object
import { pulsingOrbs } from './pulsingOrbs.js';
import { lightBeams } from './lightBeams.js';
import { vortexPortal } from './vortexPortal.js';
import { liquidCrystals } from './liquidCrystals.js';
import { orbitingLight } from './orbitingLight.js';
import { heartbeat } from './heartbeat.js';
import { texturedWave } from './texturedWave.js';
import { weatherStorm } from './weatherStorm.js';

/**
 * Collection of all effects visualizers for backwards compatibility
 * @type {Object}
 */
export const effectsVisualizers = {
  pulsingOrbs,
  lightBeams,
  vortexPortal,
  liquidCrystals,
  orbitingLight,
  heartbeat,
  texturedWave,
  weatherStorm
};
