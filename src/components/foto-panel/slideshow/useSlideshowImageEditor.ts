import { ref, computed, watch, type Ref } from 'vue'
import type { SlideshowSourceImage } from '../../../lib/slideshowSources'
import type {
  SlideshowAdjustmentsApi,
  SlideshowImagePosition,
  SlideshowImageSizeInput,
} from '../slideshowAdjustmentsApi'
import type { SlideshowPanelProps } from './slideshowPanelTypes'
import type { SlideshowImageEditorField } from './useSlideshowPerImageSettings'

/** Abhängigkeiten von useSlideshowImageEditor */
export interface SlideshowImageEditorDeps {
  props: SlideshowPanelProps
  orderedImages: Ref<SlideshowSourceImage[]>
  backgroundMode: Ref<string>
  setForImage: (img: SlideshowSourceImage, field: SlideshowImageEditorField, value: unknown) => void
  /** Änderung sofort übernehmen */
  onLiveChange: () => void
}

/**
 * Einstellungen eines einzelnen Bildes bei pausierter Slideshow (Klick auf
 * das Bild in der Leiste): Auswahl, Position/Größe auf der Canvas und Werte
 * pro Bild (live übernommen).
 *
 * @param {object} deps
 * @param {object} deps.props - Props des Slideshow-Panels
 * @param {import('vue').Ref<object[]>} deps.orderedImages
 * @param {import('vue').Ref<string>} deps.backgroundMode
 * @param {(img: object, field: string, value: any) => void} deps.setForImage
 * @param {() => void} deps.onLiveChange - Änderung sofort übernehmen
 */
export function useSlideshowImageEditor({
  props,
  orderedImages,
  backgroundMode,
  setForImage,
  onLiveChange,
}: SlideshowImageEditorDeps) {
  const editorIndex = ref<number | null>(null)
  const editorImage = computed(() =>
    props.isActive && props.isPaused && Number.isInteger(editorIndex.value)
      ? (orderedImages.value[editorIndex.value as number] ?? null)
      : null,
  )

  watch(
    () => props.editImageRequest,
    (req) => {
      if (req && Number.isInteger(req.index) && props.isActive && props.isPaused) {
        editorIndex.value = req.index
      }
    },
  )
  // Beim Fortsetzen/Stoppen schließen
  watch(
    () => props.isActive && props.isPaused,
    (paused) => {
      if (!paused) editorIndex.value = null
    },
  )

  /** Liest einen Wert des bearbeiteten Bildes über die adjustments-api. */
  function fromApi<M extends 'getPosition' | 'getSize'>(method: M) {
    return computed((): ReturnType<SlideshowAdjustmentsApi[M]> | null => {
      // Abhängigkeiten: Bounds per Maus/Regler, Slideshow-Bereich, Hintergrund-Modus
      void props.boundsRevision
      void props.externalTransform
      void backgroundMode.value
      const img = editorImage.value
      return img
        ? ((props.adjustmentsApi?.[method]?.(img) as ReturnType<SlideshowAdjustmentsApi[M]>) ??
            null)
        : null
    })
  }

  // Mittelpunkt (relativ 0–1); null = nicht positionierbar
  const editorPosition = fromApi('getPosition')
  // Größe { width, height, defaultWidth, defaultHeight }
  const editorSize = fromApi('getSize')

  /** Größenregler im Bild-Editor → Bild auf der Canvas skalieren. */
  function updateEditedImageSize(size: SlideshowImageSizeInput | null | undefined) {
    const img = editorImage.value
    if (img && size) props.adjustmentsApi?.setSize?.(img, size)
  }

  /** Positionsregler im Bild-Editor → Bild auf der Canvas verschieben. */
  function updateEditedImagePosition(position: SlideshowImagePosition | null | undefined) {
    const img = editorImage.value
    if (img && position) props.adjustmentsApi?.setPosition?.(img, position)
  }

  /**
   * Setzt einen Wert pro Bild für das bearbeitete Bild und übernimmt ihn live.
   * @param {'transition'|'duration'|'fadeIn'|'fadeOut'|'audioMode'|'audioSource'} field
   */
  function updateEditedImage(field: SlideshowImageEditorField, value: unknown) {
    const img = editorImage.value
    if (!img) return
    setForImage(img, field, value)
    onLiveChange()
  }

  return {
    editorIndex,
    editorImage,
    editorPosition,
    editorSize,
    updateEditedImageSize,
    updateEditedImagePosition,
    updateEditedImage,
  }
}
