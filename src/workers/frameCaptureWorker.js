/**
 * frameCaptureWorker
 *
 * Empfängt ImageBitmap-Objekte vom Haupt-Thread, encodiert sie zu JPEG
 * via OffscreenCanvas (off-main-thread) und schickt fertige ArrayBuffer
 * in Batches zurück. Dadurch bleibt der Haupt-Thread frei für rAF/Visualizer.
 */

let offscreen = null
let ctx = null
let quality = 0.82

const BATCH_SIZE = 30
let pendingBatch = []

self.onmessage = async (e) => {
  const { type } = e.data

  if (type === 'init') {
    const { width, height, quality: q } = e.data
    offscreen = new OffscreenCanvas(width, height)
    ctx = offscreen.getContext('2d')
    quality = q ?? 0.82
    pendingBatch = []
    self.postMessage({ type: 'ready' })
    return
  }

  if (type === 'frame') {
    const { bitmap, index } = e.data
    if (!ctx) {
      bitmap.close()
      return
    }

    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    let buffer
    try {
      const blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality })
      buffer = await blob.arrayBuffer()
    } catch {
      return
    }

    pendingBatch.push({ buffer, index })

    if (pendingBatch.length >= BATCH_SIZE) {
      _flushBatch(false)
    }
    return
  }

  if (type === 'flush') {
    _flushBatch(true)
    return
  }

  if (type === 'reset') {
    pendingBatch = []
    return
  }
}

function _flushBatch(isFinal) {
  const batch = pendingBatch.splice(0)
  const startIndex = batch.length > 0 ? batch[0].index : 0
  const buffers = batch.map((f) => f.buffer)
  self.postMessage({ type: isFinal ? 'flushed' : 'batch', buffers, startIndex }, buffers)
}
