import { BeatDetector } from '../../audio/BeatDetector.js'

/**
 * BeatDropRenderer — Global beat-drop overlay effects on top of the full canvas.
 * Effects: Flash (white burst), Color Burst (colored overlay), Strobe (rapid on/off),
 * Vignette Pulse (edge glow).
 * Called once per frame AFTER all other rendering is complete.
 *
 * Beat detection uses non-smoothed audio values so sharp transients register reliably.
 * Smoothed values are used only as a fallback when raw values are unavailable.
 */
export class BeatDropRenderer {
  constructor() {
    // Lower thresholds so beats fire reliably with real audio
    this.beatDetector = new BeatDetector({ beatThreshold: 0.2, beatRiseThreshold: 0.05 })

    this.flashOpacity = 0
    this.colorBurstOpacity = 0
    this.vignettePulse = 0
    this.strobeVisible = false
    this.strobeLastToggle = 0
  }

  /**
   * Main render call — draws beat overlay on top of everything else.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @param {object} audioData — window.audioAnalysisData
   * @param {object} settings — from beatDropStore.$state
   */
  render(ctx, width, height, audioData, settings) {
    if (!settings?.enabled) return

    const now = performance.now()
    // Use raw (non-smoothed) values for sharper beat detection
    const level = this._getRawLevel(audioData, settings.source)
    const beat = this.beatDetector.detect(level * 255, now)

    if (beat.isBeat) {
      const intensity = beat.beatIntensity

      if (settings.flashEnabled) {
        // Always set to at least 0.6 × intensity so weak beats still flash visibly
        this.flashOpacity = Math.min(1, (settings.flashIntensity / 100) * (0.6 + intensity * 0.4))
      }
      if (settings.colorBurstEnabled) {
        this.colorBurstOpacity = Math.min(
          1,
          (settings.colorBurstIntensity / 100) * (0.6 + intensity * 0.4),
        )
      }
      if (settings.vignettePulseEnabled) {
        this.vignettePulse = Math.min(
          1,
          (settings.vignettePulseIntensity / 100) * (0.7 + intensity * 0.3),
        )
      }
    }

    // Draw effects
    if (settings.flashEnabled && this.flashOpacity > 0.01) {
      this._drawFlash(ctx, width, height, settings.flashColor, this.flashOpacity)
    }

    if (settings.colorBurstEnabled && this.colorBurstOpacity > 0.01) {
      this._drawColorBurst(ctx, width, height, settings.colorBurstColor, this.colorBurstOpacity)
    }

    if (settings.strobeEnabled) {
      this._drawStrobe(ctx, width, height, settings, now)
    }

    if (settings.vignettePulseEnabled && this.vignettePulse > 0.01) {
      this._drawVignettePulse(ctx, width, height, settings.vignettePulseColor, this.vignettePulse)
    }

    // Decay — slower rates so effects stay visible for a full beat cycle
    // flashDecay 1–100 maps to ~0.92–0.72 multiplier per frame
    const flashDecayRate = 1 - (settings.flashDecay / 100) * 0.08
    this.flashOpacity *= flashDecayRate
    this.colorBurstOpacity *= 0.93
    this.vignettePulse *= 0.93
  }

  // Use non-smoothed (raw) values so the beat detector sees real transients
  _getRawLevel(audioData, source) {
    if (!audioData) return 0
    switch (source) {
      case 'bass':
        return (audioData.bass ?? audioData.smoothBass ?? 0) / 255
      case 'mid':
        return (audioData.mid ?? audioData.smoothMid ?? 0) / 255
      case 'treble':
        return (audioData.treble ?? audioData.smoothTreble ?? 0) / 255
      case 'volume':
        return (audioData.volume ?? audioData.smoothVolume ?? 0) / 255
      case 'dynamic': {
        const b = (audioData.bass ?? audioData.smoothBass ?? 0) / 255
        const m = (audioData.mid ?? audioData.smoothMid ?? 0) / 255
        const t = (audioData.treble ?? audioData.smoothTreble ?? 0) / 255
        return Math.max(b, m, t)
      }
      default:
        return (audioData.bass ?? audioData.smoothBass ?? 0) / 255
    }
  }

  _drawFlash(ctx, width, height, color, opacity) {
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = color || '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  _drawColorBurst(ctx, width, height, color, opacity) {
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.globalCompositeOperation = 'screen'
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7,
    )
    gradient.addColorStop(0, color || '#ff4400')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  _drawStrobe(ctx, width, height, settings, now) {
    const intervalMs = 1000 / Math.max(1, settings.strobeRate)
    if (now - this.strobeLastToggle >= intervalMs) {
      this.strobeVisible = !this.strobeVisible
      this.strobeLastToggle = now
    }
    if (this.strobeVisible) {
      ctx.save()
      ctx.globalAlpha = settings.strobeIntensity / 100
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }
  }

  _drawVignettePulse(ctx, width, height, color, opacity) {
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.globalCompositeOperation = 'screen'
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.15,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.85,
    )
    gradient.addColorStop(0, 'transparent')
    gradient.addColorStop(0.6, 'transparent')
    gradient.addColorStop(1, color || '#ff0000')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  reset() {
    this.flashOpacity = 0
    this.colorBurstOpacity = 0
    this.vignettePulse = 0
    this.strobeVisible = false
    this.beatDetector = new BeatDetector({ beatThreshold: 0.2, beatRiseThreshold: 0.05 })
  }
}
