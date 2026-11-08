import type { Ref } from 'vue'
import type { CanvasManager } from '../../lib/canvasManager'
import type { TextObject } from '../../lib/textManager/types'

/** Stabile Sortierung der Texte nach Erstellungsreihenfolge (id). */
export function sortTextsById<T extends { id: number | string }>(objs: readonly T[]): T[] {
  return [...objs].sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
}

/** Text-Objekte des Canvas-Managers (leer, solange keiner bereit ist). */
export function textObjectsOf(canvasManager: Ref<CanvasManager | null | undefined>): TextObject[] {
  return canvasManager.value?.textManager?.textObjects || []
}

/** Animations-Zustand zurücksetzen, damit alle Animationen von vorne laufen. */
export function resetAnimationState(obj: TextObject): void {
  obj.animation._state = { startTime: null, isPlaying: false, currentIndex: 0 }
}
