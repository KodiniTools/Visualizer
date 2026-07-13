/**
 * PostFX factory - selects a post-processing backend with graceful fallback.
 *
 * Prefers the WebGL2 GPU backend (real bright-pass bloom + GPU trails). If
 * WebGL2 is unavailable or its self-test fails, transparently falls back to the
 * Canvas2D backend. Both expose the same interface:
 *
 *   apply(sourceCanvas, config, quality)  // mutates sourceCanvas in place
 *   resize(width, height)
 *   clearHistory()
 *   dispose()
 *   backend  // 'webgl2' | 'canvas2d'
 *
 * `config` shape:
 *   { bloom:  { enabled, strength, threshold, radius },
 *     trails: { enabled, decay } }
 *
 * @module postfx
 */

import { Canvas2DPostFX } from './Canvas2DPostFX.js'
import { WebGLPostFX } from './WebGLPostFX.js'
import { FrameMonitor } from './FrameMonitor.js'

export { FrameMonitor } from './FrameMonitor.js'

/**
 * @param {number} width
 * @param {number} height
 * @param {Object} [opts]
 * @param {boolean} [opts.preferWebGL=true] Try the GPU backend first.
 * @returns {Canvas2DPostFX|WebGLPostFX}
 */
export function createPostProcessor(width, height, opts = {}) {
  const preferWebGL = opts.preferWebGL !== false
  if (preferWebGL) {
    try {
      const gpu = new WebGLPostFX(width, height)
      return gpu
    } catch (err) {
      // Expected on headless / unsupported GPUs — fall through to Canvas2D.
      if (typeof console !== 'undefined') {
        console.info('[PostFX] WebGL2 backend unavailable, using Canvas2D:', err?.message || err)
      }
    }
  }
  return new Canvas2DPostFX(width, height)
}

/**
 * True when the config actually requests any effect. Lets callers skip the
 * whole post-processing stage (and its buffer allocations) when it is a no-op.
 * @param {Object} config
 * @returns {boolean}
 */
export function postFxActive(config) {
  if (!config) return false
  const bloomOn = config.bloom?.enabled && (config.bloom?.strength ?? 0) > 0
  const trailsOn = config.trails?.enabled
  return Boolean(bloomOn || trailsOn)
}
