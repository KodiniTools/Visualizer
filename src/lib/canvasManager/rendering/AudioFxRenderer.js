/**
 * AudioFxRenderer — continuous per-frame audio-reactive post-processing.
 * Applied AFTER the visualizer is drawn, BEFORE BeatDropRenderer.
 *
 * Canvas filter effects (brightness, hue, saturation, contrast) are composed
 * into a single filter string to avoid multiple full-canvas read-backs.
 * Pulse (scale), Glow, Tint, and Vignette are drawn as additional passes.
 */
export class AudioFxRenderer {
  constructor() {
    // Shared beat envelope (0–1): snaps up on each detected beat, decays fast.
    // Drives Zoom-Punch and Vignette-Puls so both pulse on the exact same beat.
    this._beatEnv = 0
    this._beatLastT = null
    // BPM phase (0–1 across one beat) for the predictive BPM-Lock pulse.
    this._bpmPhase = 0
    this._bpmLastT = null
  }

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
    const time = typeof performance !== 'undefined' ? performance.now() : Date.now()

    // Advance the rhythm envelopes exactly once per frame so several beat-based
    // effects share one consistent pulse (double-advancing would over-decay).
    const beatEnv = this._updateBeatEnv(audioData, time)
    const bpmEnv = this._updateBpmPulse(audioData, time)

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

    // ── Zoom-Punch (beat-synced snappy scale) ────────────────────────────
    if (settings.zoomPunchEnabled) {
      const delta = beatEnv * (settings.zoomPunchStrength / 100) * 0.18
      if (delta > 0.001) this._scaleFromCentre(ctx, width, height, 1 + delta)
    }

    // ── BPM-Lock-Puls (scale locked to the detected BPM grid) ────────────
    if (settings.bpmPulseEnabled) {
      const delta = bpmEnv * (settings.bpmPulseStrength / 100) * 0.12
      if (delta > 0.001) this._scaleFromCentre(ctx, width, height, 1 + delta)
    }

    // ── Frequenz-Split (bass → zoom, treble → hue shift + glow) ───────────
    if (settings.freqSplitEnabled) {
      const bass = get('bass')
      const treble = get('treble')
      const k = settings.freqSplitStrength / 100

      const zoom = bass * k * 0.12
      if (zoom > 0.001) this._scaleFromCentre(ctx, width, height, 1 + zoom)

      const hueDeg = treble * k * 120
      if (hueDeg > 0.5) {
        const prev = ctx.filter
        ctx.save()
        ctx.filter = `hue-rotate(${hueDeg.toFixed(1)}deg)`
        ctx.globalCompositeOperation = 'copy'
        ctx.drawImage(ctx.canvas, 0, 0)
        ctx.restore()
        ctx.filter = prev
      }

      const glowBlur = treble * k * 14
      if (glowBlur > 0.5) {
        ctx.save()
        ctx.filter = `blur(${glowBlur.toFixed(1)}px)`
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = 0.3 + treble * 0.3
        ctx.drawImage(ctx.canvas, 0, 0)
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

    // ── Vignette-Puls (edge darkening that snaps on each beat) ───────────
    if (settings.vignettePulseEnabled) {
      const strength = (settings.vignettePulseIntensity / 100) * beatEnv
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
        grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, strength).toFixed(3)})`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)
        ctx.restore()
      }
    }
  }

  /**
   * Redraws the whole canvas scaled around its centre (a full-frame zoom).
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @param {number} scale
   */
  _scaleFromCentre(ctx, width, height, scale) {
    ctx.save()
    ctx.globalCompositeOperation = 'copy'
    ctx.translate(width / 2, height / 2)
    ctx.scale(scale, scale)
    ctx.drawImage(ctx.canvas, -width / 2, -height / 2)
    ctx.restore()
  }

  /**
   * Advances and returns the shared beat envelope (0–1). Snaps up to the beat
   * intensity on each detected beat, then decays exponentially (~150 ms).
   */
  _updateBeatEnv(audioData, time) {
    const dt = this._beatLastT == null ? 0 : Math.max(0, time - this._beatLastT)
    this._beatLastT = time
    if (dt > 0) this._beatEnv *= Math.exp(-dt / 150)
    if (audioData?.isBeat) {
      const s = audioData.beatIntensity > 0 ? audioData.beatIntensity : 1
      this._beatEnv = Math.max(this._beatEnv, s)
    }
    return Math.max(0, Math.min(1, this._beatEnv))
  }

  /**
   * Advances a BPM-locked phase and returns a pulse envelope (0–1) that peaks
   * right on each beat of the grid. The phase runs off the detected BPM so it
   * keeps pulsing during quiet passages, and re-syncs to 0 on every real beat.
   */
  _updateBpmPulse(audioData, time) {
    const dt = this._bpmLastT == null ? 0 : Math.max(0, time - this._bpmLastT)
    this._bpmLastT = time
    const bpm = audioData?.bpm > 0 ? audioData.bpm : 120
    const beatMs = 60000 / Math.max(30, Math.min(300, bpm))
    this._bpmPhase += dt / beatMs
    // Re-sync to the downbeat whenever a real beat is detected.
    if (audioData?.isBeat) this._bpmPhase = 0
    this._bpmPhase -= Math.floor(this._bpmPhase)
    // Raised cosine peaking at phase 0, sharpened for a snappier pulse.
    const raised = Math.cos(this._bpmPhase * Math.PI * 2) * 0.5 + 0.5
    return raised * raised
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
