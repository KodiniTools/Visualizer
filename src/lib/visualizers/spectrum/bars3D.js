/**
 * 3D Bars visualizer — perspective EQ bars with isometric-style depth faces,
 * reflection plane and frequency-reactive colours.
 * @module visualizers/spectrum/bars3D
 */

import {
  hexToHsl,
  averageRange,
  visualizerState,
  withSafeCanvasState,
  calculateDynamicGain,
} from '../core/index.js'

export const bars3D = {
  name_de: '3D-Balken (Perspektivisch)',
  name_en: '3D Bars (Perspective)',
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const hsl = hexToHsl(color)
    const bass = averageRange(dataArray, 0, Math.floor(bufferLength * 0.1)) / 255

    ctx.clearRect(0, 0, w, h)

    const NUM_BARS = 48
    const maxFreqIndex = Math.floor(bufferLength * 0.75)

    // Smoothing
    const stateKey = 'bars3d'
    if (!visualizerState[stateKey]) {
      visualizerState[stateKey] = new Float32Array(NUM_BARS)
    }
    const smooth = visualizerState[stateKey]

    // ── Layout geometry ────────────────────────────────────────────
    const floorY = h * 0.82 // where bars sit
    const horizonY = h * 0.18 // vanishing point Y
    const vx = w * 0.5 // vanishing point X (centre)

    const barW = (w * 0.9) / NUM_BARS
    const gapW = barW * 0.18
    const faceW = barW - gapW
    const depthScale = barW * 0.55 // how far the top face extends toward horizon
    const startX = w * 0.05

    // Reflection opacity
    const reflAlpha = 0.18 + bass * 0.12

    withSafeCanvasState(ctx, () => {
      // Draw back-to-front so taller bars don't occlude shorter neighbours
      // Find sorted render order: draw shortest bars first
      const barData = []
      for (let i = 0; i < NUM_BARS; i++) {
        const freqPerBar = maxFreqIndex / NUM_BARS
        const s = Math.floor(i * freqPerBar)
        const e = Math.max(s + 1, Math.floor((i + 1) * freqPerBar))
        const rawVal = averageRange(dataArray, s, e) / 255
        const gain = calculateDynamicGain(i, NUM_BARS)
        const target = Math.min(1, rawVal * gain * 1.6 * intensity)
        const alpha = i < NUM_BARS * 0.15 ? 0.35 : 0.18
        smooth[i] = smooth[i] * (1 - alpha) + target * alpha
        barData.push({ i, val: smooth[i] })
      }

      // Draw bars front-to-back by index (left to right is fine for perspective)
      for (const { i, val } of barData) {
        const x0 = startX + i * barW + gapW / 2
        const barH = val * floorY * 0.88

        // Bar top y (front edge)
        const topY = floorY - barH
        // Perspective offset: converge toward vanishing point
        const frontCx = x0 + faceW / 2
        const dxFromVP = frontCx - vx
        const perspFactor = topY / floorY // 0..1 where 0=floor, 1=top
        const sideDepthX = (dxFromVP / w) * depthScale * perspFactor
        const sideDepthY = depthScale * 0.45 * (1 - perspFactor * 0.5) * val

        // Colour per bar (hue shift by frequency index)
        const hueShift = (i / NUM_BARS) * 60 - 30
        const barHue = (hsl.h + hueShift + 360) % 360
        const brightness = 40 + val * 35
        const sat = 80 + val * 15

        if (barH < 1) continue

        // ── Front face ──────────────────────────────────────────
        ctx.beginPath()
        ctx.rect(x0, topY, faceW, barH)
        const frontGrad = ctx.createLinearGradient(0, topY, 0, floorY)
        frontGrad.addColorStop(0, `hsl(${barHue},${sat}%,${brightness + 15}%)`)
        frontGrad.addColorStop(0.5, `hsl(${barHue},${sat}%,${brightness}%)`)
        frontGrad.addColorStop(1, `hsl(${barHue},${sat - 10}%,${brightness - 15}%)`)
        ctx.fillStyle = frontGrad
        ctx.fill()

        // Front face edge highlight
        ctx.strokeStyle = `hsla(${barHue},${sat}%,${brightness + 30}%,0.6)`
        ctx.lineWidth = 0.8
        ctx.stroke()

        // ── Top face (perspective quad) ──────────────────────────
        ctx.beginPath()
        ctx.moveTo(x0, topY)
        ctx.lineTo(x0 + faceW, topY)
        ctx.lineTo(x0 + faceW + sideDepthX + depthScale * 0.5, topY - sideDepthY)
        ctx.lineTo(x0 + sideDepthX - depthScale * 0.08, topY - sideDepthY)
        ctx.closePath()
        ctx.fillStyle = `hsl(${barHue},${sat - 10}%,${brightness + 22}%)`
        ctx.fill()
        ctx.strokeStyle = `hsla(${barHue},${sat}%,${brightness + 35}%,0.5)`
        ctx.lineWidth = 0.6
        ctx.stroke()

        // ── Right side face ──────────────────────────────────────
        ctx.beginPath()
        ctx.moveTo(x0 + faceW, topY)
        ctx.lineTo(x0 + faceW + sideDepthX + depthScale * 0.5, topY - sideDepthY)
        ctx.lineTo(x0 + faceW + sideDepthX + depthScale * 0.5, floorY - sideDepthY * 0.1)
        ctx.lineTo(x0 + faceW, floorY)
        ctx.closePath()
        ctx.fillStyle = `hsl(${barHue},${sat - 20}%,${brightness - 10}%)`
        ctx.fill()

        // ── Reflection below floor ───────────────────────────────
        ctx.save()
        ctx.globalAlpha = reflAlpha * val
        // Flip vertically around floorY
        ctx.transform(1, 0, 0, -1, 0, floorY * 2)
        const reflGrad = ctx.createLinearGradient(0, topY, 0, floorY)
        reflGrad.addColorStop(0, `hsla(${barHue},${sat}%,${brightness}%,0)`)
        reflGrad.addColorStop(1, `hsl(${barHue},${sat}%,${brightness}%)`)
        ctx.fillStyle = reflGrad
        ctx.fillRect(x0, topY, faceW, barH)
        ctx.restore()
      }

      // ── Floor line ────────────────────────────────────────────────
      ctx.beginPath()
      ctx.moveTo(0, floorY)
      ctx.lineTo(w, floorY)
      ctx.strokeStyle = `hsla(${hsl.h},60%,50%,0.25)`
      ctx.lineWidth = 1
      ctx.stroke()

      // ── Subtle glow on floor around active bars ───────────────────
      if (bass > 0.2) {
        const glowGrad = ctx.createLinearGradient(0, floorY - 6, 0, floorY + 14)
        glowGrad.addColorStop(0, `hsla(${hsl.h},90%,60%,${bass * 0.35})`)
        glowGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGrad
        ctx.fillRect(0, floorY - 6, w, 20)
      }
    })
  },
}
