/**
 * useFrameCapture
 *
 * Kapselt die Frame-by-Frame Canvas-Capture-Logik.
 * Trackt tatsächliche Start/Stop-Zeitstempel damit FFmpeg
 * die korrekte Videolänge berechnen kann — unabhängig davon,
 * wie viele Frames wegen langsamer toBlob()-Calls übersprungen wurden.
 */

import { ref } from 'vue'

const BATCH_SIZE = 30

export function useFrameCapture() {
  const isCapturing = ref(false)
  const capturedFrameCount = ref(0)

  let _canvas = null
  let _intervalId = null
  let _frameIndex = 0
  let _pendingBatch = []
  let _onBatch = null
  let _captureInProgress = false
  let _startTime = 0

  function start(canvas, fps, onBatch) {
    if (isCapturing.value) return
    _canvas = canvas
    _frameIndex = 0
    _pendingBatch = []
    _onBatch = onBatch
    _captureInProgress = false
    capturedFrameCount.value = 0
    _startTime = Date.now()
    isCapturing.value = true

    const intervalMs = 1000 / fps

    _intervalId = setInterval(() => {
      if (_captureInProgress) return
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
   * Stoppt die Capture.
   * @returns {{ frames: Blob[], startIndex: number, durationMs: number } | null}
   */
  function stop() {
    if (!isCapturing.value) return null
    isCapturing.value = false

    const durationMs = Date.now() - _startTime

    if (_intervalId) {
      clearInterval(_intervalId)
      _intervalId = null
    }

    const remaining = _pendingBatch.splice(0)
    const startIndex = _frameIndex - remaining.length
    _canvas = null

    return {
      frames: remaining,
      startIndex,
      durationMs,
      totalFrames: _frameIndex + remaining.length,
    }
  }

  return { isCapturing, capturedFrameCount, start, stop }
}
