/**
 * Anwenden der berechneten Verformung auf den Canvas-Context.
 *
 * @module textManager/render/transform/apply
 */

/**
 * Wendet Rotation, Skalierung, Beat-Flip und Scherung um die Text-Position an.
 * Ohne wirksame Transformation bleibt der Context unberührt.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./index.js').TextTransform} t
 */
export function applyTextTransform(ctx, t) {
  const { pixelX, pixelY, scale, totalRotation, skewX, skewY, stretchX, stretchY, flipScaleX } = t

  const hasElastic = stretchX !== 1.0 || stretchY !== 1.0
  const hasTransform =
    totalRotation !== 0 ||
    scale !== 1.0 ||
    skewX !== 0 ||
    skewY !== 0 ||
    hasElastic ||
    flipScaleX !== 1
  if (!hasTransform) return

  ctx.translate(pixelX, pixelY)
  if (totalRotation !== 0) {
    ctx.rotate((totalRotation * Math.PI) / 180)
  }
  // ✨ Elastic: Asymmetrische Skalierung (Stretch)
  if (hasElastic) {
    ctx.scale(stretchX * scale, stretchY * scale)
  } else if (scale !== 1.0) {
    ctx.scale(scale, scale)
  }
  // ✨ Beat-Flip: horizontale Spiegelung im Takt
  if (flipScaleX !== 1) {
    ctx.scale(flipScaleX, 1)
  }
  // ✨ Skew-Transformation anwenden (Scheren-Effekt)
  if (skewX !== 0 || skewY !== 0) {
    // ctx.transform(a, b, c, d, e, f) - b und c sind die Scherfaktoren
    const skewXRad = (skewX * Math.PI) / 180
    const skewYRad = (skewY * Math.PI) / 180
    ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0)
  }
  ctx.translate(-pixelX, -pixelY)
}
