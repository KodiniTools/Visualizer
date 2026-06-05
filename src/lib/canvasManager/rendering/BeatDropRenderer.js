import { BeatDetector } from '../../audio/BeatDetector.js'

/**
 * BeatDropRenderer — Global beat-drop overlay effects on top of the full canvas.
 * Effects: Flash (white burst), Color Burst (colored overlay), Strobe (rapid on/off).
 * Called once per frame AFTER all other rendering is complete.
 */
export class BeatDropRenderer {
  constructor() {
    this.beatDetector = new BeatDetector({ beatThreshold: 0.4, beatRiseThreshold: 0.12 })

    // Flash state
    this.flashOpacity = 0

    // Color burst state
    this.colorBurstOpacity = 0

    // Strobe state
    this.strobeVisible = false
    this.strobeLastToggle = 0

    // Vignette pulse state
    this.vignettePulse = 0
  }

  /**
   * Main render call — draws beat overlay on top of everything else.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @param {object} audioData — window.audioAnalysisData
   * @param {object} settings — from beatDropStore
   */
  render(ctx, width, height, audioData, settings) {
    if (!settings?.enabled) return

    const now = performance.now()
    const level = this._getLevel(audioData, settings.source)

    // Run beat detection
    const beat = this.beatDetector.detect(level * 255, now)

    // Trigger effects on beat
    if (beat.isBeat) {
      const intensity = beat.beatIntensity

      if (settings.flashEnabled) {
        this.flashOpacity = Math.min(1, (settings.flashIntensity / 100) * (0.4 + intensity * 0.6))
      }
      if (settings.colorBurstEnabled) {
        this.colorBurstOpacity = Math.min(
          1,
          (settings.colorBurstIntensity / 100) * (0.3 + intensity * 0.7),
        )
      }
      if (settings.vignettePulseEnabled) {
        this.vignettePulse = Math.min(
          1,
          (settings.vignettePulseIntensity / 100) * (0.5 + intensity * 0.5),
        )
      }
    }

    // Draw: Flash
    if (settings.flashEnabled && this.flashOpacity > 0.005) {
      this._drawFlash(ctx, width, height, settings.flashColor, this.flashOpacity)
    }

    // Draw: Color Burst
    if (settings.colorBurstEnabled && this.colorBurstOpacity > 0.005) {
      this._drawColorBurst(ctx, width, height, settings.colorBurstColor, this.colorBurstOpacity)
    }

    // Draw: Strobe (not beat-triggered, runs at fixed rate)
    if (settings.strobeEnabled) {
      this._drawStrobe(ctx, width, height, settings, now)
    }

    // Draw: Vignette Pulse
    if (settings.vignettePulseEnabled && this.vignettePulse > 0.005) {
      this._drawVignettePulse(ctx, width, height, settings.vignettePulseColor, this.vignettePulse)
    }

    // Decay all values
    const flashDecayRate = 1 - (settings.flashDecay / 100) * 0.18
    this.flashOpacity *= flashDecayRate
    this.colorBurstOpacity *= 0.88
    this.vignettePulse *= 0.9
  }

  _getLevel(audioData, source) {
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
      case 'dynamic': {
        const b = (audioData.smoothBass ?? 0) / 255
        const m = (audioData.smoothMid ?? 0) / 255
        const t = (audioData.smoothTreble ?? 0) / 255
        return Math.max(b, m, t)
      }
      default:
        return (audioData.smoothBass ?? 0) / 255
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
    ctx.globalCompositeOperation = 'overlay'
    // Radial gradient from center
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
    ctx.globalAlpha = opacity * 0.7
    ctx.globalCompositeOperation = 'overlay'
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.2,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.8,
    )
    gradient.addColorStop(0, 'transparent')
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
    this.beatDetector = new BeatDetector({ beatThreshold: 0.4, beatRiseThreshold: 0.12 })
  }
}
