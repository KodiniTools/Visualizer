/**
 * Global state for visualizers that need to persist data between frames
 * @module visualizers/core/state
 */

import type { Particle } from './Particle'

/** Onset-Flourish-Einstellung (vom Render-Loop bzw. Worker gesetzt) */
export interface OnsetFxConfig {
  enabled: boolean
  strength?: number
}

/** Onset-Werte je Band (0–1), vom Render-Loop bzw. Worker gesetzt */
export interface OnsetData {
  bass: number
  mid: number
  treble: number
  all: number
}

/**
 * Bekannte Schlüssel des geteilten Zustands. Visualizer-Module ergänzen ihren
 * eigenen Zustand per Module-Augmentation:
 *
 * ```ts
 * declare module '../core/state' {
 *   interface VisualizerStateMap {
 *     myVisualizer?: MyVisualizerState
 *   }
 * }
 * ```
 */
export interface VisualizerStateMap {
  particles: Particle[]
  blossoms: unknown[]
  // Smoothed values arrays
  smoothedBars: number[]
  smoothedMirroredBars: number[]
  smoothedRadialBars: number[]
  smooth3DBars: number[]
  smoothedCircles: number[]
  smoothedFluidWaves: number[]
  smoothedSpiralGalaxy: number[]
  // Visualizer-specific state: ripples, shardTriangles, matrixRain, networkPlexus,
  // particleStorm, digitalRain, shardMosaic, cosmicNebula, liquidCrystals,
  // electricWeb und orbitingLight werden im jeweiligen Visualizer-Modul typisiert.
  singleBlossom: unknown
  blossom: unknown

  // Vom Render-Loop/Worker pro Frame gesetzt
  /** tatsächliche Zeit seit dem letzten Frame in ms */
  _dtMs?: number
  _onsetFx?: OnsetFxConfig | null
  _onsetData?: OnsetData | null
  /** Onset-Flourish eines Layers (Mehrfach-Layer-Modus) */
  _onsetFlourish?: OnsetFxConfig | null
  /** Bildquelle für Visualizer mit needsImage */
  _imageSource?: CanvasImageSource | null
  /** LED-Text-Konfiguration (GL-Visualizer) */
  _ledText?: unknown
}

export const visualizerState: VisualizerStateMap = {
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
  orbitingLight: null,
}
