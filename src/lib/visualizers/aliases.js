/**
 * Legacy visualizer aliases.
 *
 * Maps every classic Canvas2D visualizer id to the GPU preset that replaces
 * it. Used to migrate stored presets (built-in and user presets, beat markers)
 * once a classic id is no longer available, and to pick the GPU variant for
 * the built-in presets. While the classic visualizers still exist an explicit
 * classic id keeps working unchanged.
 *
 * @module visualizers/aliases
 */

import { Visualizers } from './index.js'

/** @type {Readonly<Record<string, string>>} classic id → GPU preset id */
export const LEGACY_ALIASES = Object.freeze({
  // Spectrum
  bars: 'glBars',
  mirroredBars: 'glBarsMirrored',
  radialBars: 'glRadialBars',
  waveform: 'glWaveform',
  waveformHorizon: 'glWaveform',
  soundWaves: 'glWaveform',
  vibratingStrings: 'glStrings',
  classicWaveform: 'glWaveform',
  bars3D: 'glTerrain',
  // Geometric
  circles: 'glRings',
  hexagonGrid: 'glHexTunnel',
  neonGrid: 'glNeonGrid',
  vibratingCubes: 'glTerrain',
  geometricKaleidoscope: 'glFractal',
  shardMosaic: 'glVoronoi',
  rainbowCube: 'glSphere',
  // Organic
  fluidWaves: 'glAurora',
  spiralGalaxy: 'glGalaxy',
  bloomingMandala: 'glMandala',
  frequencyBlossoms: 'glMandala',
  centralGlowBlossom: 'glMandala',
  cellGrowth: 'glVoronoi',
  fractalTree: 'glMandala',
  // Particle
  particleStorm: 'glParticles',
  rippleEffect: 'glShockwaves',
  cosmicNebula: 'glParticles',
  pixelFireworks: 'glParticles',
  audioFire: 'glFire',
  // Tech
  matrixRain: 'glRain',
  digitalRain: 'glRain',
  networkPlexus: 'glParticles',
  neuralNetwork: 'glParticles',
  electricWeb: 'glLightning',
  // Retro
  synthWave: 'glNeonGrid',
  pixelSpectrum: 'glBars',
  retroOscilloscope: 'glWaveform',
  arcadeBlocks: 'glBarsMirrored',
  chiptunePulse: 'glBars',
  vinylRecord: 'glRadialBars',
  // Effects
  texturedWave: 'glStrings',
  pulsingOrbs: 'glRings',
  lightBeams: 'glLightRays',
  vortexPortal: 'glTunnel',
  liquidCrystals: 'glVoronoi',
  orbitingLight: 'glRadialBars',
  heartbeat: 'glRings',
  weatherStorm: 'glLightning',
})

/** Ids of the classic Canvas2D visualizers, in catalogue order. */
export const LEGACY_VISUALIZER_IDS = Object.freeze(Object.keys(LEGACY_ALIASES))

/**
 * @param {string} id
 * @returns {boolean} true when `id` is a classic Canvas2D visualizer
 */
export function isLegacyVisualizer(id) {
  return Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, id)
}

/**
 * Resolve a stored visualizer id to one that exists in the registry.
 * An existing id is returned unchanged; a missing classic id is mapped to
 * its GPU replacement; anything else yields null.
 *
 * @param {string} id
 * @param {Record<string, unknown>} [registry] defaults to the live registry
 * @returns {string|null}
 */
export function resolveVisualizerId(id, registry = Visualizers) {
  if (typeof id !== 'string' || !id) return null
  if (registry[id]) return id
  const alias = LEGACY_ALIASES[id]
  if (alias && registry[alias]) return alias
  return null
}
