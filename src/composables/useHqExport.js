import { ref } from 'vue'
import {
  startFrameExportSession,
  uploadFrameBatch,
  uploadAudio,
  assembleFrameExport,
  cancelFrameExport,
} from '../lib/frameExportApi.js'
import { waitForJob, getFileUrl, cleanupFile } from '../lib/videoApi.js'
import { useFrameCapture } from './useFrameCapture.js'

export function useHqExport() {
  const enableHqExport = ref(false)
  const hqFps = ref(30)
  const hqSessionId = ref(null)
  const hqStatus = ref('')
  const hqProgress = ref(0)
  const hqError = ref(null)
  const hqVideoUrl = ref(null)
  const hqFilename = ref(null)

  // Unabhängige Zeiterfassung als Fallback falls Worker-Event zu spät kommt
  let _captureStartTime = 0

  const { capturedFrameCount, start: startCapture, stop: stopCapture } = useFrameCapture()

  async function startHqCapture() {
    try {
      hqStatus.value = 'capturing'
      hqProgress.value = 0
      hqError.value = null
      hqVideoUrl.value = null
      hqFilename.value = null
      _captureStartTime = Date.now()

      const sessionId = await startFrameExportSession(hqFps.value)
      hqSessionId.value = sessionId

      window.dispatchEvent(
        new CustomEvent('hq:startCapture', {
          detail: {
            fps: hqFps.value,
            onBatch: async (frames, startIndex) => {
              await uploadFrameBatch(sessionId, frames, startIndex).catch((err) => {
                console.warn('[HQ] Batch upload fehlgeschlagen:', err.message)
              })
            },
          },
        }),
      )
    } catch (err) {
      hqStatus.value = 'error'
      hqError.value = err.message
      hqSessionId.value = null
    }
  }

  async function finishHqExport(audioBlob) {
    const sessionId = hqSessionId.value
    if (!sessionId) return

    try {
      hqStatus.value = 'uploading'
      hqProgress.value = 5

      window.dispatchEvent(new CustomEvent('hq:stopCapture'))

      // Worker braucht Zeit zum Encodieren der letzten Frames → großzügiger Timeout
      const remaining = await new Promise((resolve) => {
        const handler = (e) => {
          window.removeEventListener('hq:captureRemaining', handler)
          resolve(e.detail)
        }
        window.addEventListener('hq:captureRemaining', handler)
        setTimeout(() => {
          window.removeEventListener('hq:captureRemaining', handler)
          resolve(null)
        }, 15000)
      })

      // Fallback: eigene Zeiterfassung wenn Worker-Event ausblieb
      const durationMs = remaining?.durationMs || Date.now() - _captureStartTime
      if (remaining?.frames?.length > 0) {
        await uploadFrameBatch(sessionId, remaining.frames, remaining.startIndex)
      }

      hqProgress.value = 30
      if (audioBlob) await uploadAudio(sessionId, audioBlob)

      hqProgress.value = 50
      hqStatus.value = 'assembling'

      const assemblyJobId = await assembleFrameExport(sessionId, durationMs)
      hqSessionId.value = null

      const result = await waitForJob(assemblyJobId, {
        onProgress: (p) => {
          hqProgress.value = 50 + Math.round(p * 0.48)
        },
        pollInterval: 1500,
        timeout: 3600000,
      })

      hqVideoUrl.value = getFileUrl(result.outputFile)
      hqFilename.value = result.outputFile
      hqStatus.value = 'completed'
      hqProgress.value = 100
    } catch (err) {
      hqStatus.value = 'error'
      hqError.value = err.message
      if (sessionId) cancelFrameExport(sessionId).catch(() => {})
      hqSessionId.value = null
    }
  }

  function dismissHqExport(cleanup = false) {
    if (cleanup && hqFilename.value) cleanupFile(hqFilename.value).catch(() => {})
    hqStatus.value = ''
    hqProgress.value = 0
    hqError.value = null
    hqVideoUrl.value = null
    hqFilename.value = null
  }

  function handleHqDownloadClick() {
    setTimeout(() => {
      if (hqFilename.value) cleanupFile(hqFilename.value).catch(() => {})
      dismissHqExport()
    }, 2000)
  }

  return {
    enableHqExport,
    hqFps,
    hqSessionId,
    hqStatus,
    hqProgress,
    hqError,
    hqVideoUrl,
    hqFilename,
    capturedFrameCount,
    startHqCapture,
    finishHqExport,
    dismissHqExport,
    handleHqDownloadClick,
  }
}
