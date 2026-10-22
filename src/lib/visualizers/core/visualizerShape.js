/**
 * Form des Visualizers ("Visualizer-Steuerung" → Form).
 *
 * Ein Visualizer wird immer in voller Canvas-Größe gerendert. Die Form legt
 * fest, welcher Ausschnitt davon gezeigt wird: das größte mittige Rechteck im
 * gewählten Seitenverhältnis, beim Kreis zusätzlich rund maskiert. 'free'
 * zeigt wie bisher die ganze Fläche.
 *
 * @module visualizers/core/visualizerShape
 */

/** Zulässige Formen, in der Reihenfolge der Auswahl. */
export const VISUALIZER_SHAPES = Object.freeze(['free', '1:1', '16:9', '2:3', 'circle'])

export const DEFAULT_VISUALIZER_SHAPE = 'free'

/** Seitenverhältnis (Breite / Höhe) je Form; 'free' hat keins. */
const SHAPE_RATIOS = Object.freeze({
  '1:1': 1,
  '16:9': 16 / 9,
  '2:3': 2 / 3,
  circle: 1,
})

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isVisualizerShape(value) {
  return VISUALIZER_SHAPES.includes(value)
}

/**
 * Unbekannte oder fehlende Werte (ältere Presets/Layer) → 'free'.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeVisualizerShape(value) {
  return isVisualizerShape(value) ? value : DEFAULT_VISUALIZER_SHAPE
}

/**
 * Sichtbarer Ausschnitt im Render-Bitmap: das größte mittige Rechteck im
 * Seitenverhältnis der Form. null bei 'free' (ganze Fläche).
 *
 * @param {number} srcW
 * @param {number} srcH
 * @param {string} shape
 * @returns {{x: number, y: number, w: number, h: number} | null}
 */
export function shapeCropRect(srcW, srcH, shape) {
  const ratio = SHAPE_RATIOS[shape]
  if (!ratio || srcW <= 0 || srcH <= 0) return null
  let w = srcW
  let h = srcW / ratio
  if (h > srcH) {
    h = srcH
    w = srcH * ratio
  }
  return { x: (srcW - w) / 2, y: (srcH - h) / 2, w, h }
}

/**
 * Optionen für die Form-Auswahl (UiSegmentedControl).
 * @param {(key: string) => string} t - i18n-Übersetzer
 * @returns {Array<{value: string, label: string}>}
 */
export function visualizerShapeOptions(t) {
  // i18n-Schlüssel: '16:9' → 'r16x9'
  const key = (value) => (value.includes(':') ? `r${value.replace(':', 'x')}` : value)
  return VISUALIZER_SHAPES.map((value) => ({ value, label: t(`visualizer.shape.${key(value)}`) }))
}
