/**
 * History-Segment für Formen & Symbole (shapeStore): Liste der Formen und die
 * Canvas-Größe, auf die sich ihre Koordinaten beziehen. Laufzeitwerte
 * (Auswahl, Zeichenmodus) bleiben draußen.
 */

/**
 * @param {Object} shapeStore - Pinia shapeStore
 */
export function createShapesSegment(shapeStore) {
  return {
    label: 'shapes',
    capture: () => shapeStore.captureSnapshot(),
    apply: (snapshot) => shapeStore.applySnapshot(snapshot),
  }
}
