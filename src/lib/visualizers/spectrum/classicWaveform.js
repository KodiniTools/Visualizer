/**
 * Classic Waveform visualizer — clean oscilloscope-style time-domain waveform
 * with dual mirrored lines and subtle fill.
 * @module visualizers/spectrum/classicWaveform
 */

import { hexToHsl, averageRange, withSafeCanvasState } from '../core/index.js'

export const classicWaveform = {
  name_de: 'Klassische Wellenform',
  name_en: 'Classic Waveform',
  needsTimeData: true,
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const hsl = hexToHsl(color)
    const cy = h / 2
    const energy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.5)) / 255

    ctx.clearRect(0, 0, w, h)

    withSafeCanvasState(ctx, () => {
      const step = w / (bufferLength - 1)

      // ── Build upper waveform path ──────────────────────────────────
      const pts = []
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0 - 1.0 // -1..1
        pts.push({ x: i * step, y: cy + v * cy * 0.85 * intensity })
      }

      // Smooth via quadratic curves
      function drawSmoothed(mirror) {
        ctx.beginPath()
        ctx.moveTo(pts[0].x, mirror ? 2 * cy - pts[0].y : pts[0].y)
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2
          const my = mirror ? 2 * cy - (pts[i].y + pts[i + 1].y) / 2 : (pts[i].y + pts[i + 1].y) / 2
          ctx.quadraticCurveTo(pts[i].x, mirror ? 2 * cy - pts[i].y : pts[i].y, mx, my)
        }
        ctx.lineTo(
          pts[pts.length - 1].x,
          mirror ? 2 * cy - pts[pts.length - 1].y : pts[pts.length - 1].y,
        )
      }

      // ── Filled area between waveform and centre ────────────────────
      ctx.beginPath()
      // top path forward
      ctx.moveTo(0, cy)
      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y)
      }
      // bottom path backward (mirror)
      for (let i = pts.length - 1; i >= 0; i--) {
        ctx.lineTo(pts[i].x, 2 * cy - pts[i].y)
      }
      ctx.closePath()

      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, `hsla(${hsl.h},100%,65%,${0.15 + energy * 0.2})`)
      grad.addColorStop(0.5, `hsla(${hsl.h},80%,40%,${0.05 + energy * 0.1})`)
      grad.addColorStop(1, `hsla(${hsl.h},100%,65%,${0.15 + energy * 0.2})`)
      ctx.fillStyle = grad
      ctx.fill()

      // ── Upper line ────────────────────────────────────────────────
      drawSmoothed(false)
      ctx.strokeStyle = `hsl(${hsl.h},100%,70%)`
      ctx.lineWidth = (1.5 + energy * 2.5) * intensity
      ctx.shadowColor = `hsl(${hsl.h},100%,60%)`
      ctx.shadowBlur = 8 + energy * 18
      ctx.lineJoin = 'round'
      ctx.stroke()

      // ── Mirrored lower line ───────────────────────────────────────
      drawSmoothed(true)
      ctx.strokeStyle = `hsla(${(hsl.h + 20) % 360},90%,60%,0.7)`
      ctx.lineWidth = (1 + energy * 1.5) * intensity
      ctx.shadowBlur = 4 + energy * 10
      ctx.stroke()

      // ── Centre baseline ───────────────────────────────────────────
      ctx.shadowBlur = 0
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(w, cy)
      ctx.strokeStyle = `hsla(${hsl.h},60%,50%,0.25)`
      ctx.lineWidth = 1
      ctx.stroke()
    })
  },
}
