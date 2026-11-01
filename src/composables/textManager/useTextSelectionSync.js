import { nextTick, onMounted, onUnmounted, watch } from 'vue'
import { historyApplyRevision } from '../../lib/history/historyRecorder.js'
import { ensureTextObjectDefaults } from './textObjectDefaults.js'

/**
 * Hält die Text-Auswahl des Panels mit dem Canvas synchron: Einzel- und
 * Mehrfachauswahl, Verzeichnis nach Undo/Redo und Inhaltsänderungen, sowie das
 * Font-Dropdown des Editors.
 * @param {object} deps
 * @param {import('vue').Ref} deps.canvasManager
 * @param {import('vue').Ref | undefined} deps.fontManager
 * @param {import('vue').Ref} deps.selectedText
 * @param {import('vue').Ref<Array>} deps.multiSelectedTexts
 * @param {import('vue').Ref} deps.editPanelRef
 * @param {() => void} deps.refreshTextList
 */
export function useTextSelectionSync({
  canvasManager,
  fontManager,
  selectedText,
  multiSelectedTexts,
  editPanelRef,
  refreshTextList,
}) {
  let selectionListenerRegistered = false

  function populateFontDropdownSoon() {
    nextTick(() => editPanelRef.value?.populateFontDropdown?.())
  }

  function handleSelectionChange(obj) {
    refreshTextList()
    if (obj && obj.type === 'text') {
      ensureTextObjectDefaults(obj)
      selectedText.value = obj
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
