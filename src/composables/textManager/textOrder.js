/** Stabile Sortierung der Texte nach Erstellungsreihenfolge (id). */
export function sortTextsById(objs) {
  return [...objs].sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
}

/** Text-Objekte des Canvas-Managers (leer, solange keiner bereit ist). */
export function textObjectsOf(canvasManager) {
  return canvasManager.value?.textManager?.textObjects || []
}

/** Animations-Zustand zurücksetzen, damit alle Animationen von vorne laufen. */
export function resetAnimationState(obj) {
  obj.animation._state = { startTime: null, isPlaying: false, currentIndex: 0 }
}
