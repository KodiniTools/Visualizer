import { slideshowStableKey } from '../components/foto-panel/slideshow/slideshowImageKey.js'

/**
 * Übernimmt dauerhaft gemerkte Bild-Anpassungen in den Sitzungsspeicher der
 * Slideshow – nur für Bilder, die in dieser Sitzung noch keine haben (was
 * während der Sitzung geändert wurde, hat Vorrang).
 * @param {object} manager - SlideshowManager
 * @param {Array<object>} images - Slideshow-Einträge
 * @param {{ resolveImageObject: (img:object) => object|null, getAdjustments: (key:string|null) => {adjustments:object, audioMode:string}|null }} deps
 * @returns {number} Anzahl übernommener Bilder
 */
export function restorePersistedAdjustments(
  manager,
  images,
  { resolveImageObject, getAdjustments },
) {
  if (!manager || !Array.isArray(images)) return 0
  let restored = 0
  for (const img of images) {
    const obj = resolveImageObject(img)
    if (!obj || manager.getImageAdjustments(obj)) continue
    const stored = getAdjustments(slideshowStableKey({ ...img, imageObject: obj }))
    if (!stored?.adjustments) continue
    manager.setImageAdjustments(obj, stored.adjustments, stored.audioMode)
    restored++
  }
  return restored
}

/**
 * Nur die tatsächlich geänderten Anpassungen eines Bildes: Felder, die vom
 * Standard (fotoManager.defaultSettings) abweichen; Audio-Reaktiv nur, wenn es
 * von der Vorgabe des Panels abweicht (die wird beim Start ohnehin gesetzt).
 * @param {object} adjustments - fotoSettings-Kopie
 * @param {object} defaults - Standard-fotoSettings
 * @param {object|null} panelAudio - Audio-Vorgabe des Panels für dieses Bild
 * @returns {object|null} null, wenn nichts geändert wurde
 */
export function diffAdjustments(adjustments, defaults = {}, panelAudio = null) {
  if (!adjustments || typeof adjustments !== 'object') return null
  const diff = {}
  for (const [key, value] of Object.entries(adjustments)) {
    if (key === 'audioReactive' || key === 'renderBehindVisualizer' || key.startsWith('_')) continue
    if (key in defaults && JSON.stringify(defaults[key]) === JSON.stringify(value)) continue
    if (!(key in defaults) && (value === '' || value === null || value === undefined)) continue
    diff[key] = value
  }
  const ar = adjustments.audioReactive
  if (ar && typeof ar === 'object') {
    const baseline = panelAudio ?? defaults.audioReactive ?? null
    if (JSON.stringify(ar) !== JSON.stringify(baseline)) diff.audioReactive = ar
  }
  return Object.keys(diff).length > 0 ? diff : null
}
