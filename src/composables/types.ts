/**
 * Gemeinsame Typen der Composables (Abhängigkeiten, die Komponenten übergeben)
 * @module composables/types
 */

import type { Ref } from 'vue'
import type { CanvasManager } from '../lib/canvasManager'
import type { createHistoryRecorder } from '../lib/history/historyRecorder'
import type { TextObject } from '../lib/textManager/types'

/** Ref auf den Canvas-Manager (null, solange der Canvas nicht bereit ist) */
export type CanvasManagerRef = Ref<CanvasManager | null | undefined>

/** Ref auf den ausgewählten Text */
export type SelectedTextRef = Ref<TextObject | null | undefined>

/** Verlaufs-Recorder (siehe lib/history/historyRecorder) */
export type HistoryRecorder = ReturnType<typeof createHistoryRecorder>

/** Übersetzungsfunktion aus useI18n() */
export type TranslateFn = (key: string) => string
