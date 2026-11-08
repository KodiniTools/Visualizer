import { ref, type ComputedRef, type Ref } from 'vue'
import { slideshowImageKey } from './slideshowImageKey'
import { restorePresetImages } from '../../../lib/slideshowSources'
import { persistUploadImage, restoreUploadImage } from '../../../lib/slideshowImagePersistence'
import { isQuotaError } from '../../../utils/presetImageRepository'
import { MANUAL_CLEANUP_GRACE_MS } from '../../../stores/slideshowPresetStore'
import { formatBytes } from '../../../utils/formatBytes'
import { SLIDESHOW_AUDIO_DEFAULT } from '../../../lib/slideshowAudio'
import type { SlideshowSourceImage } from '../../../lib/slideshowSources'
import type { RelBounds } from '../../../lib/slideshowTransitions'
import type {
  useSlideshowPresetStore,
  SlideshowPreset,
  SlideshowSessionImage,
} from '../../../stores/slideshowPresetStore'
import type { useToastStore } from '../../../stores/toastStore'
import type { TranslateFn } from '../../../composables/types'
import type { SlideshowPanelEmit, SlideshowPanelProps } from './slideshowPanelTypes'
import type { useSlideshowPerImageSettings } from './useSlideshowPerImageSettings'

type PresetStore = ReturnType<typeof useSlideshowPresetStore>

/** Bild mit Preset-Slot an derselben Position (Slot kann fehlen) */
interface SlideshowSlotPairWithPreset {
  img: SlideshowSourceImage | null | undefined
  slot?: SlideshowPreset['slots'][number] | null
}

/** Abhängigkeiten von useSlideshowPanelPresets */
export interface SlideshowPanelPresetsDeps<S> {
  props: SlideshowPanelProps
  emit: SlideshowPanelEmit
  presetStore: PresetStore
  toastStore: ReturnType<typeof useToastStore>
  t: TranslateFn
  locale: Ref<string> | ComputedRef<string>
  orderedImages: Ref<SlideshowSourceImage[]>
  perImage: ReturnType<typeof useSlideshowPerImageSettings>
  /** globale Panel-Einstellungen für das Preset */
  captureSettings: () => S
  /** globale Einstellungen übernehmen */
  applySettings: (settings: SlideshowPreset['settings']) => void
  /** Start-/Live-Update-Konfiguration */
  buildPayload: () => object
}

/**
 * Speichert ein hochgeladenes Bild dauerhaft; ist der Speicher voll, werden
 * ungenutzte Preset-Bilder aufgeräumt und das Speichern einmal wiederholt.
 * @param {object} presetStore - useSlideshowPresetStore()
 * @param {object} img
 */
export async function persistImageWithCleanup(
  presetStore: PresetStore,
  img: Parameters<typeof persistUploadImage>[0],
) {
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
function stockRefOf(img: SlideshowSourceImage | null | undefined) {
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
 * @param {ReturnType<typeof import('./useSlideshowPerImageSettings').useSlideshowPerImageSettings>} deps.perImage
 * @param {() => object} deps.captureSettings - globale Panel-Einstellungen für das Preset
 * @param {(settings: object) => void} deps.applySettings - globale Einstellungen übernehmen
 * @param {() => object} deps.buildPayload - Start-/Live-Update-Konfiguration
 */
export function useSlideshowPanelPresets<S>({
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
}: SlideshowPanelPresetsDeps<S>) {
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

  async function savePreset(name: string) {
    // Zustand sofort festhalten – während des Speicherns der Bilder kann sich
    // die Liste ändern
    const images = [...orderedImages.value]
    const snapshot = {
      settings: captureSettings(),
      // Pro Position in der aktuellen Reihenfolge
      slots: images.map((img) => ({
        ...perImage.slotFor(img),
        adjustments: props.adjustmentsApi?.get(img) ?? null,
        bounds: (props.adjustmentsApi?.getBounds?.(img) ?? null) as RelBounds | object | null,
        // Stock-Bilder dauerhaft als Verweis (Galerie-Pfad) speichern
        stock: stockRefOf(img),
        upload: null as Awaited<ReturnType<typeof persistImageWithCleanup>> | null,
      })),
    }

    // Hochgeladene Bilder dauerhaft in IndexedDB ablegen (Verweis im Preset)
    const failed: (string | undefined)[] = []
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
    const saved = presetStore.savePreset(
      name,
      snapshot,
      images as unknown as SlideshowSessionImage[],
    )
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
  async function resolvePresetPairs(
    preset: SlideshowPreset,
  ): Promise<SlideshowSlotPairWithPreset[]> {
    const sessionList = presetStore.getSessionImages(preset.id)
    if (sessionList && sessionList.length > 0) {
      return sessionList.map((img, i) => ({
        img: img as unknown as SlideshowSourceImage,
        slot: preset.slots[i],
      }))
    }
    const restored = await restorePresetImages(
      preset.slots,
      props.images.length > 0 ? props.images : orderedImages.value,
      { loadUpload: restoreUploadImage },
    )
    if (restored && restored.missing.length > 0) {
      toastStore.warning(t('slideshow.presetImagesMissing') + ': ' + restored.missing.join(', '))
    }
    return (
      (restored?.pairs as SlideshowSlotPairWithPreset[] | undefined) ??
      orderedImages.value.map((img, i) => ({ img, slot: preset.slots[i] }))
    )
  }

  async function loadPreset(preset: SlideshowPreset) {
    const previousKeys = orderedImages.value.map(slideshowImageKey).join('|')
    const pairs = await resolvePresetPairs(preset)
    orderedImages.value = pairs.map((p) => p.img) as SlideshowSourceImage[]
    const imagesChanged = orderedImages.value.map(slideshowImageKey).join('|') !== previousKeys

    applySettings(preset.settings)

    // Bild-Anpassungen pro Position übernehmen (ohne Slot/Anpassung → verwerfen)
    pairs.forEach(({ img, slot }) => {
      props.adjustmentsApi?.set(
        img as SlideshowSourceImage,
        slot?.adjustments ?? null,
        slot?.audioMode ?? SLIDESHOW_AUDIO_DEFAULT,
      )
      // Eigene Position/Größe des Bildes (ohne → gemeinsamer Bereich)
      props.adjustmentsApi?.setBounds?.(img as SlideshowSourceImage, slot?.bounds ?? null)
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
