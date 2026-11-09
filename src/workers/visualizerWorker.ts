/**
 * Visualizer Web Worker with OffscreenCanvas
 * Renders visualizers off the main thread for better frame timing.
 * Supports single-visualizer mode only; multi-layer falls back to main thread.
 */

import { Visualizers } from '../lib/visualizers/index'
import { visualizerState } from '../lib/visualizers/core/state'
import { createPostProcessor, shouldRunPostFx, type PostFxConfig } from '../lib/postfx/index'
import type { OnsetData, OnsetFxConfig } from '../lib/visualizers/core/state'
import type { WorkerScope } from './workerScope'

/** Render-Auftrag (lib/workerManager.renderVisualizerFrame) */
interface RenderJob {
  visualizerId: string
  audioData: Uint8Array
  bufferLength: number
  color: string
  opacity?: number
  colorOpacity?: number
  postFx?: PostFxConfig | null
  quality?: number
  onsetFx?: OnsetFxConfig | null
  onsetData?: OnsetData | null
  dtMs?: number
  ledText?: unknown
}

/** Nachrichten vom Haupt-Thread */
type VisualizerWorkerMessage =
  | { type: 'init' | 'resize'; width: number; height: number }
  | ({ type: 'render' } & RenderJob)
  | { type: 'image'; bitmap?: ImageBitmap | null }
  | { type: 'cleanup' }

const scope = self as unknown as WorkerScope<VisualizerWorkerMessage>

let offscreenCanvas: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null
let width = 0
let height = 0
let lastVisualizerId: string | null = null
let postProcessor: ReturnType<typeof createPostProcessor> | null = null

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

function initWorker(w: number, h: number) {
  width = w
  height = h
  offscreenCanvas = new OffscreenCanvas(width, height)
  ctx = offscreenCanvas.getContext('2d')
}

function resizeCanvas(w: number, h: number) {
  width = w
  height = h
  if (offscreenCanvas) {
    offscreenCanvas.width = width
    offscreenCanvas.height = height
  }
  if (postProcessor) {
    try {
      postProcessor.resize(width, height)
    } catch {
      // Fehler bewusst ignorieren, damit der Worker weiterläuft
    }
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
  onsetFx,
  onsetData,
  dtMs,
  ledText,
}: RenderJob) {
  if (!ctx || !offscreenCanvas) return

  const visualizer = Visualizers[visualizerId]
  if (!visualizer) return

  // Bridge the onset config onto the worker's own visualizerState (a separate
  // module instance from the main thread) so the onset-flourish helper sees the
  // current settings and onset values.
  visualizerState._onsetFx = onsetFx
  visualizerState._onsetData = onsetData
  // Same bridging for the elapsed time since the main thread's last draw() —
  // applySmoothValue/applyDecay (core/helpers.js) use it to keep smoothing
  // speed tied to real time instead of to how often this message arrives.
  visualizerState._dtMs = dtMs
  // LED-Text / LED-Zahlen: Text, Modus (Uhrzeit/Countdown …) des Frames
  visualizerState._ledText = ledText || null

  if (lastVisualizerId !== visualizerId) {
    if (lastVisualizerId && Visualizers[lastVisualizerId]) {
      try {
        Visualizers[lastVisualizerId]?.cleanup?.()
      } catch {
        // Fehler bewusst ignorieren, damit der Worker weiterläuft
      }
    }
    visualizer.init?.(width, height)
    lastVisualizerId = visualizerId
    // Fresh visualizer → drop any accumulated trail history to avoid ghosting.
    if (postProcessor) {
      try {
        postProcessor.clearHistory()
      } catch {
        // Fehler bewusst ignorieren, damit der Worker weiterläuft
      }
    }
  }

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.globalAlpha = colorOpacity ?? 1
  try {
    visualizer.draw(ctx, audioData, bufferLength, width, height, color, opacity)
  } catch {
    // Fehler bewusst ignorieren, damit der Worker weiterläuft
  }
  ctx.restore()

  // Zentraler Post-Processing-Pass (Bloom / Trails) — verstärkt alle Visualizer
  // ohne pro-Form-Kosten. Läuft im Worker, also off-thread.
  if (shouldRunPostFx(postFx, quality ?? 1)) {
    const proc = ensurePostProcessor()
    if (proc) {
      try {
        proc.apply(offscreenCanvas, postFx as PostFxConfig, quality ?? 1) // shouldRunPostFx: nicht null
      } catch {
        // Fehler bewusst ignorieren, damit der Worker weiterläuft
      }
    }
  }

  const bitmap = offscreenCanvas.transferToImageBitmap()
  scope.postMessage({ type: 'frame', bitmap }, [bitmap])
}

scope.onmessage = function (e) {
  const msg = e.data

  switch (msg.type) {
    case 'init':
      initWorker(msg.width, msg.height)
      scope.postMessage({ type: 'ready' })
      break

    case 'resize':
      resizeCanvas(msg.width, msg.height)
      break

    case 'render':
      renderFrame(msg)
      break

    case 'image':
      // Portrait presets: ImageBitmap transferred from the main thread (or null).
      // Im Worker ist _imageSource immer ein ImageBitmap (oder null)
      if (
        visualizerState._imageSource &&
        typeof (visualizerState._imageSource as ImageBitmap).close === 'function'
      ) {
        try {
          ;(visualizerState._imageSource as ImageBitmap).close()
        } catch {
          /* bewusst ignoriert */
        }
      }
      visualizerState._imageSource = msg.bitmap || null
      break

    case 'cleanup':
      if (lastVisualizerId && Visualizers[lastVisualizerId]) {
        try {
          Visualizers[lastVisualizerId]?.cleanup?.()
        } catch {
          // Fehler bewusst ignorieren, damit der Worker weiterläuft
        }
      }
      lastVisualizerId = null
      break
  }
}

scope.postMessage({ type: 'workerLoaded' })
