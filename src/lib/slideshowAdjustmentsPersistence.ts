import { slideshowStableKey } from '../components/foto-panel/slideshow/slideshowImageKey'

type Loose = Record<string, unknown>

/**
 * Benötigter Ausschnitt des SlideshowManagers. `Img` ist der Typ der
 * Bild-Objekte (beim SlideshowManager HTMLImageElement); dieselben Objekte
 * liefert `resolveImageObject`.
 */
export interface AdjustmentsManager<Img = object> {
  getImageAdjustments(obj: Img): unknown
  setImageAdjustments(obj: Img, adjustments: object, audioMode?: string): unknown
  getImageBounds(obj: Img): unknown
  setImageBounds(obj: Img, bounds: object): unknown
}

export interface StoredAdjustments {
  adjustments: object
  audioMode?: string
}

/**
 * Übernimmt dauerhaft gemerkte Bild-Anpassungen in den Sitzungsspeicher der
 * Slideshow – nur für Bilder, die in dieser Sitzung noch keine haben (was
 * während der Sitzung geändert wurde, hat Vorrang).
 * @param {object} manager - SlideshowManager
 * @param {Array<object>} images - Slideshow-Einträge
 * @param {{ resolveImageObject: (img:object) => object|null, getAdjustments: (key:string|null) => {adjustments:object, audioMode:string}|null }} deps
 * @returns {number} Anzahl übernommener Bilder
 */
export function restorePersistedAdjustments<Img>(
  manager: Pick<AdjustmentsManager<Img>, 'getImageAdjustments' | 'setImageAdjustments'> | null,
  images: unknown,
  {
    resolveImageObject,
    getAdjustments,
  }: {
    resolveImageObject: (img: Loose) => Img | null
    getAdjustments: (key: string | null) => StoredAdjustments | null | undefined
  },
): number {
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
export function diffAdjustments(
  input: unknown,
  defaults: Loose = {},
  panelAudio: unknown = null,
): Loose | null {
  if (!input || typeof input !== 'object') return null
  const adjustments = input as Loose
  const diff: Loose = {}
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

/**
 * Übernimmt dauerhaft gemerkte eigene Größe/Position in die Slideshow – nur für
 * Bilder ohne eigene Bounds in dieser Sitzung.
 * @param {object} manager - SlideshowManager
 * @param {Array<object>} images - Slideshow-Einträge
 * @param {{ resolveImageObject: (img:object) => object|null, getBounds: (key:string|null) => object|null }} deps
 * @returns {number} Anzahl übernommener Bilder
 */
export function restorePersistedBounds<Img>(
  manager: Pick<AdjustmentsManager<Img>, 'getImageBounds' | 'setImageBounds'> | null,
  images: unknown,
  {
    resolveImageObject,
    getBounds,
  }: {
    resolveImageObject: (img: Loose) => Img | null
    getBounds: (key: string | null) => object | null | undefined
  },
): number {
  if (!manager || !Array.isArray(images)) return 0
  let restored = 0
  for (const img of images) {
    const obj = resolveImageObject(img)
    if (!obj || manager.getImageBounds(obj)) continue
    const bounds = getBounds(slideshowStableKey({ ...img, imageObject: obj }))
    if (!bounds) continue
    manager.setImageBounds(obj, bounds)
    restored++
  }
  return restored
}
