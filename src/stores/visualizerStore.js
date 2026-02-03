// src/stores/visualizerStore.js
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { Visualizers } from '../lib/visualizers/index.js';
import { localeRef } from '../lib/i18n.js';

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
  { id: 'luminosity', name_de: 'Luminanz', name_en: 'Luminosity' }
];

// ✅ Visualizer-Kategorien für bessere UX
const VISUALIZER_CATEGORIES = {
  'Balken & Spektrum': ['bars', 'mirroredBars', 'radialBars', 'vibratingCubes', 'vibratingStrings'],
  'Wellen': ['waveform', 'waveformHorizon', 'texturedWave', 'fluidWaves', 'synthWave'],
  'Kreise & Kugeln': ['circles', 'pulsingOrbs', 'rippleEffect', 'soundWaves', 'orbitingLight'],
  'Partikel': ['particleStorm', 'networkPlexus', 'cosmicNebula', 'digitalRain', 'matrixRain', 'audioFire'],
  'Geometrie': ['spiralGalaxy', 'bloomingMandala', 'geometricKaleidoscope', 'hexagonGrid', 'shardMosaic', 'lightBeams', 'neonGrid', 'vortexPortal'],
  'Organisch': ['heartbeat', 'neuralNetwork', 'cellGrowth', 'fractalTree'],
  'Kristalle & Netze': ['liquidCrystals', 'electricWeb'],
  'Blüten': ['frequencyBlossoms', 'centralGlowBlossom'],
  '3D-Objekte': ['rainbowCube'],
  'Retro & Pixel': ['pixelSpectrum', 'retroOscilloscope', 'arcadeBlocks', 'chiptunePulse', 'pixelFireworks'],
  'Wetter': ['weatherStorm']
};

