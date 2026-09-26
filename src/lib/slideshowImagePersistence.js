/**
 * Dauerhafte Ablage hochgeladener Slideshow-Bilder für Presets.
 * Dünne Schicht über presetImageRepository (in Tests mockbar).
 */
import { blobFromImage, saveImageBlob, loadImage } from '../utils/presetImageRepository.js'

/**
 * Speichert ein hochgeladenes Slideshow-Bild dauerhaft.
 * @param {{ name?:string, imageObject?:HTMLImageElement, img?:HTMLImageElement }} entry
 * @returns {Promise<{ key:string, name:string }>}
 */
export async function persistUploadImage(entry) {
  const imageObject = entry?.imageObject || entry?.img
  const blob = await blobFromImage(imageObject)
  const key = await saveImageBlob(blob, entry?.name)
  return { key, name: entry?.name || '' }
}

/**
 * Lädt ein dauerhaft gespeichertes Bild.
 * @param {string} key
 * @returns {Promise<{ imageObject:HTMLImageElement, name:string }|null>}
 */
export function restoreUploadImage(key) {
  return loadImage(key)
}
