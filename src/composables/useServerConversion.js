import { ref } from 'vue'
import {
  convertAndWait,
  cleanupFile,
  cancelConversion as apiCancelConversion,
} from '../lib/videoApi.js'
import { useRecorderStore } from '../stores/recorderStore.js'

export function useServerConversion() {
  const recorderStore = useRecorderStore()
  const isConverting = ref(false)
  const conversionProgress = ref(0)
  const conversionStatus = ref('')
  const conversionError = ref(null)
  const convertedVideoUrl = ref(null)
  const convertedFilename = ref(null)
  let currentJobId = null
  let wasCancelled = false

  async function startServerConversion(blob, quality) {
    if (!blob || isConverting.value) return
    isConverting.value = true
    conversionProgress.value = 0
    conversionStatus.value = 'uploading'
    conversionError.value = null
    convertedVideoUrl.value = null
    convertedFilename.value = null
    currentJobId = null
    wasCancelled = false

    try {
      const result = await convertAndWait(blob, {
        quality,
        onJobId: (jobId) => {
          currentJobId = jobId
        },
        onProgress: (p) => {
          conversionProgress.value = p
        },
        onStatusChange: (s) => {
          conversionStatus.value = s
        },
      })
      if (result.success) {
        convertedVideoUrl.value = result.fileUrl
        convertedFilename.value = result.filename
        conversionStatus.value = 'completed'
        conversionProgress.value = 100
      }
    } catch (error) {
      // Vom Nutzer abgebrochen (siehe cancelConversion unten) - kein Fehlerzustand,
      // dismissConversion() hat den State bereits zurückgesetzt.
      if (error.cancelled || wasCancelled) return

      conversionStatus.value = 'error'
      conversionError.value = error.message || 'Verbindung zum Server fehlgeschlagen'
    } finally {
      isConverting.value = false
      currentJobId = null
    }
  }

  /**
   * Bricht die laufende Konvertierung ab: killt den FFmpeg-Prozess auf dem
   * Server und setzt den lokalen Zustand sofort zurück (wartet nicht auf das
   * nächste Polling-Intervall).
   */
  async function cancelConversion() {
    if (!isConverting.value) return
    wasCancelled = true
    isConverting.value = false
    if (currentJobId) await apiCancelConversion(currentJobId).catch(() => {})
    await dismissConversion()
  }

  function retryConversion(quality) {
    if (recorderStore.lastRecording?.blob) {
      startServerConversion(recorderStore.lastRecording.blob, quality)
    }
  }

  async function dismissConversion(cleanup = false) {
    if (cleanup && convertedFilename.value) {
      await cleanupFile(convertedFilename.value).catch(() => {})
    }
    conversionStatus.value = ''
    conversionProgress.value = 0
    conversionError.value = null
    convertedVideoUrl.value = null
    convertedFilename.value = null
  }

  function handleDownloadClick() {
    setTimeout(async () => {
      if (convertedFilename.value) await cleanupFile(convertedFilename.value).catch(() => {})
      await dismissConversion()
    }, 2000)
  }

  return {
    isConverting,
    conversionProgress,
    conversionStatus,
    conversionError,
    convertedVideoUrl,
    convertedFilename,
    startServerConversion,
    retryConversion,
    cancelConversion,
    dismissConversion,
    handleDownloadClick,
  }
}
