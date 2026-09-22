/**
 * Adapter: turns a GPU preset into a registry-compatible visualizer.
 *
 * The rest of the app (render loop, worker, multi-layer compositing, recorder,
 * screenshots) only knows the Canvas2D contract
 * `draw(ctx, dataArray, bufferLength, w, h, color, intensity)`. This adapter
 * keeps that contract: it renders the preset with a shared WebGL2 engine and
 * blits the engine canvas onto `ctx`. Where WebGL2 is unavailable (or the
 * context is lost) it transparently draws the preset's Canvas2D `fallback`
 * visualizer instead, so nothing ever renders empty.
 *
 * One engine per JS realm (main thread / worker) is enough: the shaders are
 * cached by preset id, and per-visualizer state (audio smoothing) lives in the
 * adapter, not the engine.
 *
 * @module visualizers/gl/createGlVisualizer
 */

import { GLVisualizerEngine } from './GLVisualizerEngine.js'
import { createAudioFeatureState, resetAudioFeatureState } from './audioFeatures.js'
import { visualizerState } from '../core/state.js'

let sharedEngine = null
let engineFailed = false

/**
 * Lazily create the realm-wide engine. Returns null (and remembers the
 * failure) when WebGL2 is not available.
 * @returns {GLVisualizerEngine|null}
 */
export function getSharedEngine() {
  if (sharedEngine) return sharedEngine
  if (engineFailed) return null
  try {
    sharedEngine = new GLVisualizerEngine()
  } catch (err) {
    engineFailed = true
    if (typeof console !== 'undefined') {
      console.info(
        '[GLVisualizer] WebGL2 nicht verfügbar – Canvas2D-Fallback:',
        err?.message || err,
      )
    }
  }
  return sharedEngine
}

/** Dispose the shared engine (tests / hot reload). */
export function resetSharedEngine() {
  if (sharedEngine) {
    try {
      sharedEngine.dispose()
    } catch {
      /* bewusst ignoriert */
    }
  }
  sharedEngine = null
  engineFailed = false
}

/**
 * @typedef {Object} GlPresetSpec
 * @property {string} id            Unique preset id (also the registry key)
 * @property {string} name_de
 * @property {string} name_en
 * @property {string} frag          Fragment shader body (compiled after FRAG_HEADER)
 * @property {(ctx: object) => Object<string, number|number[]>} [uniforms] Extra per-frame uniforms
 * @property {{draw: Function, init?: Function, cleanup?: Function}} [fallback] Canvas2D visualizer used when WebGL2 is unavailable
 * @property {boolean} [needsTimeData] Receive the time-domain waveform instead of the spectrum
 * @property {boolean} [needsImage] Uses the image texture (portrait presets); image comes from visualizerState._imageSource
 * @property {'none'|'radial'|'rect'} [edgeFade] Weiche Kanten, wenn der Nutzer den Visualizer verkleinert/verschiebt (siehe core/edgeFade.js)
 */

/**
 * @param {GlPresetSpec} spec
 */
export function createGlVisualizer(spec) {
  if (!spec || typeof spec.id !== 'string' || typeof spec.frag !== 'string') {
    throw new Error('createGlVisualizer: id und frag sind erforderlich')
  }

  const audioState = createAudioFeatureState()
  let fallbackInitialised = false

  function drawFallback(ctx, dataArray, bufferLength, w, h, color, intensity) {
    const fb = spec.fallback
    if (!fb || typeof fb.draw !== 'function') return
    if (!fallbackInitialised) {
      try {
        fb.init?.(w, h)
      } catch {
        /* bewusst ignoriert */
      }
      fallbackInitialised = true
    }
    fb.draw(ctx, dataArray, bufferLength, w, h, color, intensity)
  }

  return {
    name_de: spec.name_de,
    name_en: spec.name_en,
    kind: 'gl',
    glPreset: spec,
    needsTimeData: spec.needsTimeData === true,
    needsImage: spec.needsImage === true,
    edgeFade: spec.edgeFade || 'none',

    init() {
      resetAudioFeatureState(audioState)
      fallbackInitialised = false
    },

    cleanup() {
      resetAudioFeatureState(audioState)
      if (fallbackInitialised) {
        try {
          spec.fallback?.cleanup?.()
        } catch {
          /* bewusst ignoriert */
        }
        fallbackInitialised = false
      }
    },

    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      const engine = getSharedEngine()
      if (!engine) {
        drawFallback(ctx, dataArray, bufferLength, w, h, color, intensity)
        return
      }
      const ok = engine.render(
        spec,
        {
          dataArray,
          bufferLength,
          width: w,
          height: h,
          color,
          intensity,
          timeDomain: spec.needsTimeData === true,
          // Bridged by the render loop / worker right before draw().
          image: spec.needsImage === true ? visualizerState._imageSource || null : null,
        },
        audioState,
      )
      if (!ok) {
        drawFallback(ctx, dataArray, bufferLength, w, h, color, intensity)
        return
      }

      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(engine.canvas, 0, 0, w, h)
      ctx.restore()
    },
  }
}
