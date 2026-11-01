// Visualizer-Katalog: Blend-Modi, Kategorien und locale-abhängige Namen.
import { computed } from 'vue'
import { Visualizers } from '../../lib/visualizers/index.js'
import { LEGACY_VISUALIZER_IDS } from '../../lib/visualizers/aliases.js'
import { localeRef } from '../../lib/i18n.js'

// ✅ Blend-Modi für Visualizer-Compositing
export const BLEND_MODES = [
  { id: 'source-over', name_de: 'Normal', name_en: 'Normal' },
  { id: 'multiply', name_de: 'Multiplizieren', name_en: 'Multiply' },
  { id: 'screen', name_de: 'Negativ multiplizieren', name_en: 'Screen' },
  { id: 'overlay', name_de: 'Ineinanderkopieren', name_en: 'Overlay' },
  { id: 'darken', name_de: 'Abdunkeln', name_en: 'Darken' },
  { id: 'lighten', name_de: 'Aufhellen', name_en: 'Lighten' },
  { id: 'color-dodge', name_de: 'Farbig abwedeln', name_en: 'Color Dodge' },
  { id: 'color-burn', name_de: 'Farbig nachbelichten', name_en: 'Color Burn' },
  { id: 'hard-light', name_de: 'Hartes Licht', name_en: 'Hard Light' },
  { id: 'soft-light', name_de: 'Weiches Licht', name_en: 'Soft Light' },
  { id: 'difference', name_de: 'Differenz', name_en: 'Difference' },
  { id: 'exclusion', name_de: 'Ausschluss', name_en: 'Exclusion' },
  { id: 'hue', name_de: 'Farbton', name_en: 'Hue' },
  { id: 'saturation', name_de: 'Sättigung', name_en: 'Saturation' },
  { id: 'color', name_de: 'Farbe', name_en: 'Color' },
  { id: 'luminosity', name_de: 'Luminanz', name_en: 'Luminosity' },
]