export const useVisualizerStore = defineStore('visualizer', () => {
  // ✅ Helper function to get locale-aware visualizer name
  function getVisualizerName(visualizer, id) {
    const locale = localeRef.value; // Access .value for reactivity
    if (locale === 'en') {
      return visualizer.name_en || visualizer.name_de || id;
    }
    return visualizer.name_de || visualizer.name_en || id;
  }

  // ✅ Kategorisierte Visualizer (locale-aware)
  const categorizedVisualizers = computed(() => {
    // Access localeRef.value to ensure reactive dependency tracking
    const _locale = localeRef.value;
    const result = {};
    for (const [category, ids] of Object.entries(VISUALIZER_CATEGORIES)) {
      result[category] = ids
        .filter(id => Visualizers[id]) // Nur existierende
        .map(id => ({
          id,
          name: getVisualizerName(Visualizers[id], id)
        }));
    }
    return result;
  });

  // ✅ Flache Liste (für Kompatibilität) - locale-aware
  const availableVisualizers = computed(() => {
    // Access localeRef.value to ensure reactive dependency tracking
    const _locale = localeRef.value;
    return Object.keys(Visualizers).map(key => ({
      id: key,
      name: getVisualizerName(Visualizers[key], key)
    }));
  });

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 MULTI-VISUALIZER LAYER SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  // Multi-Layer Modus aktiviert?
  const multiLayerMode = ref(false);

  // Layer-ID-Zähler für eindeutige IDs
  let layerIdCounter = 1;

  // Generiert eine eindeutige Layer-ID
  function generateLayerId() {
    return `layer_${Date.now()}_${layerIdCounter++}`;
  }

  // Erstellt einen neuen Layer mit Standardwerten
  function createLayer(visualizerId, overrides = {}) {
    return {
      id: generateLayerId(),
      visualizerId: visualizerId || 'bars',
      visible: true,
      color: '#6ea8fe',
      opacity: 1.0,
      colorOpacity: 1.0,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      blendMode: 'source-over',
      ...overrides
    };
  }

  // Array von Visualizer-Layern (unterster Layer zuerst)
  const visualizerLayers = ref([]);

  // Aktiver/ausgewählter Layer für Bearbeitung
  const activeLayerId = ref(null);

  // Computed: Aktiver Layer
  const activeLayer = computed(() => {
    if (!activeLayerId.value) return null;
    return visualizerLayers.value.find(l => l.id === activeLayerId.value) || null;
  });

  // Computed: Sichtbare Layer (für Rendering)
  const visibleLayers = computed(() => {
    return visualizerLayers.value.filter(l => l.visible);
  });

  // Computed: Anzahl der Layer
  const layerCount = computed(() => visualizerLayers.value.length);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 MULTI-LAYER FUNKTIONEN
  // ═══════════════════════════════════════════════════════════════════════════

  // Multi-Layer-Modus aktivieren/deaktivieren
  function setMultiLayerMode(enabled) {
    multiLayerMode.value = enabled;

    if (enabled && visualizerLayers.value.length === 0) {
      // Ersten Layer aus aktuellem Single-Visualizer erstellen
      const initialLayer = createLayer(selectedVisualizer.value, {
        color: visualizerColor.value,
        opacity: visualizerOpacity.value,
        colorOpacity: colorOpacity.value,
        x: visualizerX.value,
        y: visualizerY.value,
        scale: visualizerScale.value
      });
      visualizerLayers.value.push(initialLayer);
      activeLayerId.value = initialLayer.id;
    }
  }

  // Layer hinzufügen
  function addLayer(visualizerId = 'bars', options = {}) {
    const newLayer = createLayer(visualizerId, options);
    visualizerLayers.value.push(newLayer);
    activeLayerId.value = newLayer.id;

    // Automatisch Multi-Layer-Modus aktivieren
    if (!multiLayerMode.value) {
      multiLayerMode.value = true;
    }

    return newLayer;
  }

  // Layer entfernen
  function removeLayer(layerId) {
    const index = visualizerLayers.value.findIndex(l => l.id === layerId);
    if (index === -1) return false;

    visualizerLayers.value.splice(index, 1);

    // Wenn aktiver Layer entfernt wurde, nächsten auswählen
    if (activeLayerId.value === layerId) {
      if (visualizerLayers.value.length > 0) {
        activeLayerId.value = visualizerLayers.value[Math.min(index, visualizerLayers.value.length - 1)].id;
      } else {
        activeLayerId.value = null;
        multiLayerMode.value = false;
      }
    }

    return true;
  }

  // Layer duplizieren
  function duplicateLayer(layerId) {
    const layer = visualizerLayers.value.find(l => l.id === layerId);
    if (!layer) return null;

    const newLayer = createLayer(layer.visualizerId, {
      ...layer,
      id: undefined // Neue ID generieren
    });

    const index = visualizerLayers.value.findIndex(l => l.id === layerId);
    visualizerLayers.value.splice(index + 1, 0, newLayer);
    activeLayerId.value = newLayer.id;

    return newLayer;
  }

  // Layer nach oben verschieben (höhere Z-Ordnung)
  function moveLayerUp(layerId) {
    const index = visualizerLayers.value.findIndex(l => l.id === layerId);
    if (index === -1 || index >= visualizerLayers.value.length - 1) return false;

    const temp = visualizerLayers.value[index];
    visualizerLayers.value[index] = visualizerLayers.value[index + 1];
    visualizerLayers.value[index + 1] = temp;

    return true;
  }

  // Layer nach unten verschieben (niedrigere Z-Ordnung)
  function moveLayerDown(layerId) {
    const index = visualizerLayers.value.findIndex(l => l.id === layerId);
    if (index <= 0) return false;

    const temp = visualizerLayers.value[index];
    visualizerLayers.value[index] = visualizerLayers.value[index - 1];
    visualizerLayers.value[index - 1] = temp;

    return true;
  }

  // Layer auswählen
  function selectLayer(layerId) {
    if (visualizerLayers.value.find(l => l.id === layerId)) {
      activeLayerId.value = layerId;
    }
  }

  // Layer-Eigenschaft aktualisieren
  function updateLayerProperty(layerId, property, value) {
    const layer = visualizerLayers.value.find(l => l.id === layerId);
    if (!layer) return false;

    // Werte validieren
    switch (property) {
      case 'opacity':
      case 'colorOpacity':
        value = Math.max(0, Math.min(1, value));
        break;
      case 'x':
      case 'y':
        value = Math.max(0, Math.min(1, value));
        break;
      case 'scale':
        value = Math.max(0.1, Math.min(3.0, value));
        break;
      case 'visualizerId':
        if (!Visualizers[value]) return false;
        break;
      case 'blendMode':
        if (!BLEND_MODES.find(m => m.id === value)) return false;
        break;
    }

    layer[property] = value;
    return true;
  }

  // Mehrere Layer-Eigenschaften auf einmal aktualisieren
  function updateLayer(layerId, updates) {
    const layer = visualizerLayers.value.find(l => l.id === layerId);
    if (!layer) return false;

    for (const [property, value] of Object.entries(updates)) {
      updateLayerProperty(layerId, property, value);
    }

    return true;
  }

  // Layer-Sichtbarkeit umschalten
  function toggleLayerVisibility(layerId) {
    const layer = visualizerLayers.value.find(l => l.id === layerId);
    if (layer) {
      layer.visible = !layer.visible;
    }
  }

  // Alle Layer löschen
  function clearAllLayers() {
    visualizerLayers.value = [];
    activeLayerId.value = null;
    multiLayerMode.value = false;
  }

  // Layer aus Single-Modus-Einstellungen synchronisieren
  function syncLayerFromSingleMode() {
    if (activeLayer.value) {
      updateLayer(activeLayer.value.id, {
        visualizerId: selectedVisualizer.value,
        color: visualizerColor.value,
        opacity: visualizerOpacity.value,
        colorOpacity: colorOpacity.value,
        x: visualizerX.value,
        y: visualizerY.value,
        scale: visualizerScale.value
      });
    }
  }

  // Single-Modus aus aktivem Layer synchronisieren
  function syncSingleModeFromLayer() {
    if (activeLayer.value) {
      selectedVisualizer.value = activeLayer.value.visualizerId;
      visualizerColor.value = activeLayer.value.color;
      visualizerOpacity.value = activeLayer.value.opacity;
      colorOpacity.value = activeLayer.value.colorOpacity;
      visualizerX.value = activeLayer.value.x;
      visualizerY.value = activeLayer.value.y;
      visualizerScale.value = activeLayer.value.scale;
    }
  }

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
    // ═══════════════════════════════════════════════════════════════════════
    // 🎨 MULTI-VISUALIZER LAYER SYSTEM EXPORTS
    // ═══════════════════════════════════════════════════════════════════════
    multiLayerMode,
    visualizerLayers,
    activeLayerId,
    activeLayer,
    visibleLayers,
    layerCount,
    // Layer-Funktionen
    setMultiLayerMode,
    addLayer,
    removeLayer,
    duplicateLayer,
    moveLayerUp,
    moveLayerDown,
    selectLayer,
    updateLayerProperty,
    updateLayer,
    toggleLayerVisibility,
    clearAllLayers,
    syncLayerFromSingleMode,
    syncSingleModeFromLayer,
  };
});
