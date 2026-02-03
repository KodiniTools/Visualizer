/**
 * Particle visualizers - Particle systems and space effects
 * @module visualizers/particle
 */

export { particleStorm } from './particleStorm.js';
export { rippleEffect } from './rippleEffect.js';
export { cosmicNebula } from './cosmicNebula.js';
export { pixelFireworks } from './pixelFireworks.js';
export { audioFire } from './audioFire.js';

// Re-import for backwards compatibility object
import { particleStorm } from './particleStorm.js';
import { rippleEffect } from './rippleEffect.js';
import { cosmicNebula } from './cosmicNebula.js';
import { pixelFireworks } from './pixelFireworks.js';
import { audioFire } from './audioFire.js';

export const particleVisualizers = {
  particleStorm,
  rippleEffect,
  cosmicNebula,
  pixelFireworks,
  audioFire
};
