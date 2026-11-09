import { nextTick, onMounted, onUnmounted } from 'vue'
import { loadTextDefaults, settingsToAddTextOptions } from '../../lib/textDefaults'
import type { Ref } from 'vue'
import type { CanvasManagerRef, SelectedTextRef } from '../types'

export interface TextEditorWithCharDeps {
  canvasManager: CanvasManagerRef
  selectedText: SelectedTextRef
  /** Edit-Panel-Komponente (stellt editTextInput bereit) */
  editPanelRef: Ref<
    { editTextInput?: HTMLInputElement | HTMLTextAreaElement | null } | null | undefined
  >
}

/** Stil für neue Texte, solange keine Standard-Stile gespeichert sind. */
export const FALLBACK_TEXT_OPTIONS = Object.freeze({
  fontSize: 48,
  fontFamily: 'Arial',
  color: '#ff0000',
  opacity: 100,
  letterSpacing: 0,
  lineHeightMultiplier: 120,
  strokeEnabled: false,
  strokeColor: '#000000',
  strokeWidth: 2,
  shadowColor: '#000000',
  shadowBlur: 5,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
})

/**
 * Tippen auf dem Canvas (Ereignis `openTextEditorWithChar`): legt sofort einen
 * Text mit dem Zeichen an – mit den gespeicherten Standard-Stilen, ohne
 * Animation – und fokussiert das Editor-Textfeld zum Weitertippen.
 * Der Listener wird immer registriert, auch ohne Canvas-Manager.
 */
export function useTextEditorWithChar({
  canvasManager,
  selectedText,
  editPanelRef,
}: TextEditorWithCharDeps) {
  function handleOpenTextEditorWithChar(event: Event): void {
    const char = (event as CustomEvent<{ char?: string } | null>).detail?.char
    if (!char) return
    if (!canvasManager.value) return

    const savedDefaults = loadTextDefaults()
    const addOptions = savedDefaults
      ? settingsToAddTextOptions(savedDefaults)
      : { ...FALLBACK_TEXT_OPTIONS }
    const newTextObj = canvasManager.value.addText(char, addOptions)
    if (!newTextObj) return

    selectedText.value = newTextObj
    nextTick(() => {
      const input = editPanelRef.value?.editTextInput
      if (input) {
        input.focus()
        input.selectionStart = input.selectionEnd = char.length
      }
    })
  }

  onMounted(() => window.addEventListener('openTextEditorWithChar', handleOpenTextEditorWithChar))
  onUnmounted(() =>
    window.removeEventListener('openTextEditorWithChar', handleOpenTextEditorWithChar),
  )

  return { handleOpenTextEditorWithChar }
}
