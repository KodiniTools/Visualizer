// Globales Post-Processing: Bloom, Bewegungsspuren, adaptive Qualität,
// Beat-Punch und Onset-Flourishes.
import { ref, computed } from 'vue'

export function useVisualizerPostFx() {
  const bloomEnabled = ref(true) // Glüh-/Bloom-Effekt aktiv
  const bloomStrength = ref(0.55) // Intensität des additiven Glühens (0–2)
  const bloomThreshold = ref(0.35) // Helligkeitsschwelle, ab der geglüht wird (0–1)
  const bloomRadius = ref(8) // Weichzeichner-Radius des Glühens

  const trailsEnabled = ref(false) // Bewegungs-Nachzieheffekt (Afterimages)
  const trailsDecay = ref(0.85) // Lebensdauer der Spuren (0 = keine, 0.97 = sehr lang)

  const adaptiveQuality = ref(true) // Automatische Qualitätsanpassung nach Frame-Zeit

  // Beat-Punch: globaler Onset-getriebener Zoom der GESAMTEN Visualizer-Ebene.
  // Nutzt die selbst-normalisierten Onset-Werte (getAudioAnalysisData().onset*),
  // wirkt daher für alle Visualizer gleich und friert bei „Wall of Sound" nicht
  // ein. Standardmäßig aus → kein Verhaltenswechsel, bis der Nutzer es aktiviert.
  const beatPunchEnabled = ref(false)
  const beatPunchSource = ref('all') // 'bass' | 'mid' | 'treble' | 'all'
  const beatPunchStrength = ref(50) // 0–100 → bis zu +12% Zoom bei 100%
  // Variation: 0 = ganze Ebene gleich; höher = Spalten der Ebene reagieren mit
  // eigener Stärke und leichtem Versatz auf jeden Beat (core/beatPunchVariation.js)
  const beatPunchVariation = ref(0) // 0–100

  // Onset-Flourishes: beat-getriggerte Extra-Effekte in ausgewählten Flaggschiff-
  // Visualizern (Partikel-Burst, Blüten-Pop, Grid-Punch, Orb-Pop). Opt-in.
  const onsetFlourishEnabled = ref(false)
  const onsetFlourishStrength = ref(70) // 0–100

  // Kompaktes Config-Objekt für die PostFX-Pipeline (Worker & Main-Thread)
  const postFxConfig = computed(() => ({
    bloom: {
      enabled: bloomEnabled.value,
      strength: bloomStrength.value,
      threshold: bloomThreshold.value,
      radius: bloomRadius.value,
    },
    trails: {
      enabled: trailsEnabled.value,
      decay: trailsDecay.value,
    },
    adaptiveQuality: adaptiveQuality.value,
  }))

  function setBloomEnabled(v) {
    bloomEnabled.value = !!v
  }
  function setBloomStrength(v) {
    bloomStrength.value = Math.max(0, Math.min(2, v))
  }
  function setBloomThreshold(v) {
    bloomThreshold.value = Math.max(0, Math.min(1, v))
  }
  function setBloomRadius(v) {
    bloomRadius.value = Math.max(1, Math.min(32, v))
  }
  function setTrailsEnabled(v) {
    trailsEnabled.value = !!v
  }
  function setTrailsDecay(v) {
    trailsDecay.value = Math.max(0, Math.min(0.97, v))
  }
  function setAdaptiveQuality(v) {
    adaptiveQuality.value = !!v
  }
  function setBeatPunchEnabled(v) {
    beatPunchEnabled.value = !!v
  }
  function setBeatPunchSource(v) {
    if (['bass', 'mid', 'treble', 'all'].includes(v)) beatPunchSource.value = v
  }
  function setBeatPunchStrength(v) {
    beatPunchStrength.value = Math.max(0, Math.min(100, Math.round(v)))
  }
  function setBeatPunchVariation(v) {
    beatPunchVariation.value = Math.max(0, Math.min(100, Math.round(v)))
  }
  function setOnsetFlourishEnabled(v) {
    onsetFlourishEnabled.value = !!v
  }
  function setOnsetFlourishStrength(v) {
    onsetFlourishStrength.value = Math.max(0, Math.min(100, Math.round(v)))
  }

  return {
    // ✨ NEU: Post-Processing (Bloom / Trails / Adaptive Quality)
    bloomEnabled,
    bloomStrength,
    bloomThreshold,
    bloomRadius,
    trailsEnabled,
    trailsDecay,
    adaptiveQuality,
    postFxConfig,
    setBloomEnabled,
    setBloomStrength,
    setBloomThreshold,
    setBloomRadius,
    setTrailsEnabled,
    setTrailsDecay,
    setAdaptiveQuality,
    // ✨ NEU: Beat-Punch (globaler Onset-Zoom)
    beatPunchEnabled,
    beatPunchSource,
    beatPunchStrength,
    beatPunchVariation,
    setBeatPunchEnabled,
    setBeatPunchSource,
    setBeatPunchStrength,
    setBeatPunchVariation,
    // ✨ NEU: Onset-Flourishes (beat-getriggerte Effekte in Flaggschiff-Visualizern)
    onsetFlourishEnabled,
    onsetFlourishStrength,
    setOnsetFlourishEnabled,
    setOnsetFlourishStrength,
  }
}
