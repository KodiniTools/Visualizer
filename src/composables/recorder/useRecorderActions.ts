// Aktionen der Recorder-Steuerknöpfe. Jede Aktion sperrt über `isProcessing`,
// damit Doppelklicks während laufender Store-Aufrufe ignoriert werden.
import { ref } from 'vue'
import { useRecorderStore } from '../../stores/recorderStore'
import type { useRecorderSettings } from './useRecorderSettings'
import type { useRecordingTimer } from '../useRecordingTimer'
import type { useWebmExport } from '../useWebmExport'
import type { useServerConversion } from '../useServerConversion'
import type { useGifConversion } from '../useGifConversion'
import type { useHqExport } from '../useHqExport'

export interface RecorderActionsDeps {
  settings: ReturnType<typeof useRecorderSettings>
  timer: ReturnType<typeof useRecordingTimer>
  webm: ReturnType<typeof useWebmExport>
  conversion: ReturnType<typeof useServerConversion>
  gif: ReturnType<typeof useGifConversion>
  hq: ReturnType<typeof useHqExport>
  showResults: (blob: Blob) => void
}

/**
 * @param deps.settings Ergebnis von useRecorderSettings
 * @param deps.timer Ergebnis von useRecordingTimer
 * @param deps.webm Ergebnis von useWebmExport
 * @param deps.conversion Ergebnis von useServerConversion
 * @param deps.gif Ergebnis von useGifConversion
 * @param deps.hq Ergebnis von useHqExport
 */
export function useRecorderActions({
  settings,
  timer,
  webm,
  conversion,
  gif,
  hq,
  showResults,
}: RecorderActionsDeps) {
  const recorderStore = useRecorderStore()
  const isProcessing = ref(false)

  /** Führt `fn` aus, solange keine andere Aktion läuft. */
  async function guarded(fn: () => unknown): Promise<void> {
    if (isProcessing.value) return
    isProcessing.value = true
    try {
      await fn()
    } finally {
      isProcessing.value = false
    }
  }

  /** Synchrone Variante: Pause/Fortsetzen/Zurücksetzen bleiben ohne Microtask. */
  function guardedSync(fn: () => unknown): void {
    if (isProcessing.value) return
    isProcessing.value = true
    try {
      fn()
    } finally {
      isProcessing.value = false
    }
  }

  const handlePrepare = () =>
    guarded(() =>
      recorderStore.prepareRecording({
        quality: settings.selectedQuality.value,
        frameRate: settings.recordingFps.value,
      }),
    )

  const handleStart = () =>
    guarded(async () => {
      const success = await recorderStore.startRecording()
      if (success) {
        timer.startTimer()
        if (hq.enableHqExport.value && settings.serverAvailable.value) hq.startHqCapture()
      }
    })

  const handlePause = () =>
    guardedSync(() => {
      // Hinweis: pauseRecording() ist async – das Promise ist immer truthy, der
      // Timer pausiert also unabhängig vom Ergebnis (Verhalten unverändert
      // aus der JS-Version übernommen).
      void recorderStore.pauseRecording()
      timer.pauseTimer()
    })

  const handleResume = () =>
    guardedSync(() => {
      // siehe handlePause: Ergebnis wird (wie bisher) nicht abgewartet
      void recorderStore.resumeRecording()
      timer.resumeTimer()
    })

  const handleStop = () =>
    guarded(async () => {
      timer.stopTimer()
      const blob = await recorderStore.stopRecording()
      if (!blob) return
      const server = settings.serverAvailable.value
      webm.prepareWebmDownload(blob)
      showResults(blob)
      if (hq.enableHqExport.value && server && hq.hqSessionId.value) hq.finishHqExport(blob)
      if (settings.enableServerConversion.value && server)
        await conversion.startServerConversion(blob, settings.conversionQuality.value)
      if (gif.enableGifExport.value && server) gif.startGifConversion(blob)
    })

  const handleReset = () => guardedSync(() => recorderStore.resetRecorder())

  async function convertLastRecording() {
    if (recorderStore.lastRecording?.blob) {
      await conversion.startServerConversion(
        recorderStore.lastRecording.blob,
        settings.conversionQuality.value,
      )
    }
  }

  return {
    isProcessing,
    handlePrepare,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleReset,
    convertLastRecording,
  }
}
