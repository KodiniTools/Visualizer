import { ref } from 'vue'
import { sortTextsById, textObjectsOf, resetAnimationState } from './textOrder'
import type { Ref } from 'vue'
import type { CanvasManagerRef, HistoryRecorder, SelectedTextRef } from '../types'
import type { TextObject } from '../../lib/textManager/types'
import type { TextManager } from '../../lib/textManager'

/** Eine Zeile im Text-Verzeichnis */
export interface TextListEntry {
  id: TextObject['id']
  number: number
  content: string
  animated: boolean
  offCanvas: boolean
}

export interface TextDirectoryDeps {
  canvasManager: CanvasManagerRef
  historyRecorder: Pick<HistoryRecorder, 'checkpoint'>
  beatMarkerStore: { clearTextReference: (id: TextObject['id']) => unknown }
  selectedText: SelectedTextRef
  multiSelectedTexts: Ref<TextObject[]>
}

/**
 * Text-Verzeichnis: Liste aller Texte (auch vom Canvas entfernter) und die
 * Aktionen der Verzeichnis-Zeilen.
 */
export function useTextDirectory({
  canvasManager,
  historyRecorder,
  beatMarkerStore,
  selectedText,
  multiSelectedTexts,
}: TextDirectoryDeps) {
  const textList = ref<TextListEntry[]>([])

  function refreshTextList() {
    textList.value = sortTextsById(textObjectsOf(canvasManager)).map((o, i) => ({
      id: o.id,
      number: i + 1,
      content: (o.content || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      animated: !!(o.animation && o.animation.type && o.animation.type !== 'none'),
      offCanvas: !!o.offCanvas,
    }))
  }

  function findTextById(id: TextObject['id']): TextObject | null {
    return textObjectsOf(canvasManager).find((o) => o.id === id) || null
  }

  /** Vom Canvas entfernten Text (mit allen Einstellungen) zurückholen und markieren. */
  function returnTextToCanvas(id: TextObject['id']): void {
    const cm = canvasManager.value
    const obj = findTextById(id)
    if (!cm || !obj) return
    ;(cm.textManager as TextManager).returnToCanvas(obj)
    multiSelectedTexts.value = []
    cm.clearMultiSelection?.()
    cm.setActiveObject(obj)
    cm.redrawCallback?.()
    refreshTextList()
    historyRecorder.checkpoint('restore:text')
  }

  /**
   * Text endgültig löschen und Beat-Marker zurücksetzen, die ihn verwenden.
   * Ein Verlaufsschritt (Texte + Marker) – Strg+Z holt beides zurück.
   */
  function deleteTextFromDirectory(id: TextObject['id']): void {
    const cm = canvasManager.value
    const obj = findTextById(id)
    if (!cm || !obj) return
    if (cm.activeObject === obj || cm.isInMultiSelection?.(obj)) {
      cm.clearMultiSelection?.()
      cm.setActiveObject(null)
      multiSelectedTexts.value = []
      selectedText.value = null
    }
    ;(cm.textManager as TextManager).delete(obj)
    beatMarkerStore.clearTextReference(id)
    cm.redrawCallback?.()
    refreshTextList()
    historyRecorder.checkpoint('delete:text')
  }

  /** Einen Text markieren (auch ausgeblendete; vom Canvas entfernte nicht). */
  function selectTextFromDirectory(id: TextObject['id']): void {
    const cm = canvasManager.value
    if (!cm) return
    const obj = findTextById(id)
    if (!obj || obj.offCanvas) return
    multiSelectedTexts.value = []
    cm.clearMultiSelection?.()
    cm.setActiveObject(obj)
    cm.redrawCallback?.()
  }

  /** Wie „Neu starten“: alle Animationen des Textes von vorne abspielen. */
  function restartTextFromDirectory(id: TextObject['id']): void {
    const cm = canvasManager.value
    if (!cm) return
    const obj = findTextById(id)
    if (!obj || !obj.animation) return
    resetAnimationState(obj)
    cm.redrawCallback?.()
  }

  return {
    textList,
    refreshTextList,
    returnTextToCanvas,
    deleteTextFromDirectory,
    selectTextFromDirectory,
    restartTextFromDirectory,
  }
}
