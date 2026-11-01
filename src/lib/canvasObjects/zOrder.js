/**
 * Ebenen-Reihenfolge in einer Objektliste (Index 0 = ganz hinten).
 * Die Liste wird an Ort und Stelle geändert.
 *
 * Die Manager suchen den Index selbst (per id), deshalb nehmen die Funktionen
 * Index und Objekt entgegen; eingefügt wird das übergebene Objekt.
 */

/**
 * Schiebt das Objekt an `index` ans Ende der Liste (ganz nach vorne).
 * @returns {boolean} false bei ungültigem Index oder wenn es schon vorne liegt
 */
export function moveToFront(list, index, item = list[index]) {
  if (index < 0 || index >= list.length - 1) return false
  list.splice(index, 1)
  list.push(item)
  return true
}

/**
 * Schiebt das Objekt an `index` an den Anfang der Liste (ganz nach hinten).
 * @returns {boolean} false bei ungültigem Index oder wenn es schon hinten liegt
 */
export function moveToBack(list, index, item = list[index]) {
  if (index <= 0 || index >= list.length) return false
  list.splice(index, 1)
  list.unshift(item)
  return true
}
