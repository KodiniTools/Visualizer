/**
 * Global state for visualizers that need to persist data between frames
 * @module visualizers/core/state
 */

export const visualizerState = {
  particles: [],
  ripples: [],
  blossoms: [],
  shardTriangles: [],
  // Smoothed values arrays
  smoothedBars: [],
  smoothedMirroredBars: [],
  smoothedRadialBars: [],
  smooth3DBars: [],
  smoothedCircles: [],
  smoothedFluidWaves: [],
  smoothedSpiralGalaxy: [],
  // Visualizer-specific state
  matrixRain: null,
  networkPlexus: null,
  particleStorm: null,
  digitalRain: null,
  shardMosaic: null,
  singleBlossom: null,
  blossom: null,
  cosmicNebula: null,
  liquidCrystals: null,
  electricWeb: null,
  orbitingLight: null
};
