import type { Ref } from 'vue'
import type { TextObject } from '../../../lib/textManager/types'
import type { useTextFonts } from '../../../composables/useTextFonts'

/**
 * Per provide('textEditControls') aus TextEditPanel geteilter Zustand der
 * Unterabschnitte (aktueller Text, Canvas-Größe, Eingabefeld und Handler).
 */
export interface TextEditControls {
  selectedText: Ref<TextObject>
  canvasWidth: Ref<number>
  canvasHeight: Ref<number>
  editTextInput: Ref<HTMLTextAreaElement | null>
  fontOptions: ReturnType<typeof useTextFonts>['fontOptions']
  updateText: () => void
  handleEditPaste: () => void
  toggleFontWeight: () => void
  toggleFontStyle: () => void
  setTextAlign: (align: CanvasTextAlign) => void
  toggleStroke: () => void
  handleUpdateSelectedTextPixelPosition: (axis: 'x' | 'y', event: Event) => void
  handleSetSelectedTextQuickPosition: (position: string) => void
}
