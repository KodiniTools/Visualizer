/**
 * Meldet Bearbeitungen an Elementen, die Beat-Marker steuern (Text, Canvas-
 * Bild, Hintergrund-Bild), an `useBeatMarkers`. So übernimmt der Marker
 * Änderungen sofort:
 * - ein vom Marker bis zu seinem Zeitpunkt ausgeblendetes Element wird beim
 *   Bearbeiten sichtbar (sonst sähe man die Änderung nicht),
 * - die Animation eines vom Marker gesetzten Hintergrund-Bildes wird in den
 *   Marker zurückgeschrieben.
 *
 * Bewusst ein schlanker Rückruf-Kanal statt eines Stores: Die Panels kennen
 * die Marker nicht, und der Marker-Zustand ist reiner Laufzeit-Zustand.
 *
 * @module markerTargetEdits
 */

/** Bearbeitetes Element */
export type MarkerTargetEdit =
  | { kind: 'text'; id: string | number }
  | { kind: 'image'; id: string | number }
  /** Hintergrund- oder Workspace-Hintergrund-Bild (Objekt des CanvasManagers) */
  | { kind: 'background'; object: object }

type Listener = (edit: MarkerTargetEdit) => void

const listeners = new Set<Listener>()

/**
 * Auf Bearbeitungen hören.
 * @returns Funktion zum Abmelden
 */
export function onMarkerTargetEdited(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Eine Bearbeitung melden (ohne Zuhörer wirkungslos). */
export function notifyMarkerTargetEdited(edit: MarkerTargetEdit): void {
  for (const listener of listeners) listener(edit)
}