// ✅ Visualizer-Kategorien für bessere UX
export const VISUALIZER_CATEGORIES = {
  'GPU-Presets': [
    'glBars',
    'glBarsMirrored',
    'glRadialBars',
    'glWaveform',
    'glStrings',
    'glMandala',
    'glAurora',
    'glTunnel',
    'glNeonGrid',
    'glRings',
    'glLightRays',
    'glParticles',
    'glFire',
    'glRain',
    'glShockwaves',
    'glTerrain',
    'glVoronoi',
    'glSphere',
    'glCymatics',
    'glLightning',
    'glFractal',
    'glGalaxy',
    'glStargate',
    'glHexTunnel',
    'glPlasma',
    'glWarp',
    'glInterference',
    'glTruchet',
    'glMetaballs',
    'glFlowerOfLife',
    'glLedWall',
    'glLedMatrix',
    'glVuMeter',
    'glLedRing',
    'glLedStrips',
    'glStageLights',
    'glLedWall5',
    'glLedCluster',
    'glLedBlinder',
    'glLedSunstrip',
    'glLedHexPanel',
    'glFootlights',
    'glCornerBeams',
    'glSideLights',
    'glSearchlights',
    'glDiscoBall',
    'glDiscoReflections',
    'glDiscoFloor',
    'glDiscoRays',
    'glColorOrgan',
    'glFireworksPeony',
    'glFireworksWillow',
    'glFireworksRings',
    'glFireworksFountain',
    'glFireworksFinale',
    'glAuroraCurtain',
    'glAuroraBands',
    'glAuroraCorona',
    'glAuroraLake',
    'glAuroraSwirl',
  ],
  // Laser-Presets (Fächer, Tunnel, Figuren, Lissajous …) in einer eigenen,
  // klappbaren Sektion.
  Laser: [
    'glLaserFan',
    'glLaserTunnel',
    'glLaserGrid',
    'glLaserFigure',
    'glLaserWall',
    'glLaserBurst',
    'glLaserSpirograph',
    'glLaserRose',
    'glLaserHarmonograph',
    'glLaserStar',
    'glLaserScope',
    'glLaserSmileHappy',
    'glLaserSmileWink',
    'glLaserSmileLaugh',
    'glLaserSmileCool',
    'glLaserSmileSurprised',
  ],
  // LED-Ziffern 0–9 (5×7-Punktmatrix im Sunstrip-Stil) in einer eigenen,
  // klappbaren Sektion.
  'LED-Ziffern': [
    // Mehrstellige Zahlen, Uhrzeit und Countdown in einem Visualizer
    'glLedNumber',
    'glLedDigit0',
    'glLedDigit1',
    'glLedDigit2',
    'glLedDigit3',
    'glLedDigit4',
    'glLedDigit5',
    'glLedDigit6',
    'glLedDigit7',
    'glLedDigit8',
    'glLedDigit9',
  ],
  // LED-Buchstaben A–Z (gleiche Punktmatrix wie die LED-Ziffern) in einer
  // eigenen, klappbaren Sektion, damit die GPU-Liste übersichtlich bleibt.
  'LED-Buchstaben': [
    // Ganze Wörter/Zeilen aus LED-Buchstaben in einem Visualizer
    'glLedText',
    'glLedLetterA',
    'glLedLetterB',
    'glLedLetterC',
    'glLedLetterD',
    'glLedLetterE',
    'glLedLetterF',
    'glLedLetterG',
    'glLedLetterH',
    'glLedLetterI',
    'glLedLetterJ',
    'glLedLetterK',
    'glLedLetterL',
    'glLedLetterM',
    'glLedLetterN',
    'glLedLetterO',
    'glLedLetterP',
    'glLedLetterQ',
    'glLedLetterR',
    'glLedLetterS',
    'glLedLetterT',
    'glLedLetterU',
    'glLedLetterV',
    'glLedLetterW',
    'glLedLetterX',
    'glLedLetterY',
    'glLedLetterZ',
  ],
  // LED-Rahmen: Lampenkranz entlang des Canvas-Randes, fuenf Verhaltensweisen.
  'LED-Rahmen': [
    'glLedFrameChase',
    'glLedFrameSpectrum',
    'glLedFrameVu',
    'glLedFramePulse',
    'glLedFrameRainbow',
  ],
  // Portrait-Presets: arbeiten auf einem Bild (Upload oder Leinwand-Bild)
  Portrait: [
    'glPortraitLed',
    'glPortraitGlitch',
    'glPortraitWave',
    'glPortraitEdges',
    'glPortraitHalftone',
  ],
  // Klassische Canvas2D-Visualizer: bleiben als Fallback und für bestehende
  // Presets erhalten, sind im Picker aber eingeklappt (Stufe 1 der Migration).
  Klassisch: [...LEGACY_VISUALIZER_IDS],
}

/** Listen der verfügbaren Visualizer (flach und nach Kategorie), locale-abhängig. */
export function useVisualizerCatalog() {
  // ✅ Helper function to get locale-aware visualizer name
  function getVisualizerName(visualizer, id) {
    const locale = localeRef.value // Access .value for reactivity
    if (locale === 'en') {
      return visualizer.name_en || visualizer.name_de || id
    }
    return visualizer.name_de || visualizer.name_en || id
  }

  // ✅ Kategorisierte Visualizer (locale-aware)
  const categorizedVisualizers = computed(() => {
    // Access localeRef.value to ensure reactive dependency tracking
    const _locale = localeRef.value
    const result = {}
    for (const [category, ids] of Object.entries(VISUALIZER_CATEGORIES)) {
      result[category] = ids
        .filter((id) => Visualizers[id]) // Nur existierende
        .map((id) => ({
          id,
          name: getVisualizerName(Visualizers[id], id),
        }))
    }
    return result
  })

  // ✅ Flache Liste (für Kompatibilität) - locale-aware
  const availableVisualizers = computed(() => {
    // Access localeRef.value to ensure reactive dependency tracking
    const _locale = localeRef.value
    return Object.keys(Visualizers).map((key) => ({
      id: key,
      name: getVisualizerName(Visualizers[key], key),
    }))
  })

  return { availableVisualizers, categorizedVisualizers }
}
