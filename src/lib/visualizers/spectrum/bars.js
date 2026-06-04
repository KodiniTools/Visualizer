/**
 * Bars visualizer - Ultra-dynamic frequency bars
 * @module visualizers/spectrum/bars
 */

import {
  CONSTANTS,
  visualizerState,
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  getFrequencyBasedSmoothing,
  applySmoothValue,
  drawRoundedBar,
  detectBeat,
} from '../core/index.js'

export const bars = {
  name_de: 'Balken (Ultra-Dynamisch)',
  name_en: 'Bars (Ultra-Dynamic)',
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    const maxFreqIndex = Math.floor(bufferLength * CONSTANTS.FREQ_RATIO)
    const numBars = maxFreqIndex
    const barWidth = w / numBars
    const gapWidth = barWidth * 0.1
    const actualBarWidth = barWidth - gapWidth
    const baseHsl = hexToHsl(color)

    const stateKey = `bars_${numBars}`
    if (!visualizerState[stateKey] || visualizerState[stateKey].length !== numBars) {
      visualizerState[stateKey] = new Array(numBars).fill(0)
    }

    // Beat detection on bass band
    const bassNow = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.15)) / 255
    const bassPrev = visualizerState._barsBassPrev || 0
    const isBeat = detectBeat(bassNow, bassPrev, 0.55)
    visualizerState._barsBassPrev = bassNow
    // Decay beat multiplier over frames for smooth spike
    visualizerState._barsBeatMult = isBeat
      ? 1.35
      : Math.max(1.0, (visualizerState._barsBeatMult || 1.0) * 0.88)

    const beatMult = visualizerState._barsBeatMult
    const masterGain = 0.35
    const cornerRadius = Math.max(2, actualBarWidth * 0.3)

    for (let i = 0; i < numBars; i++) {
      const dynamicGain = calculateDynamicGain(i, numBars)
      const freqPerBar = maxFreqIndex / numBars
      const s = Math.floor(i * freqPerBar)
      const e = Math.max(s + 1, Math.floor((i + 1) * freqPerBar))

      const rawValue = averageRange(dataArray, s, e)
      const normalizedValue = rawValue / 255

      // Bass bars get the beat multiplier; higher freqs stay neutral
      const isBassBar = i < numBars * 0.2
      const barBeatMult = isBassBar ? beatMult : 1.0 + (beatMult - 1.0) * 0.3
      const targetHeight = normalizedValue * h * dynamicGain * masterGain * intensity * barBeatMult

      const smoothingFactor = getFrequencyBasedSmoothing(i, numBars, CONSTANTS.SMOOTHING_BASE)
      visualizerState[stateKey][i] = applySmoothValue(
        visualizerState[stateKey][i] || 0,
        targetHeight,
        smoothingFactor,
      )

      const barHeight = visualizerState[stateKey][i]
      if (barHeight < 1) continue

      const x = i * barWidth + gapWidth / 2
      const hue = (baseHsl.h + (i / numBars) * 120) % 360
      const barColor = `hsl(${hue}, ${baseHsl.s}%, ${baseHsl.l}%)`
      const glowColor = `hsla(${hue}, 100%, 60%, ${0.4 + normalizedValue * 0.6})`

      ctx.fillStyle = barColor
      drawRoundedBar(ctx, x, h, actualBarWidth, barHeight, cornerRadius, {
        glow: true,
        glowColor: glowColor,
        glowBlur: 10 + normalizedValue * 10,
        glowIntensity: 0.45 + normalizedValue * 0.55,
      })
    }

    ctx.restore()
  },
}
