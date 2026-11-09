/**
 * Form des Visualizers ("Visualizer-Steuerung" → Form).
 *
 * Die Form legt das größte mittige Rechteck im gewählten Seitenverhältnis
 * fest, beim Kreis zusätzlich rund maskiert. Der Visualizer wird direkt in
 * dieser Größe gerendert (siehe `shapeRenderSize`) und legt sich damit selbst
 * neu aus – er wird an das Format angepasst statt beschnitten. 'free' zeigt
 * wie bisher die ganze Canvas-Fläche.
 *
 * @module visualizers/core/visualizerShape
 */

/** Zulässige Formen, in der Reihenfolge der Auswahl. */
export const VISUALIZER_SHAPES = Object.freeze(['free', '1:1', '16:9', '2:3', 'circle'] as const)

export type VisualizerShape = (typeof VISUALIZER_SHAPES)[number]

export const DEFAULT_VISUALIZER_SHAPE: VisualizerShape = 'free'

/** Seitenverhältnis (Breite / Höhe) je Form; 'free' hat keins. */
const SHAPE_RATIOS: Readonly<Record<string, number>> = Object.freeze({
  '1:1': 1,
  '16:9': 16 / 9,
  '2:3': 2 / 3,
  circle: 1,
})

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isVisualizerShape(value: unknown): value is VisualizerShape {
  return (VISUALIZER_SHAPES as readonly unknown[]).includes(value)
}

/**
 * Unbekannte oder fehlende Werte (ältere Presets/Layer) → 'free'.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeVisualizerShape(value: unknown): VisualizerShape {
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
export function shapeCropRect(
  srcW: number,
  srcH: number,
  shape: string,
): { x: number; y: number; w: number; h: number } | null {
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
 * Render-Größe des Visualizers für eine Form: die ganzzahlige Größe des
 * Form-Rechtecks auf der Canvas. Bei 'free' (oder ungültigen Maßen) die
 * Canvas-Größe selbst.
 *
 * @param {number} width - Canvas-Breite
 * @param {number} height - Canvas-Höhe
 * @param {string} shape
 * @returns {{width: number, height: number}}
 */
export function shapeRenderSize(
  width: number,
  height: number,
  shape: string,
): { width: number; height: number } {
  const rect = shapeCropRect(width, height, shape)
  if (!rect) return { width, height }
  return {
    width: Math.max(1, Math.round(rect.w)),
    height: Math.max(1, Math.round(rect.h)),
  }
}

/**
 * Optionen für die Form-Auswahl (UiSegmentedControl).
 * @param {(key: string) => string} t - i18n-Übersetzer
 * @returns {Array<{value: string, label: string}>}
 */
export function visualizerShapeOptions(
  t: (key: string) => string,
): Array<{ value: VisualizerShape; label: string }> {
  // i18n-Schlüssel: '16:9' → 'r16x9'
  const key = (value: string) => (value.includes(':') ? `r${value.replace(':', 'x')}` : value)
  return VISUALIZER_SHAPES.map((value) => ({ value, label: t(`visualizer.shape.${key(value)}`) }))
}
