// Aktionen der Recorder-Steuerknöpfe. Jede Aktion sperrt über `isProcessing`,
// damit Doppelklicks während laufender Store-Aufrufe ignoriert werden.
import { ref } from 'vue'
import { useRecorderStore } from '../../stores/recorderStore.js'

/**
 * @param {object} deps
 * @param {object} deps.settings   Ergebnis von useRecorderSettings
 * @param {object} deps.timer      Ergebnis von useRecordingTimer
 * @param {object} deps.webm       Ergebnis von useWebmExport
 * @param {object} deps.conversion Ergebnis von useServerConversion
 * @param {object} deps.gif        Ergebnis von useGifConversion
 * @param {object} deps.hq         Ergebnis von useHqExport
 * @param {(blob: Blob) => void} deps.showResults
 */
export function useRecorderActions({ settings, timer, webm, conversion, gif, hq, showResults }) {
  const recorderStore = useRecorderStore()
  const isProcessing = ref(false)

  /** Führt `fn` aus, solange keine andere Aktion läuft. */
  async function guarded(fn) {
    if (isProcessing.value) return
    isProcessing.value = true
    try {
      await fn()
    } finally {
      isProcessing.value = false
    }
  }

  /** Synchrone Variante: Pause/Fortsetzen/Zurücksetzen bleiben ohne Microtask. */
  function guardedSync(fn) {
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
      if (recorderStore.pauseRecording()) timer.pauseTimer()
    })

  const handleResume = () =>
    guardedSync(() => {
      if (recorderStore.resumeRecording()) timer.resumeTimer()
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
