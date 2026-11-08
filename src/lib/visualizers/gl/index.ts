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

import { createGlVisualizer } from './createGlVisualizer'
import { glBars as glBarsSpec, glBarsMirrored as glBarsMirroredSpec } from './presets/glBars'
import { glMandala as glMandalaSpec } from './presets/glMandala'
import { glAurora as glAuroraSpec } from './presets/glAurora'
import { glParticles as glParticlesSpec } from './presets/glParticles'
import { glTunnel as glTunnelSpec } from './presets/glTunnel'
import { glRadialBars as glRadialBarsSpec } from './presets/glRadialBars'
import { glWaveform as glWaveformSpec } from './presets/glWaveform'
import { glStrings as glStringsSpec } from './presets/glStrings'
import { glNeonGrid as glNeonGridSpec } from './presets/glNeonGrid'
import { glRings as glRingsSpec } from './presets/glRings'
import { glLightRays as glLightRaysSpec } from './presets/glLightRays'
import { glFire as glFireSpec } from './presets/glFire'
import { glRain as glRainSpec } from './presets/glRain'
import { glShockwaves as glShockwavesSpec } from './presets/glShockwaves'
import { glTerrain as glTerrainSpec } from './presets/glTerrain'
import { glVoronoi as glVoronoiSpec } from './presets/glVoronoi'
import { glSphere as glSphereSpec } from './presets/glSphere'
import { glCymatics as glCymaticsSpec } from './presets/glCymatics'
import { glLightning as glLightningSpec } from './presets/glLightning'
import { glFractal as glFractalSpec } from './presets/glFractal'
import { glGalaxy as glGalaxySpec } from './presets/glGalaxy'
import { glStargate as glStargateSpec } from './presets/glStargate'
import { glHexTunnel as glHexTunnelSpec } from './presets/glHexTunnel'
import { glPlasma as glPlasmaSpec } from './presets/glPlasma'
import { glWarp as glWarpSpec } from './presets/glWarp'
import { glInterference as glInterferenceSpec } from './presets/glInterference'
import { glTruchet as glTruchetSpec } from './presets/glTruchet'
import { glMetaballs as glMetaballsSpec } from './presets/glMetaballs'
import { glFlowerOfLife as glFlowerOfLifeSpec } from './presets/glFlowerOfLife'
import { glTreeRings as glTreeRingsSpec } from './presets/glTreeRings'
import { glFerrofluid as glFerrofluidSpec } from './presets/glFerrofluid'
import { glPendulumWave as glPendulumWaveSpec } from './presets/glPendulumWave'
import { glPendulumSnake as glPendulumSnakeSpec } from './presets/glPendulumSnake'
import { glPendulumCircle as glPendulumCircleSpec } from './presets/glPendulumCircle'
import { glPendulumField as glPendulumFieldSpec } from './presets/glPendulumField'
import { glLedWall as glLedWallSpec } from './presets/glLedWall'
import { glLedMatrix as glLedMatrixSpec } from './presets/glLedMatrix'
import { glVuMeter as glVuMeterSpec } from './presets/glVuMeter'
import { glLedRing as glLedRingSpec } from './presets/glLedRing'
import { glLedStrips as glLedStripsSpec } from './presets/glLedStrips'
import { glStageLights as glStageLightsSpec } from './presets/glStageLights'
import { glLedWall5 as glLedWall5Spec } from './presets/glLedWall5'
import { glLedCluster as glLedClusterSpec } from './presets/glLedCluster'
import { glLedBlinder as glLedBlinderSpec } from './presets/glLedBlinder'
import { glLedSunstrip as glLedSunstripSpec } from './presets/glLedSunstrip'
import { glLedHexPanel as glLedHexPanelSpec } from './presets/glLedHexPanel'
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
} from './presets/glLedDigits'
import {
  glLedFrameChase as glLedFrameChaseSpec,
  glLedFrameSpectrum as glLedFrameSpectrumSpec,
  glLedFrameVu as glLedFrameVuSpec,
  glLedFramePulse as glLedFramePulseSpec,
  glLedFrameRainbow as glLedFrameRainbowSpec,
} from './presets/glLedFrames'
import { glFootlights as glFootlightsSpec } from './presets/glFootlights'
import { glCornerBeams as glCornerBeamsSpec } from './presets/glCornerBeams'
import { glSideLights as glSideLightsSpec } from './presets/glSideLights'
import { glSearchlights as glSearchlightsSpec } from './presets/glSearchlights'
import { glLaserFan as glLaserFanSpec } from './presets/glLaserFan'
import { glLaserTunnel as glLaserTunnelSpec } from './presets/glLaserTunnel'
import { glLaserGrid as glLaserGridSpec } from './presets/glLaserGrid'
import { glLaserFigure as glLaserFigureSpec } from './presets/glLaserFigure'
import { glLaserWall as glLaserWallSpec } from './presets/glLaserWall'
import { glLaserBurst as glLaserBurstSpec } from './presets/glLaserBurst'
import { glDiscoBall as glDiscoBallSpec } from './presets/glDiscoBall'
import { glDiscoReflections as glDiscoReflectionsSpec } from './presets/glDiscoReflections'
import { glDiscoFloor as glDiscoFloorSpec } from './presets/glDiscoFloor'
import { glDiscoRays as glDiscoRaysSpec } from './presets/glDiscoRays'
import { glColorOrgan as glColorOrganSpec } from './presets/glColorOrgan'
import { glFireworksPeony as glFireworksPeonySpec } from './presets/glFireworksPeony'
import { glFireworksWillow as glFireworksWillowSpec } from './presets/glFireworksWillow'
import { glFireworksRings as glFireworksRingsSpec } from './presets/glFireworksRings'
import { glFireworksFountain as glFireworksFountainSpec } from './presets/glFireworksFountain'
import { glFireworksFinale as glFireworksFinaleSpec } from './presets/glFireworksFinale'
import { glAuroraCurtain as glAuroraCurtainSpec } from './presets/glAuroraCurtain'
import { glAuroraBands as glAuroraBandsSpec } from './presets/glAuroraBands'
import { glAuroraCorona as glAuroraCoronaSpec } from './presets/glAuroraCorona'
import { glAuroraLake as glAuroraLakeSpec } from './presets/glAuroraLake'
import { glAuroraSwirl as glAuroraSwirlSpec } from './presets/glAuroraSwirl'
import { glLaserSpirograph as glLaserSpirographSpec } from './presets/glLaserSpirograph'
import { glLaserRose as glLaserRoseSpec } from './presets/glLaserRose'
import { glLaserHarmonograph as glLaserHarmonographSpec } from './presets/glLaserHarmonograph'
import { glLaserStar as glLaserStarSpec } from './presets/glLaserStar'
import { glLaserScope as glLaserScopeSpec } from './presets/glLaserScope'
import {
  glLaserSmileHappy as glLaserSmileHappySpec,
  glLaserSmileWink as glLaserSmileWinkSpec,
  glLaserSmileLaugh as glLaserSmileLaughSpec,
  glLaserSmileCool as glLaserSmileCoolSpec,
  glLaserSmileSurprised as glLaserSmileSurprisedSpec,
} from './presets/glLaserSmiles'
import { glPortraitLed as glPortraitLedSpec } from './presets/glPortraitLed'
import { glPortraitGlitch as glPortraitGlitchSpec } from './presets/glPortraitGlitch'
import { glPortraitWave as glPortraitWaveSpec } from './presets/glPortraitWave'
import { glPortraitEdges as glPortraitEdgesSpec } from './presets/glPortraitEdges'
import { glPortraitHalftone as glPortraitHalftoneSpec } from './presets/glPortraitHalftone'

