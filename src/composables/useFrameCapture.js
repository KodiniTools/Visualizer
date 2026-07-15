/**
 * useFrameCapture – Web Worker Edition
 *
 * Frame-Erfassung via requestAnimationFrame + createImageBitmap (Haupt-Thread)
 * JPEG-Encoding via OffscreenCanvas.convertToBlob() im Worker (Off-Main-Thread).
 *
 * Vorteile gegenüber setInterval + canvas.toBlob():
 *  - rAF synct mit Browser-Render-Zyklus → kein zusätzlicher GPU-Stall
 *  - createImageBitmap ist ~10× schneller als toBlob im Haupt-Thread
 *  - JPEG-Encoding blockiert nicht den Visualizer/Animation-Loop
 *  - Korrekte durationMs durch Date.now()-Timestamps unabhängig von Worker-Latenz
 */

import { ref } from 'vue'
// Inline (base64) classic worker from a blob URL — avoids module-worker load
// failures under the /visualizer/ subpath deployment. See workerManager.js.
import FrameCaptureWorker from '../workers/frameCaptureWorker.js?worker&inline'

export function useFrameCapture() {
  const isCapturing = ref(false)
  const capturedFrameCount = ref(0)

  let _worker = null
  let _canvas = null
  let _frameIndex = 0
  let _startTime = 0
  let _rafId = null
  let _lastFrameTime = 0
  let _frameInterval = 0
  let _onBatch = null
  let _resolveFlush = null
  let _bitmapPending = false

  function _spawnWorker() {
    const worker = new FrameCaptureWorker()
    worker.onmessage = (e) => {
      const { type } = e.data
      if (type === 'batch') {
        const blobs = e.data.buffers.map((buf) => new Blob([buf], { type: 'image/jpeg' }))
        _onBatch?.(blobs, e.data.startIndex)
      } else if (type === 'flushed') {
        const blobs = e.data.buffers.map((buf) => new Blob([buf], { type: 'image/jpeg' }))
        _resolveFlush?.({ frames: blobs, startIndex: e.data.startIndex })
        _resolveFlush = null
      }
    }
    worker.onerror = (err) => {
      console.warn('[FrameCapture Worker] Fehler:', err.message)
    }
    return worker
  }

  function start(canvas, fps, onBatch) {
    if (isCapturing.value) return

    _canvas = canvas
    _frameIndex = 0
    _onBatch = onBatch
    _bitmapPending = false
    _startTime = Date.now()
    _frameInterval = 1000 / fps
    _lastFrameTime = 0
    capturedFrameCount.value = 0
    isCapturing.value = true

    _worker = _spawnWorker()
    _worker.postMessage({
      type: 'init',
      width: canvas.width,
      height: canvas.height,
      quality: 0.85,
    })

    function loop(timestamp) {
      if (!isCapturing.value) return

      const elapsed = timestamp - _lastFrameTime
      if (elapsed >= _frameInterval && !_bitmapPending) {
        // Adjusting lastFrameTime to stay aligned with target FPS
        _lastFrameTime = timestamp - (elapsed % _frameInterval)
        _bitmapPending = true
        const currentIndex = _frameIndex++
        capturedFrameCount.value = _frameIndex

        createImageBitmap(_canvas)
          .then((bitmap) => {
            _bitmapPending = false
            if (!_worker) {
              bitmap.close()
              return
            }
            _worker.postMessage({ type: 'frame', bitmap, index: currentIndex }, [bitmap])
          })
          .catch(() => {
            _bitmapPending = false
          })
      }

      _rafId = requestAnimationFrame(loop)
    }

    _rafId = requestAnimationFrame(loop)
  }

  async function stop() {
    if (!isCapturing.value) return null
    isCapturing.value = false

    const durationMs = Date.now() - _startTime

    if (_rafId) {
      cancelAnimationFrame(_rafId)
      _rafId = null
    }

    // Kurz warten damit in-flight createImageBitmap-Promises noch landen können
    await new Promise((r) => setTimeout(r, 150))

    const flushed = await new Promise((resolve) => {
      _resolveFlush = resolve
      _worker.postMessage({ type: 'flush' })
      // Timeout: Worker hat max 8s um verbleibende Frames zu encodieren
      setTimeout(() => {
        if (_resolveFlush) {
          _resolveFlush({ frames: [], startIndex: _frameIndex })
          _resolveFlush = null
        }
      }, 8000)
    })

    _worker.terminate()
    _worker = null
    _canvas = null

    return {
      frames: flushed.frames,
      startIndex: flushed.startIndex,
      durationMs,
      totalFrames: _frameIndex,
    }
  }

  return { isCapturing, capturedFrameCount, start, stop }
}
