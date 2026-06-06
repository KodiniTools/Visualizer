/**
 * Vinyl Record visualizer — rotating vinyl disc with frequency-reactive grooves,
 * centre label, tonearm, and spinning animation.
 * @module visualizers/retro/vinylRecord
 */

import { hexToHsl, averageRange, visualizerState, withSafeCanvasState } from '../core/index.js'

export const vinylRecord = {
  name_de: 'Vinyl / Schallplatte',
  name_en: 'Vinyl Record',
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const hsl = hexToHsl(color)
    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h) * 0.44 // outer record radius
    const labelR = R * 0.28 // centre label radius
    const holeR = R * 0.035

    const bass = averageRange(dataArray, 0, Math.floor(bufferLength * 0.1)) / 255
    const mid =
      averageRange(dataArray, Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.5)) / 255
    const vol = (bass + mid) / 2

    // Rotation state
    if (!visualizerState._vinyl) {
      visualizerState._vinyl = { angle: 0, lastTime: performance.now() }
    }
    const now = performance.now()
    const dt = (now - visualizerState._vinyl.lastTime) / 1000
    visualizerState._vinyl.lastTime = now
    const rpm = 33.3 + bass * 10 * intensity // varies with beat
    visualizerState._vinyl.angle += (rpm / 60) * 2 * Math.PI * dt
    const angle = visualizerState._vinyl.angle

    ctx.clearRect(0, 0, w, h)

    withSafeCanvasState(ctx, () => {
      ctx.translate(cx, cy)
      ctx.rotate(angle)

      // ── Vinyl disc (dark with subtle gloss) ───────────────────────
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      const discGrad = ctx.createRadialGradient(0, 0, holeR, 0, 0, R)
      discGrad.addColorStop(0, '#0a0a0a')
      discGrad.addColorStop(0.27, '#111')
      discGrad.addColorStop(0.28, '#1a1a1a')
      discGrad.addColorStop(1, '#050505')
      ctx.fillStyle = discGrad
      ctx.fill()

      // ── Grooves (concentric rings, count reacts to frequency) ──────
      const grooveCount = 28
      for (let i = 0; i < grooveCount; i++) {
        const t = i / grooveCount
        const gr = labelR * 1.15 + t * (R - labelR * 1.15)
        const idx = Math.floor(t * bufferLength * 0.6)
        const amp = dataArray[idx] / 255
        const bright = 14 + amp * 18 * intensity
        ctx.beginPath()
        ctx.arc(0, 0, gr, 0, Math.PI * 2)
        ctx.strokeStyle = `hsl(${hsl.h},${8 + amp * 20}%,${bright}%)`
        ctx.lineWidth = 0.5 + amp * 1.2 * intensity
        ctx.stroke()
      }

      // ── Frequency-reactive colour wave on outer band ───────────────
      const bands = Math.min(bufferLength, 120)
      for (let i = 0; i < bands; i++) {
        const a0 = (i / bands) * Math.PI * 2
        const a1 = ((i + 1) / bands) * Math.PI * 2
        const amp = dataArray[Math.floor((i / bands) * bufferLength)] / 255
        const r0 = R * (0.75 + amp * 0.22 * intensity)
        const r1 = R * 0.97

        ctx.beginPath()
        ctx.moveTo(r0 * Math.cos(a0), r0 * Math.sin(a0))
        ctx.arc(0, 0, r1, a0, a1)
        ctx.lineTo(r0 * Math.cos(a1), r0 * Math.sin(a1))
        ctx.arc(0, 0, r0, a1, a0, true)
        ctx.closePath()
        ctx.fillStyle = `hsla(${(hsl.h + i * 1.5) % 360},80%,${40 + amp * 30}%,${0.18 + amp * 0.35})`
        ctx.fill()
      }

      // ── Gloss arc ─────────────────────────────────────────────────
      ctx.save()
      ctx.rotate(-angle * 0.3)
      const gloss = ctx.createLinearGradient(-R * 0.5, -R, R * 0.5, R * 0.4)
      gloss.addColorStop(0, 'rgba(255,255,255,0.06)')
      gloss.addColorStop(0.3, 'rgba(255,255,255,0.02)')
      gloss.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.fillStyle = gloss
      ctx.fill()
      ctx.restore()

      // ── Centre label ──────────────────────────────────────────────
      ctx.beginPath()
      ctx.arc(0, 0, labelR, 0, Math.PI * 2)
      const labelGrad = ctx.createRadialGradient(0, -labelR * 0.2, 0, 0, 0, labelR)
      labelGrad.addColorStop(0, `hsl(${hsl.h},70%,35%)`)
      labelGrad.addColorStop(0.6, `hsl(${hsl.h},60%,22%)`)
      labelGrad.addColorStop(1, `hsl(${hsl.h},50%,15%)`)
      ctx.fillStyle = labelGrad
      ctx.fill()

      // Label ring
      ctx.beginPath()
      ctx.arc(0, 0, labelR, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${hsl.h},60%,50%,0.5)`
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Label text (counter-rotates to stay upright)
      ctx.save()
      ctx.rotate(-angle)
      ctx.fillStyle = `hsl(${hsl.h},80%,75%)`
      ctx.font = `bold ${Math.max(8, labelR * 0.22)}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('♫', 0, 0)
      ctx.restore()

      // ── Centre hole ───────────────────────────────────────────────
      ctx.beginPath()
      ctx.arc(0, 0, holeR, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()
    })

    // ── Tonearm (static, drawn after canvas restore) ───────────────
    withSafeCanvasState(ctx, () => {
      const armPivotX = cx + R * 0.78
      const armPivotY = cy - R * 0.72
      const armAngle = -0.35 + vol * 0.04 // slight waver with volume
      const armLen = R * 1.05

      ctx.translate(armPivotX, armPivotY)
      ctx.rotate(armAngle)

      // Arm rod
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, armLen)
      ctx.strokeStyle = '#bbb'
      ctx.lineWidth = 2.5
      ctx.shadowColor = 'rgba(255,255,255,0.3)'
      ctx.shadowBlur = 4
      ctx.lineCap = 'round'
      ctx.stroke()

      // Head shell at end
      ctx.beginPath()
      ctx.arc(0, armLen, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#ccc'
      ctx.fill()

      // Pivot circle
      ctx.beginPath()
      ctx.arc(0, 0, 7, 0, Math.PI * 2)
      ctx.fillStyle = '#888'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, 0, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#ddd'
      ctx.fill()
    })
  },
}