import { ledTextVisualizers } from './ledText'

export { createGlVisualizer, getSharedEngine, resetSharedEngine } from './createGlVisualizer'
export { GLVisualizerEngine } from './GLVisualizerEngine'

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
  glTreeRings: glTreeRingsSpec,
  glFerrofluid: glFerrofluidSpec,
  glPendulumWave: glPendulumWaveSpec,
  glPendulumSnake: glPendulumSnakeSpec,
  glPendulumCircle: glPendulumCircleSpec,
  glPendulumField: glPendulumFieldSpec,
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
  glLedFrameChase: glLedFrameChaseSpec,
  glLedFrameSpectrum: glLedFrameSpectrumSpec,
  glLedFrameVu: glLedFrameVuSpec,
  glLedFramePulse: glLedFramePulseSpec,
  glLedFrameRainbow: glLedFrameRainbowSpec,
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
  glLaserSmileHappy: glLaserSmileHappySpec,
  glLaserSmileWink: glLaserSmileWinkSpec,
  glLaserSmileLaugh: glLaserSmileLaughSpec,
  glLaserSmileCool: glLaserSmileCoolSpec,
  glLaserSmileSurprised: glLaserSmileSurprisedSpec,
  glPortraitLed: glPortraitLedSpec,
  glPortraitGlitch: glPortraitGlitchSpec,
  glPortraitWave: glPortraitWaveSpec,
  glPortraitEdges: glPortraitEdgesSpec,
  glPortraitHalftone: glPortraitHalftoneSpec,
}

/** Registry-ready visualizers, keyed by preset id. */
export const glVisualizers = {
  ...Object.fromEntries(
    Object.entries(glPresetSpecs).map(([id, spec]) => [id, createGlVisualizer(spec)]),
  ),
  // LED-Text / LED-Zahlen: ganze Wörter, Zahlen, Uhrzeit und Countdown aus
  // den LED-Glyphen in einem Visualizer (kein eigener Shader → keine Spec)
  ...ledTextVisualizers,
}
