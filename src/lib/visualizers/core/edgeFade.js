/**
 * Weiche Kanten für verkleinerte oder verschobene Visualizer.
 *
 * Ein Visualizer wird immer in voller Canvas-Größe gerendert; "Position &
 * Größe" skaliert danach nur das fertige Bitmap. Bei 100 % fällt dessen Rand
 * mit der Canvas-Kante zusammen und ist unsichtbar. Sobald der Nutzer
 * verkleinert oder verschiebt, wird der Rand als hartes Rechteck sichtbar –
 * Inhalt jenseits der Kante wurde nie gezeichnet und lässt sich nicht
 * zurückholen. Dieses Modul blendet den Rand stattdessen weich aus, mit einer
 * Form, die der Visualizer selbst über `edgeFade` wählt:
 *
 *   'none'   – harter Rand (Balken, LED-Wände, Bühnen: der Rand gehört dazu)
 *   'radial' – Ellipse, für zentrierte Effekte (Galaxie, Ringe, Tunnel)
 *   'rect'   – weicher Rechteckrand, für flächige Effekte (Plasma, Zellen)
 *
 * Die Stärke der Ausblendung wächst mit dem sichtbaren Rand: bei 100 % und
 * mittiger Position ist sie 0 (unverändertes Verhalten), ab 85 % Größe oder
 * 7,5 % Versatz voll.
 *
 * @module visualizers/core/edgeFade
 */

/** Zulässige Werte für `visualizer.edgeFade`. */
export const EDGE_FADE = Object.freeze({ NONE: 'none', RADIAL: 'radial', RECT: 'rect' })

/** Unter dieser Größe ist die Ausblendung voll wirksam. */
const FULL_STRENGTH_SCALE = 0.85
/** Ab diesem Versatz (Anteil der Canvas-Kante) ist die Ausblendung voll wirksam. */
const FULL_STRENGTH_OFFSET = 0.075
/** Breite des weichen Rechteckrands, Anteil der kürzeren Bitmap-Kante. */
const RECT_FEATHER = 0.12
/** Innerer Radius der Ellipse (1 = Bitmap-Kante), ab dem ausgeblendet wird. */
const RADIAL_INNER = 0.65

const clamp01 = (v) => Math.max(0, Math.min(1, v))

/**
 * Wie stark der Rand ausgeblendet wird (0 = gar nicht, 1 = voll).
 *
 * @param {number} scale - Größe 0.1–2
 * @param {number} posX - Position 0–1 (0.5 = Mitte)
 * @param {number} posY - Position 0–1 (0.5 = Mitte)
 * @returns {number} 0–1
 */
export function edgeFadeStrength(scale, posX, posY) {
  const byScale = scale >= 1 ? 0 : clamp01((1 - scale) / (1 - FULL_STRENGTH_SCALE))
  const offset = Math.max(Math.abs(posX - 0.5), Math.abs(posY - 0.5))
  const byOffset = clamp01(offset / FULL_STRENGTH_OFFSET)
  return Math.max(byScale, byOffset)
}

/**
 * Zielrechteck des skalierten Bitmaps – dieselbe Rechnung, die bisher an
 * fünf Stellen im Render-Loop stand.
 *
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} destW
 * @param {number} destH
 * @param {{scale: number, posX: number, posY: number}} view
 * @returns {{x: number, y: number, w: number, h: number}}
 */
export function scaledDestRect(srcW, srcH, destW, destH, { scale, posX, posY }) {
  const w = srcW * scale
  const h = srcH * scale
  return { x: destW * posX - w / 2, y: destH * posY - h / 2, w, h }
}

// ── Masken-Canvas (wiederverwendet, je Größe eine Instanz) ────────────────

let createCanvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Nur für Tests: Canvas-Fabrik ersetzen (jsdom hat keinen 2D-Context). */
export function setEdgeFadeCanvasFactory(fn) {
  createCanvas = fn || createCanvas
  maskCanvas = null
  maskCtx = null
}

let maskCanvas = null
let maskCtx = null

function ensureMaskCanvas(w, h) {
  if (!maskCanvas || maskCanvas.width !== w || maskCanvas.height !== h) {
    maskCanvas = createCanvas(w, h)
    maskCtx = maskCanvas.getContext('2d')
  }
  return maskCtx
}

/**
 * Multipliziert den Masken-Canvas mit einer Ellipse (destination-in).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {number} strength
 */
function applyRadialMask(ctx, w, h, strength) {
  const inner = 1 - (1 - RADIAL_INNER) * strength
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  // Kreis im Einheitsraum, per Skalierung zur einbeschriebenen Ellipse
  ctx.translate(w / 2, h / 2)
  ctx.scale(w / 2, h / 2)
  const g = ctx.createRadialGradient(0, 0, inner, 0, 0, 1)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

/**
 * Multipliziert den Masken-Canvas mit einem weichen Rechteckrand: ein
 * horizontaler und ein vertikaler Verlauf, nacheinander per destination-in.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {number} strength
 */
function applyRectMask(ctx, w, h, strength) {
  const feather = RECT_FEATHER * Math.min(w, h) * strength
  if (feather <= 0) return
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  for (const [x1, y1] of [
    [w, 0],
    [0, h],
  ]) {
    const len = x1 || y1
    const g = ctx.createLinearGradient(0, 0, x1, y1)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(feather / len, 'rgba(0,0,0,1)')
    g.addColorStop(1 - feather / len, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

/**
 * Zeichnet ein Visualizer-Bitmap gemäß "Position & Größe" auf den Ziel-Context
 * und blendet dabei den Rand weich aus, wenn er sichtbar würde.
 *
 * @param {CanvasRenderingContext2D} targetCtx
 * @param {CanvasImageSource} source - Bitmap oder Canvas in Render-Größe
 * @param {number} srcW - Render-Breite
 * @param {number} srcH - Render-Höhe
 * @param {number} destW - Ziel-Breite (Canvas)
 * @param {number} destH - Ziel-Höhe (Canvas)
 * @param {{scale: number, posX: number, posY: number, edgeFade?: string}} view
 */
export function drawScaledVisualizer(targetCtx, source, srcW, srcH, destW, destH, view) {
  const { scale, posX, posY, edgeFade = EDGE_FADE.NONE } = view

  // Unverändertes Verhalten für den Normalfall: 100 %, mittig
  if (scale === 1.0 && posX === 0.5 && posY === 0.5) {
    if (srcW === destW && srcH === destH) targetCtx.drawImage(source, 0, 0)
    else targetCtx.drawImage(source, 0, 0, destW, destH)
    return
  }

  const rect = scaledDestRect(srcW, srcH, destW, destH, view)
  const strength = edgeFade === EDGE_FADE.NONE ? 0 : edgeFadeStrength(scale, posX, posY)

  let img = source
  if (strength > 0) {
    const ctx = ensureMaskCanvas(srcW, srcH)
    if (ctx) {
      ctx.clearRect(0, 0, srcW, srcH)
      ctx.drawImage(source, 0, 0, srcW, srcH)
      if (edgeFade === EDGE_FADE.RADIAL) applyRadialMask(ctx, srcW, srcH, strength)
      else applyRectMask(ctx, srcW, srcH, strength)
      img = maskCanvas
    }
  }

  targetCtx.drawImage(img, 0, 0, srcW, srcH, rect.x, rect.y, rect.w, rect.h)
}
