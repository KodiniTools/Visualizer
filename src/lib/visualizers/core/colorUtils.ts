/**
 * Color utility functions for visualizers
 * @module visualizers/core/colorUtils
 */

import { CONSTANTS } from './constants'

/**
 * Cache for hexToHsl conversions to improve performance
 */
const colorCache = new Map<string, Hsl>()

/** HSL-Farbe: h 0–360, s/l 0–100 */
export interface Hsl {
  h: number
  s: number
  l: number
}

/**
 * Clear color cache if it gets too large
 */
function maintainColorCache() {
  if (colorCache.size > CONSTANTS.COLOR_CACHE_MAX_SIZE) {
    const firstKey = colorCache.keys().next().value as string // size > 0
    colorCache.delete(firstKey)
  }
}

/**
 * Convert HEX color to HSL
 * @param {string} hex - HEX color string (e.g., "#FF0000")
 * @returns {{h: number, s: number, l: number}} HSL color object
 */
export function hexToHsl(hex: string): Hsl {
  const cached = colorCache.get(hex)
  if (cached) {
    return cached
  }
  let r = 0,
    g = 0,
    b = 0
  if (hex.length === 4) {
    r = parseInt(hex.charAt(1) + hex.charAt(1), 16)
    g = parseInt(hex.charAt(2) + hex.charAt(2), 16)
    b = parseInt(hex.charAt(3) + hex.charAt(3), 16)
  } else if (hex.length === 7) {
    r = parseInt(hex.charAt(1) + hex.charAt(2), 16)
    g = parseInt(hex.charAt(3) + hex.charAt(4), 16)
    b = parseInt(hex.charAt(5) + hex.charAt(6), 16)
  }
  r /= 255
  g /= 255
  b /= 255
  const cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin
  let h = 0,
    s = 0,
    l = 0
  if (delta === 0) h = 0
  else if (cmax === r) h = ((g - b) / delta) % 6
  else if (cmax === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  h = Math.round(h * 60)
  if (h < 0) h += 360
  l = (cmax + cmin) / 2
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  s = +(s * 100).toFixed(1)
  l = +(l * 100).toFixed(1)
  const result = { h, s, l }
  colorCache.set(hex, result)
  maintainColorCache()
  return result
}
