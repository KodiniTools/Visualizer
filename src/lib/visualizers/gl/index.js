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
import {
  glLedDigit0 as glLedDigit0Spec,
  glLedDigit1 as glLedDigit1Spec,
  glLedDigit2 as glLedDigit2Spec,
  glLedDigit3 as glLedDigit3Spec,
  glLedDigit4 as glLedDigit4Spec,
  glLedDigit5 as glLedDigit5Spec,
  glLedDigit6 as glLedDigit6Spec,
  glLedDigit7 as glLedDigit7Spec,
  glLedDigit8 as glLedDigit8Spec,
  glLedDigit9 as glLedDigit9Spec,
  glLedLetterA as glLedLetterASpec,
  glLedLetterB as glLedLetterBSpec,
  glLedLetterC as glLedLetterCSpec,
  glLedLetterD as glLedLetterDSpec,
  glLedLetterE as glLedLetterESpec,
  glLedLetterF as glLedLetterFSpec,
  glLedLetterG as glLedLetterGSpec,
  glLedLetterH as glLedLetterHSpec,
  glLedLetterI as glLedLetterISpec,
  glLedLetterJ as glLedLetterJSpec,
  glLedLetterK as glLedLetterKSpec,
  glLedLetterL as glLedLetterLSpec,
  glLedLetterM as glLedLetterMSpec,
  glLedLetterN as glLedLetterNSpec,
  glLedLetterO as glLedLetterOSpec,
  glLedLetterP as glLedLetterPSpec,
  glLedLetterQ as glLedLetterQSpec,
  glLedLetterR as glLedLetterRSpec,
  glLedLetterS as glLedLetterSSpec,
  glLedLetterT as glLedLetterTSpec,
  glLedLetterU as glLedLetterUSpec,
  glLedLetterV as glLedLetterVSpec,
  glLedLetterW as glLedLetterWSpec,
  glLedLetterX as glLedLetterXSpec,
  glLedLetterY as glLedLetterYSpec,
  glLedLetterZ as glLedLetterZSpec,
} from './presets/glLedDigits.js'
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
import { glDiscoBall as glDiscoBallSpec } from './presets/glDiscoBall.js'
import { glDiscoReflections as glDiscoReflectionsSpec } from './presets/glDiscoReflections.js'
import { glDiscoFloor as glDiscoFloorSpec } from './presets/glDiscoFloor.js'
import { glDiscoRays as glDiscoRaysSpec } from './presets/glDiscoRays.js'
import { glColorOrgan as glColorOrganSpec } from './presets/glColorOrgan.js'
import { glFireworksPeony as glFireworksPeonySpec } from './presets/glFireworksPeony.js'
import { glFireworksWillow as glFireworksWillowSpec } from './presets/glFireworksWillow.js'
import { glFireworksRings as glFireworksRingsSpec } from './presets/glFireworksRings.js'
import { glFireworksFountain as glFireworksFountainSpec } from './presets/glFireworksFountain.js'
import { glFireworksFinale as glFireworksFinaleSpec } from './presets/glFireworksFinale.js'
import { glAuroraCurtain as glAuroraCurtainSpec } from './presets/glAuroraCurtain.js'
import { glAuroraBands as glAuroraBandsSpec } from './presets/glAuroraBands.js'
import { glAuroraCorona as glAuroraCoronaSpec } from './presets/glAuroraCorona.js'
import { glAuroraLake as glAuroraLakeSpec } from './presets/glAuroraLake.js'
import { glAuroraSwirl as glAuroraSwirlSpec } from './presets/glAuroraSwirl.js'
import { glLaserSpirograph as glLaserSpirographSpec } from './presets/glLaserSpirograph.js'
import { glLaserRose as glLaserRoseSpec } from './presets/glLaserRose.js'
import { glLaserHarmonograph as glLaserHarmonographSpec } from './presets/glLaserHarmonograph.js'
import { glLaserStar as glLaserStarSpec } from './presets/glLaserStar.js'
import { glLaserScope as glLaserScopeSpec } from './presets/glLaserScope.js'
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
  glLedDigit0: glLedDigit0Spec,
  glLedDigit1: glLedDigit1Spec,
  glLedDigit2: glLedDigit2Spec,
  glLedDigit3: glLedDigit3Spec,
  glLedDigit4: glLedDigit4Spec,
  glLedDigit5: glLedDigit5Spec,
  glLedDigit6: glLedDigit6Spec,
  glLedDigit7: glLedDigit7Spec,
  glLedDigit8: glLedDigit8Spec,
  glLedDigit9: glLedDigit9Spec,
  glLedLetterA: glLedLetterASpec,
  glLedLetterB: glLedLetterBSpec,
  glLedLetterC: glLedLetterCSpec,
  glLedLetterD: glLedLetterDSpec,
  glLedLetterE: glLedLetterESpec,
  glLedLetterF: glLedLetterFSpec,
  glLedLetterG: glLedLetterGSpec,
  glLedLetterH: glLedLetterHSpec,
  glLedLetterI: glLedLetterISpec,
  glLedLetterJ: glLedLetterJSpec,
  glLedLetterK: glLedLetterKSpec,
  glLedLetterL: glLedLetterLSpec,
  glLedLetterM: glLedLetterMSpec,
  glLedLetterN: glLedLetterNSpec,
  glLedLetterO: glLedLetterOSpec,
  glLedLetterP: glLedLetterPSpec,
  glLedLetterQ: glLedLetterQSpec,
  glLedLetterR: glLedLetterRSpec,
  glLedLetterS: glLedLetterSSpec,
  glLedLetterT: glLedLetterTSpec,
  glLedLetterU: glLedLetterUSpec,
  glLedLetterV: glLedLetterVSpec,
  glLedLetterW: glLedLetterWSpec,
  glLedLetterX: glLedLetterXSpec,
  glLedLetterY: glLedLetterYSpec,
  glLedLetterZ: glLedLetterZSpec,
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
  glDiscoBall: glDiscoBallSpec,
  glDiscoReflections: glDiscoReflectionsSpec,
  glDiscoFloor: glDiscoFloorSpec,
  glDiscoRays: glDiscoRaysSpec,
  glColorOrgan: glColorOrganSpec,
  glFireworksPeony: glFireworksPeonySpec,
  glFireworksWillow: glFireworksWillowSpec,
  glFireworksRings: glFireworksRingsSpec,
  glFireworksFountain: glFireworksFountainSpec,
  glFireworksFinale: glFireworksFinaleSpec,
  glAuroraCurtain: glAuroraCurtainSpec,
  glAuroraBands: glAuroraBandsSpec,
  glAuroraCorona: glAuroraCoronaSpec,
  glAuroraLake: glAuroraLakeSpec,
  glAuroraSwirl: glAuroraSwirlSpec,
  glLaserSpirograph: glLaserSpirographSpec,
  glLaserRose: glLaserRoseSpec,
  glLaserHarmonograph: glLaserHarmonographSpec,
  glLaserStar: glLaserStarSpec,
  glLaserScope: glLaserScopeSpec,
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
