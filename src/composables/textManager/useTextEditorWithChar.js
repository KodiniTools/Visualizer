import { nextTick, onMounted, onUnmounted } from 'vue'
import { loadTextDefaults, settingsToAddTextOptions } from '../../lib/textDefaults.js'

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
 * @param {object} deps
 * @param {import('vue').Ref} deps.canvasManager
 * @param {import('vue').Ref} deps.selectedText
 * @param {import('vue').Ref} deps.editPanelRef
 */
export function useTextEditorWithChar({ canvasManager, selectedText, editPanelRef }) {
  function handleOpenTextEditorWithChar(event) {
    const char = event.detail?.char
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
