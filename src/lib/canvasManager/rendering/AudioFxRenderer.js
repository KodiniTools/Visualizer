/**
 * AudioFxRenderer — continuous per-frame audio-reactive post-processing.
 * Applied AFTER the visualizer is drawn, BEFORE BeatDropRenderer.
 *
 * Canvas filter effects (brightness, hue, saturation, contrast) are composed
 * into a single filter string to avoid multiple full-canvas read-backs.
 * Pulse (scale), Glow, Tint, and Vignette are drawn as additional passes.
 */
export class AudioFxRenderer {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @param {object} audioData  — window.audioAnalysisData
   * @param {object} settings   — audioFxStore.$state
   */
  render(ctx, width, height, audioData, settings) {
    if (!settings?.enabled) return

    const get = (source) => this._level(audioData, source)

    // ── CSS-filter pass (single composite filter) ────────────────────────
    const filters = []

    if (settings.brightnessEnabled) {
      const v =
        settings.brightnessMin +
        get(settings.brightnessSource) * (settings.brightnessMax - settings.brightnessMin)
      filters.push(`brightness(${(v / 100).toFixed(3)})`)
    }
    if (settings.saturationEnabled) {
      const v =
        settings.saturationMin +
        get(settings.saturationSource) * (settings.saturationMax - settings.saturationMin)
      filters.push(`saturate(${(v / 100).toFixed(3)})`)
    }
    if (settings.contrastEnabled) {
      const v =
        settings.contrastMin +
        get(settings.contrastSource) * (settings.contrastMax - settings.contrastMin)
      filters.push(`contrast(${(v / 100).toFixed(3)})`)
    }
    if (settings.hueEnabled) {
      const deg = get(settings.hueSource) * settings.hueRange
      filters.push(`hue-rotate(${deg.toFixed(1)}deg)`)
    }

    if (filters.length > 0) {
      // Read the current canvas content, apply filter, redraw
      const prev = ctx.filter
      ctx.save()
      ctx.filter = filters.join(' ')
      ctx.globalCompositeOperation = 'copy'
      ctx.drawImage(ctx.canvas, 0, 0)
      ctx.restore()
      ctx.filter = prev
    }

    // ── Pulse (scale around centre) ──────────────────────────────────────
    if (settings.pulseEnabled) {
      const delta = get(settings.pulseSource) * (settings.pulseStrength / 100) * 0.08
      if (delta > 0.001) {
        const scale = 1 + delta
        ctx.save()
        ctx.globalCompositeOperation = 'copy'
        ctx.translate(width / 2, height / 2)
        ctx.scale(scale, scale)
        ctx.drawImage(ctx.canvas, -width / 2, -height / 2)
        ctx.restore()
      }
    }

    // ── Glow (blur + screen blend copy) ─────────────────────────────────
    if (settings.glowEnabled) {
      const level = get(settings.glowSource)
      const blur = level * (settings.glowIntensity / 100) * 18
      if (blur > 0.5) {
        ctx.save()
        ctx.filter = `blur(${blur.toFixed(1)}px)`
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = 0.45 + level * 0.3
        ctx.drawImage(ctx.canvas, 0, 0)
        ctx.restore()
      }
    }

    // ── Color Tint overlay ───────────────────────────────────────────────
    if (settings.tintEnabled) {
      const alpha = get(settings.tintSource) * (settings.tintIntensity / 100) * 0.35
      if (alpha > 0.005) {
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = alpha
        ctx.fillStyle = settings.tintColor || '#ff6600'
        ctx.fillRect(0, 0, width, height)
        ctx.restore()
      }
    }

    // ── Vignette (edge darkening, audio-reactive depth) ──────────────────
    if (settings.vignetteEnabled) {
      const level = get(settings.vignetteSource)
      const strength = (settings.vignetteIntensity / 100) * (0.4 + level * 0.6)
      if (strength > 0.01) {
        ctx.save()
        ctx.globalCompositeOperation = 'multiply'
        const grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.3,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.8,
        )
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(1, `rgba(0,0,0,${strength.toFixed(3)})`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)
        ctx.restore()
      }
    }
  }

  _level(audioData, source) {
    if (!audioData) return 0
    switch (source) {
      case 'bass':
        return (audioData.smoothBass ?? 0) / 255
      case 'mid':
        return (audioData.smoothMid ?? 0) / 255
      case 'treble':
        return (audioData.smoothTreble ?? 0) / 255
      case 'volume':
        return (audioData.smoothVolume ?? 0) / 255
      default:
        return (audioData.smoothVolume ?? 0) / 255
    }
  }
}
