// src/stores/visualizerStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Visualizers } from '../lib/visualizers.js';

export const useVisualizerStore = defineStore('visualizer', () => {
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

  function selectVisualizer(id) {
    if (Visualizers[id]) {
      selectedVisualizer.value = id;
    }
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

  return {
    availableVisualizers,
    selectedVisualizer,
    selectVisualizer,
    visualizerColor, // Exportieren
    showVisualizer,  // Exportieren
    visualizerOpacity, // Exportieren
    colorOpacity,    // Exportieren
    toggleVisualizer, // Exportieren
    setColor,        // Exportieren
    setOpacity,      // Exportieren
    setColorOpacity, // Exportieren
  };
});
