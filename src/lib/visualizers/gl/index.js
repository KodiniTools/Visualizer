/**
 * GPU (WebGL2) visualizer presets.
 *
 * Each preset is a fragment shader rendered by GLVisualizerEngine and wrapped
 * by createGlVisualizer so it satisfies the same `draw(ctx, …)` contract as
 * every Canvas2D visualizer. On machines without WebGL2 the wrapped preset
 * draws its Canvas2D `fallback` instead.
 *
 * @module visualizers/gl
 */

import { createGlVisualizer } from './createGlVisualizer.js'
import { glBars as glBarsSpec, glBarsMirrored as glBarsMirroredSpec } from './presets/glBars.js'
import { glMandala as glMandalaSpec } from './presets/glMandala.js'
import { glAurora as glAuroraSpec } from './presets/glAurora.js'
import { glParticles as glParticlesSpec } from './presets/glParticles.js'
import { glTunnel as glTunnelSpec } from './presets/glTunnel.js'
import { glRadialBars as glRadialBarsSpec } from './presets/glRadialBars.js'
import { glWaveform as glWaveformSpec } from './presets/glWaveform.js'
import { glStrings as glStringsSpec } from './presets/glStrings.js'
import { glNeonGrid as glNeonGridSpec } from './presets/glNeonGrid.js'
import { glRings as glRingsSpec } from './presets/glRings.js'
import { glLightRays as glLightRaysSpec } from './presets/glLightRays.js'
import { glFire as glFireSpec } from './presets/glFire.js'
import { glRain as glRainSpec } from './presets/glRain.js'
import { glShockwaves as glShockwavesSpec } from './presets/glShockwaves.js'
import { glTerrain as glTerrainSpec } from './presets/glTerrain.js'
import { glVoronoi as glVoronoiSpec } from './presets/glVoronoi.js'
import { glSphere as glSphereSpec } from './presets/glSphere.js'
import { glCymatics as glCymaticsSpec } from './presets/glCymatics.js'
import { glLightning as glLightningSpec } from './presets/glLightning.js'
import { glFractal as glFractalSpec } from './presets/glFractal.js'
import { glGalaxy as glGalaxySpec } from './presets/glGalaxy.js'
import { glStargate as glStargateSpec } from './presets/glStargate.js'
import { glHexTunnel as glHexTunnelSpec } from './presets/glHexTunnel.js'
import { glPlasma as glPlasmaSpec } from './presets/glPlasma.js'

export { createGlVisualizer, getSharedEngine, resetSharedEngine } from './createGlVisualizer.js'
export { GLVisualizerEngine } from './GLVisualizerEngine.js'

/** Raw preset specs (id, shader, uniforms, fallback) – useful for tooling/tests. */
export const glPresetSpecs = {
  glBars: glBarsSpec,
  glBarsMirrored: glBarsMirroredSpec,
  glRadialBars: glRadialBarsSpec,
  glWaveform: glWaveformSpec,
  glStrings: glStringsSpec,
  glMandala: glMandalaSpec,
  glAurora: glAuroraSpec,
  glTunnel: glTunnelSpec,
  glNeonGrid: glNeonGridSpec,
  glRings: glRingsSpec,
  glLightRays: glLightRaysSpec,
  glParticles: glParticlesSpec,
  glFire: glFireSpec,
  glRain: glRainSpec,
  glShockwaves: glShockwavesSpec,
  glTerrain: glTerrainSpec,
  glVoronoi: glVoronoiSpec,
  glSphere: glSphereSpec,
  glCymatics: glCymaticsSpec,
  glLightning: glLightningSpec,
  glFractal: glFractalSpec,
  glGalaxy: glGalaxySpec,
  glStargate: glStargateSpec,
  glHexTunnel: glHexTunnelSpec,
  glPlasma: glPlasmaSpec,
}

/** Registry-ready visualizers, keyed by preset id. */
export const glVisualizers = Object.fromEntries(
  Object.entries(glPresetSpecs).map(([id, spec]) => [id, createGlVisualizer(spec)]),
)
