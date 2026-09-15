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
import { glWarp as glWarpSpec } from './presets/glWarp.js'
import { glInterference as glInterferenceSpec } from './presets/glInterference.js'
import { glTruchet as glTruchetSpec } from './presets/glTruchet.js'
import { glMetaballs as glMetaballsSpec } from './presets/glMetaballs.js'
import { glFlowerOfLife as glFlowerOfLifeSpec } from './presets/glFlowerOfLife.js'
import { glLedWall as glLedWallSpec } from './presets/glLedWall.js'
import { glLedMatrix as glLedMatrixSpec } from './presets/glLedMatrix.js'
import { glVuMeter as glVuMeterSpec } from './presets/glVuMeter.js'
import { glLedRing as glLedRingSpec } from './presets/glLedRing.js'
import { glLedStrips as glLedStripsSpec } from './presets/glLedStrips.js'
import { glStageLights as glStageLightsSpec } from './presets/glStageLights.js'
import { glLedWall5 as glLedWall5Spec } from './presets/glLedWall5.js'
import { glLedCluster as glLedClusterSpec } from './presets/glLedCluster.js'
import { glLedBlinder as glLedBlinderSpec } from './presets/glLedBlinder.js'
import { glLedSunstrip as glLedSunstripSpec } from './presets/glLedSunstrip.js'
import { glLedHexPanel as glLedHexPanelSpec } from './presets/glLedHexPanel.js'
import { glFootlights as glFootlightsSpec } from './presets/glFootlights.js'
import { glCornerBeams as glCornerBeamsSpec } from './presets/glCornerBeams.js'
import { glSideLights as glSideLightsSpec } from './presets/glSideLights.js'
import { glSearchlights as glSearchlightsSpec } from './presets/glSearchlights.js'
import { glLaserFan as glLaserFanSpec } from './presets/glLaserFan.js'
import { glLaserTunnel as glLaserTunnelSpec } from './presets/glLaserTunnel.js'
import { glLaserGrid as glLaserGridSpec } from './presets/glLaserGrid.js'
import { glLaserFigure as glLaserFigureSpec } from './presets/glLaserFigure.js'
import { glLaserWall as glLaserWallSpec } from './presets/glLaserWall.js'
import { glLaserBurst as glLaserBurstSpec } from './presets/glLaserBurst.js'
import { glPortraitLed as glPortraitLedSpec } from './presets/glPortraitLed.js'
import { glPortraitGlitch as glPortraitGlitchSpec } from './presets/glPortraitGlitch.js'
import { glPortraitWave as glPortraitWaveSpec } from './presets/glPortraitWave.js'
import { glPortraitEdges as glPortraitEdgesSpec } from './presets/glPortraitEdges.js'
import { glPortraitHalftone as glPortraitHalftoneSpec } from './presets/glPortraitHalftone.js'

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
  glWarp: glWarpSpec,
  glInterference: glInterferenceSpec,
  glTruchet: glTruchetSpec,
  glMetaballs: glMetaballsSpec,
  glFlowerOfLife: glFlowerOfLifeSpec,
  glLedWall: glLedWallSpec,
  glLedMatrix: glLedMatrixSpec,
  glVuMeter: glVuMeterSpec,
  glLedRing: glLedRingSpec,
  glLedStrips: glLedStripsSpec,
  glStageLights: glStageLightsSpec,
  glLedWall5: glLedWall5Spec,
  glLedCluster: glLedClusterSpec,
  glLedBlinder: glLedBlinderSpec,
  glLedSunstrip: glLedSunstripSpec,
  glLedHexPanel: glLedHexPanelSpec,
  glFootlights: glFootlightsSpec,
  glCornerBeams: glCornerBeamsSpec,
  glSideLights: glSideLightsSpec,
  glSearchlights: glSearchlightsSpec,
  glLaserFan: glLaserFanSpec,
  glLaserTunnel: glLaserTunnelSpec,
  glLaserGrid: glLaserGridSpec,
  glLaserFigure: glLaserFigureSpec,
  glLaserWall: glLaserWallSpec,
  glLaserBurst: glLaserBurstSpec,
  glPortraitLed: glPortraitLedSpec,
  glPortraitGlitch: glPortraitGlitchSpec,
  glPortraitWave: glPortraitWaveSpec,
  glPortraitEdges: glPortraitEdgesSpec,
  glPortraitHalftone: glPortraitHalftoneSpec,
}

/** Registry-ready visualizers, keyed by preset id. */
export const glVisualizers = Object.fromEntries(
  Object.entries(glPresetSpecs).map(([id, spec]) => [id, createGlVisualizer(spec)]),
)
