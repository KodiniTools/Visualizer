// src/stores/visualizerStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Visualizers } from '../lib/visualizers.js';

// ✅ Visualizer-Kategorien für bessere UX
const VISUALIZER_CATEGORIES = {
  'Balken & Spektrum': ['bars', 'mirroredBars', 'radialBars', 'vibratingCubes'],
  'Wellen': ['waveform', 'waveformHorizon', 'texturedWave', 'fluidWaves', 'synthWave'],
  'Kreise & Kugeln': ['circles', 'pulsingOrbs', 'rippleEffect', 'soundWaves'],
  'Partikel': ['particleStorm', 'networkPlexus', 'cosmicNebula', 'digitalRain', 'matrixRain'],
  'Geometrie': ['spiralGalaxy', 'bloomingMandala', 'geometricKaleidoscope', 'hexagonGrid', 'shardMosaic', 'lightBeams', 'neonGrid', 'vortexPortal'],
  'Organisch': ['heartbeat', 'neuralNetwork', 'cellGrowth', 'fractalTree'],
  'Kristalle & Netze': ['liquidCrystals', 'electricWeb'],
  'Blüten': ['frequencyBlossoms', 'centralGlowBlossom'],
  '3D-Objekte': ['rainbowCube']
};

export const useVisualizerStore = defineStore('visualizer', () => {
  // ✅ Kategorisierte Visualizer
  const categorizedVisualizers = computed(() => {
    const result = {};
    for (const [category, ids] of Object.entries(VISUALIZER_CATEGORIES)) {
      result[category] = ids
        .filter(id => Visualizers[id]) // Nur existierende
        .map(id => ({
          id,
          name: Visualizers[id].name_de || Visualizers[id].name_en || id
        }));
    }
    return result;
  });

  // ✅ Flache Liste (für Kompatibilität)
  const availableVisualizers = computed(() =>
    Object.keys(Visualizers).map(key => ({
      id: key,
      name: Visualizers[key].name_de || Visualizers[key].name_en || key
    }))
  );

  const selectedVisualizer = ref('bars');

  // NEU: Zustand für die Farbe und die Sichtbarkeit des Visualizers
  const visualizerColor = ref('#6ea8fe'); // Standardfarbe
  const showVisualizer = ref(true); // Standardmässig eingeschaltet
  const visualizerOpacity = ref(1.0); // Gesamtintensität (0.0 bis 1.0, Standard: 100%)
  const colorOpacity = ref(1.0); // Farbtransparenz (0.0 bis 1.0, Standard: 100%)

  // ✨ NEU: Position und Größe des Visualizers (frei positionierbar)
  const visualizerX = ref(0.5); // X-Position (0.0 = links, 0.5 = Mitte, 1.0 = rechts)
  const visualizerY = ref(0.5); // Y-Position (0.0 = oben, 0.5 = Mitte, 1.0 = unten)
  const visualizerScale = ref(1.0); // Skalierung (0.1 = 10%, 1.0 = 100%, 2.0 = 200%)

  // ✅ Letzter funktionierender Visualizer für Fallback
  const lastWorkingVisualizer = ref('bars');

  function selectVisualizer(id) {
    if (Visualizers[id]) {
      selectedVisualizer.value = id;
    } else {
      console.warn(`⚠️ [VisualizerStore] Visualizer "${id}" nicht gefunden - Fallback zu "${lastWorkingVisualizer.value}"`);
      selectedVisualizer.value = lastWorkingVisualizer.value;
    }
  }

  // ✅ Wird aufgerufen wenn ein Visualizer erfolgreich gezeichnet wurde
  function markVisualizerWorking(id) {
    if (Visualizers[id]) {
      lastWorkingVisualizer.value = id;
    }
  }

  // ✅ Fallback bei Fehler
  function fallbackToLastWorking() {
    console.warn(`⚠️ [VisualizerStore] Visualizer "${selectedVisualizer.value}" fehlgeschlagen - Fallback zu "${lastWorkingVisualizer.value}"`);
    selectedVisualizer.value = lastWorkingVisualizer.value;
  }

  // NEU: Funktion zum Umschalten der Sichtbarkeit
  function toggleVisualizer() {
    showVisualizer.value = !showVisualizer.value;
  }

  // NEU: Funktion zum Ändern der Farbe
  function setColor(newColor) {
    visualizerColor.value = newColor;
  }

  // NEU: Funktion zum Ändern der Deckkraft
  function setOpacity(newOpacity) {
    visualizerOpacity.value = newOpacity;
  }

  // NEU: Funktion zum Ändern der Farbtransparenz
  function setColorOpacity(newOpacity) {
    colorOpacity.value = newOpacity;
  }

  // ✨ NEU: Funktionen für Position und Größe
  function setVisualizerX(newX) {
    visualizerX.value = Math.max(0, Math.min(1, newX));
  }

  function setVisualizerY(newY) {
    visualizerY.value = Math.max(0, Math.min(1, newY));
  }

  function setVisualizerScale(newScale) {
    visualizerScale.value = Math.max(0.1, Math.min(2.0, newScale));
  }

  // ✨ NEU: Reset Position und Größe auf Standard
  function resetVisualizerTransform() {
    visualizerX.value = 0.5;
    visualizerY.value = 0.5;
    visualizerScale.value = 1.0;
  }

  return {
    availableVisualizers,
    categorizedVisualizers, // ✅ NEU: Kategorisierte Liste
    selectedVisualizer,
    selectVisualizer,
    visualizerColor,
    showVisualizer,
    visualizerOpacity,
    colorOpacity,
    toggleVisualizer,
    setColor,
    setOpacity,
    setColorOpacity,
    // ✨ NEU: Position und Größe
    visualizerX,
    visualizerY,
    visualizerScale,
    setVisualizerX,
    setVisualizerY,
    setVisualizerScale,
    resetVisualizerTransform,
    // ✅ NEU: Fehlerbehandlung
    lastWorkingVisualizer,
    markVisualizerWorking,
    fallbackToLastWorking,
  };
});
