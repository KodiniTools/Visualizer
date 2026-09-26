/**
 * Hilfs-Canvas passender Größe: legt bei Bedarf ein neues Canvas an (oder
 * ersetzt es bei Größenänderung) und liefert { canvas, ctx }.
 * @param {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D } | null} entry
 * @param {number} width
 * @param {number} height
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
 */
export function ensureSizedCanvas(entry, width, height) {
  if (entry && entry.canvas.width === width && entry.canvas.height === height) return entry
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d') }
}
