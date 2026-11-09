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

import { GLVisualizerEngine } from './GLVisualizerEngine'
import { createAudioFeatureState, resetAudioFeatureState } from './audioFeatures'
import { visualizerState } from '../core/state'
import type { VisualizerContext, VisualizerDefinition } from '../core/types'
import type { AudioData, GlImageSource, GlPresetSpec } from './types'

export type { GlPresetSpec } from './types'

/** Ein in die Registry eingehängter GPU-Visualizer */
export interface GlVisualizer extends VisualizerDefinition {
  kind: 'gl'
  glPreset: GlPresetSpec
  needsTimeData: boolean
  needsImage: boolean
  edgeFade: string
  init(): void
  cleanup(): void
}

let sharedEngine: GLVisualizerEngine | null = null
let engineFailed = false

/**
 * Lazily create the realm-wide engine. Returns null (and remembers the
 * failure) when WebGL2 is not available.
 * @returns {GLVisualizerEngine|null}
 */
export function getSharedEngine(): GLVisualizerEngine | null {
  if (sharedEngine) return sharedEngine
  if (engineFailed) return null
  try {
    sharedEngine = new GLVisualizerEngine()
  } catch (err) {
    engineFailed = true
    if (typeof console !== 'undefined') {
      console.info(
        '[GLVisualizer] WebGL2 nicht verfügbar – Canvas2D-Fallback:',
        (err as Error | undefined)?.message || err,
      )
    }
  }
  return sharedEngine
}

/** Dispose the shared engine (tests / hot reload). */
export function resetSharedEngine(): void {
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
 * Wickelt ein Shader-Preset in einen Registry-kompatiblen Visualizer.
 * @throws wenn id oder frag fehlen
 */
export function createGlVisualizer(spec: GlPresetSpec): GlVisualizer {
  if (!spec || typeof spec.id !== 'string' || typeof spec.frag !== 'string') {
    throw new Error('createGlVisualizer: id und frag sind erforderlich')
  }

  const audioState = createAudioFeatureState()
  let fallbackInitialised = false

  function drawFallback(
    ctx: VisualizerContext,
    dataArray: Uint8Array,
    bufferLength: number,
    w: number,
    h: number,
    color: string,
    intensity: number,
  ): void {
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

    draw(
      ctx: VisualizerContext,
      dataArray: Uint8Array,
      bufferLength: number,
      w: number,
      h: number,
      color: string,
      intensity = 1.0,
    ) {
      const engine = getSharedEngine()
      if (!engine) {
        drawFallback(ctx, dataArray, bufferLength, w, h, color, intensity)
        return
      }
      const ok = engine.render(
        spec,
        {
          dataArray: dataArray as AudioData,
          bufferLength,
          width: w,
          height: h,
          color,
          intensity,
          timeDomain: spec.needsTimeData === true,
          // Bridged by the render loop / worker right before draw().
          image:
            spec.needsImage === true
              ? (visualizerState._imageSource as GlImageSource | null | undefined) || null
              : null,
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
