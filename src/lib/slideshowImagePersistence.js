/**
 * Dauerhafte Ablage hochgeladener Slideshow-Bilder für Presets.
 * Dünne Schicht über presetImageRepository (in Tests mockbar).
 */
import { blobFromImage, saveImageBlob, loadImage } from '../utils/presetImageRepository.js'
import { useImageGallery } from '../composables/useImageGallery.js'

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
 * Lädt ein dauerhaft gespeichertes Bild und legt es in die Upload-Galerie
 * (ohne die Auswahl zu ändern). Ist es dort schon vorhanden, wird der
 * vorhandene Eintrag verwendet.
 * @param {string} key
 * @returns {Promise<{ imageObject:HTMLImageElement, name:string, galleryId?:number }|null>}
 */
export async function restoreUploadImage(key) {
  const loaded = await loadImage(key)
  if (!loaded?.imageObject) return null
  const entry = useImageGallery().ensureGalleryImage(loaded.imageObject, loaded.name)
  return { imageObject: entry.img, name: entry.name, galleryId: entry.id }
}

/**
 * Lädt ein dauerhaft gespeichertes Bild, OHNE es in die Upload-Galerie zu
 * legen (z. B. für das Flächenbild unter der Slideshow).
 * @param {string} key
 * @returns {Promise<{ imageObject:HTMLImageElement, name:string }|null>}
 */
export async function loadPersistedImage(key) {
  const loaded = await loadImage(key)
  return loaded?.imageObject ? { imageObject: loaded.imageObject, name: loaded.name } : null
}
