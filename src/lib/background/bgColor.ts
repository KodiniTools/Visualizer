/**
 * Farb-Helfer für die Hintergrund-Steuerung (Farbfeld ↔ rgba-Textanzeige).
 */

/** '#rrggbb' + Alpha → 'rgba(r, g, b, a)' */
export function hexToRGBA(hex: string, alpha: number | string): string {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** RGB-Kanäle (werden gerundet) → '#rrggbb' */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

/** 'rgb(...)' / 'rgba(...)' → { r, g, b, a } oder null. */
export function parseRGBA(
  rgbaString: string,
): { r: number; g: number; b: number; a: number } | null {
  const match = rgbaString.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i,
  )
  if (match) {
    // Gruppen 1–3 sind im Muster Pflicht
    return {
      r: parseInt(match[1] as string),
      g: parseInt(match[2] as string),
      b: parseInt(match[3] as string),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1.0,
    }
  }
  return null
}
