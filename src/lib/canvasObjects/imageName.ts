/**
 * Dateiname eines Canvas-Bildes.
 *
 * Canvas-Bilder (multiImageManager) tragen ihren ursprünglichen Dateinamen im
 * Feld `name`, damit z. B. die Bildvorschau zeigen kann, welche Datei auf dem
 * Canvas liegt. Wird kein Name übergeben, wird er – soweit möglich – aus der
 * Bild-URL abgeleitet (Stock-Galerie, Canvas-Presets). Data- und Blob-URLs
 * enthalten keinen Dateinamen; dann bleibt der Name `null`.
 */

/**
 * Leitet einen Dateinamen aus einer Bild-URL ab.
 * @returns z. B. "haus.jpg" für "/gallery/bg/haus.jpg?v=2"; null für data:/blob:
 */
export function fileNameFromSrc(src: unknown): string | null {
  if (typeof src !== 'string') return null
  const trimmed = src.trim()
  if (!trimmed || /^(data|blob):/i.test(trimmed)) return null
  const path = trimmed.split(/[?#]/)[0] ?? ''
  const segment = path.split('/').pop() || ''
  if (!segment) return null
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * Bestimmt den zu speichernden Dateinamen: expliziter Name vor URL-Ableitung.
 * @param name - expliziter Name (z. B. File.name)
 * @param imageObject - Bild-Element als Fallback (Name aus der URL)
 */
export function resolveImageName(
  name: unknown,
  imageObject?: { src?: string } | null,
): string | null {
  if (typeof name === 'string' && name.trim()) return name.trim()
  return fileNameFromSrc(imageObject?.src)
}

/**
 * Teilt einen Dateinamen für die gekürzte Anzeige in Stamm und Endung, damit
 * bei langen Namen der Stamm gekürzt wird, die Endung aber sichtbar bleibt.
 * @returns z. B. { base: 'urlaub', ext: '.jpg' }
 */
export function splitFileName(name: unknown): { base: string; ext: string } {
  const value = typeof name === 'string' ? name : ''
  const dot = value.lastIndexOf('.')
  // Kein Punkt, führender Punkt (".env") oder unplausibel lange "Endung"
  if (dot <= 0 || value.length - dot > 10) return { base: value, ext: '' }
  return { base: value.slice(0, dot), ext: value.slice(dot) }
}
