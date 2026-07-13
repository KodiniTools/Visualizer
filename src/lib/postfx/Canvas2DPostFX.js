/**
 * Canvas2DPostFX - post-processing backend using only the 2D canvas API.
 *
 * Produces two "modern" effects at low cost and mutates the source canvas
 * in place so every downstream consumer (live preview, recorder, screenshot)
 * inherits the result for free:
 *
 *  - Motion trails: a persistent accumulation buffer faded toward transparent
 *    each frame (destination-out), giving fluid afterimages essentially for
 *    the price of the clear it replaces.
 *  - Bloom/glow: a single downscaled blur composited back additively
 *    ('lighter'). Far cheaper than per-shape shadowBlur, and it scales its
 *    resolution with the adaptive quality level.
 *
 * Works with both HTMLCanvasElement and OffscreenCanvas (worker path).
 *
 * @module postfx/Canvas2DPostFX
 */

const supportsFilter = (() => {
  try {
    const c =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(2, 2)
        : typeof document !== 'undefined'
          ? document.createElement('canvas')
          : null
    if (!c) return false
    const ctx = c.getContext('2d')
    // Assigning an unsupported value leaves filter as '' in engines lacking it.
    ctx.filter = 'blur(1px)'
    return ctx.filter === 'blur(1px)'
  } catch {
    return false
  }
})()

function createCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export class Canvas2DPostFX {
  constructor(width, height) {
    this.backend = 'canvas2d'
    this.width = width
    this.height = height

    this._trailCanvas = null
    this._trailCtx = null
    this._bloomCanvas = null
    this._bloomCtx = null
    this._bloomW = 0
    this._bloomH = 0
    this._lastBloomScale = 0
  }

  resize(width, height) {
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height
    // Force buffers to be rebuilt on next apply().
    this._trailCanvas = null
    this._trailCtx = null
    this._bloomCanvas = null
    this._bloomCtx = null
    this._lastBloomScale = 0
  }

  _ensureTrail() {
    if (
      !this._trailCanvas ||
      this._trailCanvas.width !== this.width ||
      this._trailCanvas.height !== this.height
    ) {
      this._trailCanvas = createCanvas(this.width, this.height)
      this._trailCanvas.width = this.width
      this._trailCanvas.height = this.height
      this._trailCtx = this._trailCanvas.getContext('2d')
      this._trailCtx.clearRect(0, 0, this.width, this.height)
    }
  }

  _ensureBloom(scale) {
    const bw = Math.max(1, Math.round(this.width * scale))
    const bh = Math.max(1, Math.round(this.height * scale))
    if (!this._bloomCanvas || this._bloomW !== bw || this._bloomH !== bh) {
      this._bloomCanvas = createCanvas(bw, bh)
      this._bloomCanvas.width = bw
      this._bloomCanvas.height = bh
      this._bloomCtx = this._bloomCanvas.getContext('2d')
      this._bloomW = bw
      this._bloomH = bh
    }
  }

  /**
   * Apply trails + bloom to `source` in place.
   * @param {HTMLCanvasElement|OffscreenCanvas} source
   * @param {Object} config
   * @param {number} [quality=1] Adaptive quality level (0.5–1).
   */
  apply(source, config = {}, quality = 1) {
    const ctx = source.getContext('2d')
    if (!ctx) return

    const trails = config.trails || {}
    const bloom = config.bloom || {}

    // ── Motion trails ───────────────────────────────────────────────────────
    if (trails.enabled) {
      this._ensureTrail()
      const tctx = this._trailCtx
      // decay 0..1 → higher means longer-lived trails. Clamp to avoid buildup.
      const decay = Math.max(0, Math.min(0.97, trails.decay ?? 0.85))
      const fade = 1 - decay
      // Fade accumulated content toward transparent (not toward black).
      tctx.globalCompositeOperation = 'destination-out'
      tctx.fillStyle = `rgba(0,0,0,${fade})`
      tctx.fillRect(0, 0, this.width, this.height)
      // Lay the current frame on top of the surviving trail.
      tctx.globalCompositeOperation = 'source-over'
      tctx.globalAlpha = 1
      tctx.drawImage(source, 0, 0)
      // Write the trailed scene back into the source.
      ctx.clearRect(0, 0, this.width, this.height)
      ctx.drawImage(this._trailCanvas, 0, 0)
    }

    // ── Bloom / glow ────────────────────────────────────────────────────────
    if (bloom.enabled && supportsFilter) {
      const strength = Math.max(0, bloom.strength ?? 0.6)
      if (strength > 0) {
        // Lower quality → smaller bloom buffer → cheaper blur.
        const bloomScale = Math.max(0.12, 0.35 * quality)
        this._ensureBloom(bloomScale)
        const bctx = this._bloomCtx
        const blurPx = Math.max(1, (bloom.radius ?? 8) * bloomScale)

        bctx.clearRect(0, 0, this._bloomW, this._bloomH)
        bctx.save()
        bctx.filter = `blur(${blurPx}px)`
        bctx.imageSmoothingEnabled = true
        bctx.drawImage(source, 0, 0, this._bloomW, this._bloomH)
        bctx.restore()

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = Math.min(1, strength)
        ctx.imageSmoothingEnabled = true
        // Upscaling the small buffer adds an extra soft spread — desirable here.
        ctx.drawImage(this._bloomCanvas, 0, 0, this.width, this.height)
        ctx.restore()
      }
    }
  }

  /** Clear trail history (call on visualizer switch to avoid ghosting). */
  clearHistory() {
    if (this._trailCtx) this._trailCtx.clearRect(0, 0, this.width, this.height)
  }

  dispose() {
    this._trailCanvas = null
    this._trailCtx = null
    this._bloomCanvas = null
    this._bloomCtx = null
  }
}
