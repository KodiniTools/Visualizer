// src/stores/visualizerStore.js
// Fassade: setzt den Store aus den Teilmodulen unter stores/visualizer/
// zusammen. Schnittstelle (Schlüssel, Reihenfolge, Exporte) bleibt unverändert.
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useVisualizerCatalog } from './visualizer/catalog.js'
import { useSingleVisualizer } from './visualizer/useSingleVisualizer.js'
import { useVisualizerLayers } from './visualizer/useVisualizerLayers.js'
import { useVisualizerPostFx } from './visualizer/useVisualizerPostFx.js'

// Blend-Modi für Visualizer-Compositing
export { BLEND_MODES } from './visualizer/catalog.js'
// Reaktionsquellen (Spektrum, Bandpegel, Onsets) und Übergänge für die UI
export { REACT_SOURCES, REACT_EASINGS } from '../lib/visualizers/core/reactSource.js'
// Formen (frei, 1:1, 16:9, 2:3, Kreis) für die UI
export { VISUALIZER_SHAPES } from '../lib/visualizers/core/visualizerShape.js'

export const useVisualizerStore = defineStore('visualizer', () => {
  // Multi-Layer-Modus aktiv? Geteilt: Single-Auswahl verlässt ihn, Layer schalten ihn.
  const multiLayerMode = ref(false)

  const catalog = useVisualizerCatalog()
  const single = useSingleVisualizer({ multiLayerMode })
  const postFx = useVisualizerPostFx()
  const layers = useVisualizerLayers({
    single,
    multiLayerMode,
    adaptiveQuality: postFx.adaptiveQuality,
  })

  return {
    ...catalog,
    ...single,
    multiLayerMode,
    ...layers,
    ...postFx,
  }
})
