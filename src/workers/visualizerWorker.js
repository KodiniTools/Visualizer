/**
 * Visualizer Web Worker with OffscreenCanvas
 * Renders visualizers off the main thread for better frame timing.
 * Supports single-visualizer mode only; multi-layer falls back to main thread.
 */

import { Visualizers } from '../lib/visualizers/index.js'

let offscreenCanvas = null
let ctx = null
let width = 0
let height = 0
let lastVisualizerId = null

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
}

function renderFrame({ visualizerId, audioData, bufferLength, color, opacity, colorOpacity }) {
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
  }

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.globalAlpha = colorOpacity ?? 1
  try {
    visualizer.draw(ctx, audioData, bufferLength, width, height, color, opacity)
  } catch {}
  ctx.restore()

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
