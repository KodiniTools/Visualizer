import { nextTick, onMounted, onUnmounted, watch } from 'vue'
import { historyApplyRevision } from '../../lib/history/historyRecorder'
import { ensureTextObjectDefaults } from './textObjectDefaults'
import type { Ref } from 'vue'
import type { CanvasManagerRef, SelectedTextRef } from '../types'
import type { TextObject } from '../../lib/textManager/types'

export interface TextSelectionSyncDeps {
  canvasManager: CanvasManagerRef
  fontManager?: Ref<{ isInitialized?: boolean } | null | undefined> | undefined
  selectedText: SelectedTextRef
  multiSelectedTexts: Ref<unknown[]>
  /** Edit-Panel-Komponente (stellt populateFontDropdown bereit) */
  editPanelRef: Ref<{ populateFontDropdown?: () => void } | null | undefined>
  refreshTextList: () => void
}

/**
 * Hält die Text-Auswahl des Panels mit dem Canvas synchron: Einzel- und
 * Mehrfachauswahl, Verzeichnis nach Undo/Redo und Inhaltsänderungen, sowie das
 * Font-Dropdown des Editors.
 */
export function useTextSelectionSync({
  canvasManager,
  fontManager,
  selectedText,
  multiSelectedTexts,
  editPanelRef,
  refreshTextList,
}: TextSelectionSyncDeps) {
  let selectionListenerRegistered = false

  function populateFontDropdownSoon() {
    nextTick(() => editPanelRef.value?.populateFontDropdown?.())
  }

  function handleSelectionChange(obj: { type?: string } | null | undefined): void {
    refreshTextList()
    if (obj && obj.type === 'text') {
      ensureTextObjectDefaults(obj as TextObject)
      selectedText.value = obj as TextObject
      populateFontDropdownSoon()
    } else {
      selectedText.value = null
    }
  }

  watch(() => canvasManager.value?.activeObject, handleSelectionChange, { deep: true })

  watch(
    () => canvasManager.value?.selectedObjects,
    (arr) => {
      if (arr && arr.length > 1) {
        multiSelectedTexts.value = [...arr]
        // selectedText bleibt das activeObject (Kopier-Button für Audio-Reaktiv)
        const active = canvasManager.value?.activeObject
        if (active?.type === 'text') handleSelectionChange(active)
      } else {
        multiSelectedTexts.value = []
      }
    },
    { deep: true },
  )

  // Nach Undo/Redo: Verzeichnis neu einlesen (Texte ggf. entfernt/wiederhergestellt)
  watch(historyApplyRevision, () => refreshTextList())

  // Vorschau im Verzeichnis aktualisieren, wenn der markierte Text bearbeitet wird
  watch(
    () => selectedText.value?.content,
    () => refreshTextList(),
  )

  onMounted(() => {
    const cm = canvasManager.value
    if (!cm) return

    if (cm.onSelectionChanged && !selectionListenerRegistered) {
      cm.onSelectionChanged(handleSelectionChange)
      selectionListenerRegistered = true
    }

    if (cm.activeObject?.type === 'text') handleSelectionChange(cm.activeObject)

    refreshTextList()

    // Font-Dropdown aktualisieren, sobald der FontManager seine Fonts geladen hat
    if (fontManager?.value) {
      watch(
        () => fontManager.value?.isInitialized,
        (isInitialized) => {
          if (isInitialized) populateFontDropdownSoon()
        },
        { immediate: true },
      )
    }
  })

  onUnmounted(() => {
    selectionListenerRegistered = false
  })

  return { handleSelectionChange }
}
