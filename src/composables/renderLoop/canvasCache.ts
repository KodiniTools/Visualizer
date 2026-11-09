/**
 * Hilfs-Canvas passender Größe: legt bei Bedarf ein neues Canvas an (oder
 * ersetzt es bei Größenänderung) und liefert { canvas, ctx }.
 */
export interface SizedCanvas {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

export function ensureSizedCanvas(
  entry: SizedCanvas | null | undefined,
  width: number,
  height: number,
): SizedCanvas {
  if (entry && entry.canvas.width === width && entry.canvas.height === height) return entry
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d') as CanvasRenderingContext2D }
}
