/**
 * useFrameCapture
 *
 * Kapselt die Frame-by-Frame Canvas-Capture-Logik:
 * - Erfasst JPEG-Frames in einem festen FPS-Intervall
 * - Sammelt Frames in Batches (BATCH_SIZE Frames)
 * - Ruft onBatch() auf wenn ein Batch bereit ist
 * - Gibt letzten Teil-Batch über flush() zurück
 */

import { ref } from 'vue'

const BATCH_SIZE = 30 // Frames pro Upload-Batch

export function useFrameCapture() {
  const isCapturing = ref(false)
  const capturedFrameCount = ref(0)

  let _canvas = null
  let _intervalId = null
  let _frameIndex = 0
  let _pendingBatch = []
  let _onBatch = null
  let _captureInProgress = false

  function start(canvas, fps, onBatch) {
    if (isCapturing.value) return
    _canvas = canvas
    _frameIndex = 0
    _pendingBatch = []
    _onBatch = onBatch
    _captureInProgress = false
    capturedFrameCount.value = 0
    isCapturing.value = true

    const intervalMs = 1000 / fps

    _intervalId = setInterval(() => {
      if (_captureInProgress) return // Letzter Capture noch nicht fertig — Frame überspringen
      _captureInProgress = true

      _canvas.toBlob(
        (blob) => {
          if (!isCapturing.value) {
            _captureInProgress = false
            return
          }
          if (blob) {
            _pendingBatch.push(blob)
            _frameIndex++
            capturedFrameCount.value = _frameIndex

            if (_pendingBatch.length >= BATCH_SIZE) {
              const batch = _pendingBatch.splice(0, BATCH_SIZE)
              const batchStartIndex = _frameIndex - BATCH_SIZE
              _onBatch(batch, batchStartIndex)
            }
          }
          _captureInProgress = false
        },
        'image/jpeg',
        0.82,
      )
    }, intervalMs)
  }

  /**
   * Stoppt die Capture und gibt verbleibende Frames zurück
   * @returns {{ frames: Blob[], startIndex: number } | null}
   */
  function stop() {
    if (!isCapturing.value) return null
    isCapturing.value = false

    if (_intervalId) {
      clearInterval(_intervalId)
      _intervalId = null
    }

    const remaining = _pendingBatch.splice(0)
    const startIndex = _frameIndex - remaining.length
    _canvas = null

    return remaining.length > 0 ? { frames: remaining, startIndex } : null
  }

  return { isCapturing, capturedFrameCount, start, stop }
}
