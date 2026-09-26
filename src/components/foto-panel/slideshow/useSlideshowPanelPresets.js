import { ref } from 'vue'
import { slideshowImageKey } from './slideshowImageKey.js'
import { restorePresetImages } from '../../../lib/slideshowSources.js'
import { persistUploadImage, restoreUploadImage } from '../../../lib/slideshowImagePersistence.js'
import { isQuotaError } from '../../../utils/presetImageRepository.js'
import { MANUAL_CLEANUP_GRACE_MS } from '../../../stores/slideshowPresetStore.js'
import { formatBytes } from '../../../utils/formatBytes.js'
import { SLIDESHOW_AUDIO_DEFAULT } from '../../../lib/slideshowAudio.js'

/**
 * Speichert ein hochgeladenes Bild dauerhaft; ist der Speicher voll, werden
 * ungenutzte Preset-Bilder aufgeräumt und das Speichern einmal wiederholt.
 * @param {object} presetStore - useSlideshowPresetStore()
 * @param {object} img
 */
export async function persistImageWithCleanup(presetStore, img) {
  try {
    return await persistUploadImage(img)
  } catch (e) {
    if (!isQuotaError(e)) throw e
    const removed = await presetStore.cleanupImages()
    if (removed === 0) throw e
    return persistUploadImage(img)
  }
}

/** Dauerhaft speicherbarer Verweis auf ein Stock-Bild (sonst null). */
function stockRefOf(img) {
  if (img?.source !== 'stock' || !img.stockImage) return null
  const { id, name, file, thumbnail } = img.stockImage
  return { id, name, file, thumbnail }
}

/**
 * Slideshow-Presets im Panel: speichern (Einstellungen + Slots pro Position,
 * Bilder dauerhaft), laden (Bilder wiederherstellen, Einstellungen/Slots
 * übernehmen, laufende Slideshow aktualisieren) und Preset-Bilder aufräumen.
 *
 * @param {object} deps
 * @param {object} deps.props - Props des Slideshow-Panels (images, isActive, adjustmentsApi)
 * @param {Function} deps.emit
 * @param {object} deps.presetStore
 * @param {object} deps.toastStore
 * @param {Function} deps.t
 * @param {import('vue').Ref<string>} deps.locale
 * @param {import('vue').Ref<object[]>} deps.orderedImages
 * @param {ReturnType<typeof import('./useSlideshowPerImageSettings.js').useSlideshowPerImageSettings>} deps.perImage
 * @param {() => object} deps.captureSettings - globale Panel-Einstellungen für das Preset
 * @param {(settings: object) => void} deps.applySettings - globale Einstellungen übernehmen
 * @param {() => object} deps.buildPayload - Start-/Live-Update-Konfiguration
 */
