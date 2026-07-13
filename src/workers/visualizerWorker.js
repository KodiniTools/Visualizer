/**
 * Visualizer Web Worker with OffscreenCanvas
 * Renders visualizers off the main thread for better frame timing.
 * Supports single-visualizer mode only; multi-layer falls back to main thread.
 */

import { Visualizers } from '../lib/visualizers/index.js'
import { createPostProcessor, postFxActive } from '../lib/postfx/index.js'

let offscreenCanvas = null
let ctx = null
let width = 0
let height = 0
let lastVisualizerId = null
let postProcessor = null

function ensurePostProcessor() {
  if (!postProcessor) {
    try {
      postProcessor = createPostProcessor(width, height)
    } catch {
      postProcessor = null
    }
  } else if (postProcessor.width !== width || postProcessor.height !== height) {
    postProcessor.resize(width, height)
  }
  return postProcessor
}

function initWorker(w, h) {
  width = w
  height = h
  offscreenCanvas = new OffscreenCanvas(width, height)
  ctx = offscreenCanvas.getContext('2d')
}

function resizeCanvas(w, h) {
  width = w
  height = h
  if (offscreenCanvas) {
    offscreenCanvas.width = width
    offscreenCanvas.height = height
  }
  if (postProcessor) {
    try {
      postProcessor.resize(width, height)
    } catch {}
  }
}

function renderFrame({
  visualizerId,
  audioData,
  bufferLength,
  color,
  opacity,
  colorOpacity,
  postFx,
  quality,
}) {
  if (!ctx || !offscreenCanvas) return

  const visualizer = Visualizers[visualizerId]
  if (!visualizer) return

  if (lastVisualizerId !== visualizerId) {
    if (lastVisualizerId && Visualizers[lastVisualizerId]) {
      try {
        Visualizers[lastVisualizerId].cleanup?.()
      } catch {}
    }
    visualizer.init?.(width, height)
    lastVisualizerId = visualizerId
    // Fresh visualizer → drop any accumulated trail history to avoid ghosting.
    if (postProcessor) {
      try {
        postProcessor.clearHistory()
      } catch {}
    }
  }

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.globalAlpha = colorOpacity ?? 1
  try {
    visualizer.draw(ctx, audioData, bufferLength, width, height, color, opacity)
  } catch {}
  ctx.restore()

  // Zentraler Post-Processing-Pass (Bloom / Trails) — verstärkt alle Visualizer
  // ohne pro-Form-Kosten. Läuft im Worker, also off-thread.
  if (postFxActive(postFx)) {
    const proc = ensurePostProcessor()
    if (proc) {
      try {
        proc.apply(offscreenCanvas, postFx, quality ?? 1)
      } catch {}
    }
  }

  const bitmap = offscreenCanvas.transferToImageBitmap()
  self.postMessage({ type: 'frame', bitmap }, [bitmap])
}

self.onmessage = function (e) {
  const { type } = e.data

  switch (type) {
    case 'init':
      initWorker(e.data.width, e.data.height)
      self.postMessage({ type: 'ready' })
      break

    case 'resize':
      resizeCanvas(e.data.width, e.data.height)
      break

    case 'render':
      renderFrame(e.data)
      break

    case 'cleanup':
      if (lastVisualizerId && Visualizers[lastVisualizerId]) {
        try {
          Visualizers[lastVisualizerId].cleanup?.()
        } catch {}
      }
      lastVisualizerId = null
      break
  }
}

self.postMessage({ type: 'workerLoaded' })
