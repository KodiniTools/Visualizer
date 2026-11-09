/**
 * frameCaptureWorker
 *
 * Empfängt ImageBitmap-Objekte vom Haupt-Thread, encodiert sie zu JPEG
 * via OffscreenCanvas (off-main-thread) und schickt fertige ArrayBuffer
 * in Batches zurück. Dadurch bleibt der Haupt-Thread frei für rAF/Visualizer.
 */

import type { WorkerScope } from './workerScope'

/** Nachrichten vom Haupt-Thread (composables/useFrameCapture) */
interface FrameCaptureMessage {
  type: 'init' | 'frame' | 'flush' | 'reset'
  width?: number
  height?: number
  quality?: number
  bitmap?: ImageBitmap
  index?: number
}

interface EncodedFrame {
  buffer: ArrayBuffer
  index: number
}

const scope = self as unknown as WorkerScope<FrameCaptureMessage>

let offscreen: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null
let quality = 0.82

const BATCH_SIZE = 30
let pendingBatch: EncodedFrame[] = []

scope.onmessage = async (e) => {
  const { type } = e.data

  if (type === 'init') {
    const { width, height, quality: q } = e.data as Required<FrameCaptureMessage>
    offscreen = new OffscreenCanvas(width, height)
    ctx = offscreen.getContext('2d')
    quality = q ?? 0.82
    pendingBatch = []
    scope.postMessage({ type: 'ready' })
    return
  }

  if (type === 'frame') {
    const { bitmap, index } = e.data as Required<FrameCaptureMessage>
    if (!ctx) {
      bitmap.close()
      return
    }

    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    let buffer: ArrayBuffer
    try {
      const blob = await (offscreen as OffscreenCanvas).convertToBlob({
        type: 'image/jpeg',
        quality,
      })
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

function _flushBatch(isFinal: boolean) {
  const batch = pendingBatch.splice(0)
  const startIndex = batch[0]?.index ?? 0
  const buffers = batch.map((f) => f.buffer)
  scope.postMessage({ type: isFinal ? 'flushed' : 'batch', buffers, startIndex }, buffers)
}