export function useSlideshowPanelPresets({
  props,
  emit,
  presetStore,
  toastStore,
  t,
  locale,
  orderedImages,
  perImage,
  captureSettings,
  applySettings,
  buildPayload,
}) {
  // „Jetzt aufräumen“: nicht mehr verwendete Preset-Bilder sofort entfernen
  const cleaningImages = ref(false)

  async function cleanupPresetImages() {
    if (cleaningImages.value) return
    cleaningImages.value = true
    try {
      const before = presetStore.imageStats.bytes
      const removed = await presetStore.cleanupImages({ minAgeMs: MANUAL_CLEANUP_GRACE_MS })
      const stats = await presetStore.refreshImageStats()
      if (removed > 0) {
        const freed = Math.max(0, before - stats.bytes)
        toastStore.success(
          `${t('slideshow.cleanupDone')}: ${removed} ${t(removed === 1 ? 'slideshow.storageImage' : 'slideshow.storageImages')} · ${formatBytes(freed, locale.value)}`,
        )
      } else {
        toastStore.info(t('slideshow.cleanupNothing'))
      }
    } finally {
      cleaningImages.value = false
    }
  }

  async function savePreset(name) {
    // Zustand sofort festhalten – während des Speicherns der Bilder kann sich
    // die Liste ändern
    const images = [...orderedImages.value]
    const snapshot = {
      settings: captureSettings(),
      // Pro Position in der aktuellen Reihenfolge
      slots: images.map((img) => ({
        ...perImage.slotFor(img),
        adjustments: props.adjustmentsApi?.get(img) ?? null,
        bounds: props.adjustmentsApi?.getBounds?.(img) ?? null,
        // Stock-Bilder dauerhaft als Verweis (Galerie-Pfad) speichern
        stock: stockRefOf(img),
      })),
    }

    // Hochgeladene Bilder dauerhaft in IndexedDB ablegen (Verweis im Preset)
    const failed = []
    const uploadRefs = await Promise.all(
      images.map(async (img) => {
        if (img.source === 'stock') return null
        try {
          return await persistImageWithCleanup(presetStore, img)
        } catch (e) {
          console.warn('[SlideshowPresets] Bild nicht dauerhaft gespeichert:', img.name, e)
          failed.push(img.name)
          return null
        }
      }),
    )
    snapshot.slots.forEach((slot, i) => {
      slot.upload = uploadRefs[i] ?? null
    })

    // Bilder zusätzlich für diese Sitzung merken (exakte Objekte)
    const saved = presetStore.savePreset(name, snapshot, images)
    if (!saved) toastStore.error(t('slideshow.presetSaveError'))
    else if (failed.length > 0) {
      toastStore.warning(t('slideshow.presetImagesNotPersisted') + ': ' + failed.join(', '))
    } else toastStore.success(t('slideshow.presetSaved'))
  }

  /**
   * Bilder eines Presets: 1. in dieser Sitzung gespeicherte Bilder,
   * 2. dauerhaft gespeicherte Verweise (Stock-Pfade, hochgeladene Bilder aus
   * IndexedDB; fehlende Positionen mit aktuell ausgewählten Uploads),
   * 3. aktuelle Auswahl.
   * @returns {Promise<{ img: object, slot?: object }[]>}
   */
  async function resolvePresetPairs(preset) {
    const sessionList = presetStore.getSessionImages(preset.id)
    if (sessionList && sessionList.length > 0) {
      return sessionList.map((img, i) => ({ img, slot: preset.slots[i] }))
    }
    const restored = await restorePresetImages(
      preset.slots,
      props.images.length > 0 ? props.images : orderedImages.value,
      { loadUpload: restoreUploadImage },
    )
    if (restored?.missing.length > 0) {
      toastStore.warning(t('slideshow.presetImagesMissing') + ': ' + restored.missing.join(', '))
    }
    return restored?.pairs ?? orderedImages.value.map((img, i) => ({ img, slot: preset.slots[i] }))
  }

  async function loadPreset(preset) {
    const previousKeys = orderedImages.value.map(slideshowImageKey).join('|')
    const pairs = await resolvePresetPairs(preset)
    orderedImages.value = pairs.map((p) => p.img)
    const imagesChanged = orderedImages.value.map(slideshowImageKey).join('|') !== previousKeys

    applySettings(preset.settings)

    // Bild-Anpassungen pro Position übernehmen (ohne Slot/Anpassung → verwerfen)
    pairs.forEach(({ img, slot }) => {
      props.adjustmentsApi?.set(
        img,
        slot?.adjustments ?? null,
        slot?.audioMode ?? SLIDESHOW_AUDIO_DEFAULT,
      )
      // Eigene Position/Größe des Bildes (ohne → gemeinsamer Bereich)
      props.adjustmentsApi?.setBounds?.(img, slot?.bounds ?? null)
    })
    // Einstellungen pro Position auf die aktuelle Reihenfolge übertragen
    perImage.applySlots(pairs)

    // Läuft die Slideshow, sofort übernehmen – bei anderen Bildern neu starten
    if (props.isActive) {
      if (imagesChanged) emit('start', buildPayload())
      else emit('live-update', buildPayload())
    }
    toastStore.success(t('slideshow.presetLoaded'))
  }

  return { cleaningImages, cleanupPresetImages, savePreset, loadPreset }
}
