/**
 * Tech visualizers - Digital, matrix, and network effects
 * @module visualizers/tech
 */

// Export individual visualizers from their modules
export { matrixRain } from './matrixRain.js';
export { digitalRain } from './digitalRain.js';
export { networkPlexus } from './networkPlexus.js';
export { neuralNetwork } from './neuralNetwork.js';
export { electricWeb } from './electricWeb.js';

// Re-import for backwards compatibility object
import { matrixRain } from './matrixRain.js';
import { digitalRain } from './digitalRain.js';
import { networkPlexus } from './networkPlexus.js';
import { neuralNetwork } from './neuralNetwork.js';
import { electricWeb } from './electricWeb.js';

export const techVisualizers = {
  matrixRain,
  digitalRain,
  networkPlexus,
  neuralNetwork,
  electricWeb
};
