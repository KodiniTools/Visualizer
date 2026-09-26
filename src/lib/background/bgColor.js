/**
 * Farb-Helfer für die Hintergrund-Steuerung (Farbfeld ↔ rgba-Textanzeige).
 */

/** '#rrggbb' + Alpha → 'rgba(r, g, b, a)' */
export function hexToRGBA(hex, alpha) {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** RGB-Kanäle (werden gerundet) → '#rrggbb' */
export function rgbToHex(r, g, b) {
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

/**
 * 'rgb(...)' / 'rgba(...)' → { r, g, b, a } oder null.
 * @param {string} rgbaString
 */
export function parseRGBA(rgbaString) {
  const match = rgbaString.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i,
  )
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1.0,
    }
  }
  return null
}
