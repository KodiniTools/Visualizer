/**
 * History-Segment für Formen & Symbole (shapeStore): Liste der Formen und die
 * Canvas-Größe, auf die sich ihre Koordinaten beziehen. Laufzeitwerte
 * (Auswahl, Zeichenmodus) bleiben draußen.
 */

import type { ShapeSnapshot, useShapeStore } from '../../../stores/shapeStore'

export function createShapesSegment(shapeStore: ReturnType<typeof useShapeStore>) {
  return {
    label: 'shapes',
    capture: () => shapeStore.captureSnapshot(),
    apply: (snapshot: Partial<ShapeSnapshot> | null | undefined) =>
      shapeStore.applySnapshot(snapshot),
  }
}
