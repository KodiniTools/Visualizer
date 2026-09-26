import { ref, computed, watch } from 'vue'

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
}) {
  const editorIndex = ref(null)
  const editorImage = computed(() =>
    props.isActive && props.isPaused && Number.isInteger(editorIndex.value)
      ? (orderedImages.value[editorIndex.value] ?? null)
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
  function fromApi(method) {
    return computed(() => {
      // Abhängigkeiten: Bounds per Maus/Regler, Slideshow-Bereich, Hintergrund-Modus
      void props.boundsRevision
      void props.externalTransform
      void backgroundMode.value
      const img = editorImage.value
      return img ? (props.adjustmentsApi?.[method]?.(img) ?? null) : null
    })
  }

  // Mittelpunkt (relativ 0–1); null = nicht positionierbar
  const editorPosition = fromApi('getPosition')
  // Größe { width, height, defaultWidth, defaultHeight }
  const editorSize = fromApi('getSize')

  /** Größenregler im Bild-Editor → Bild auf der Canvas skalieren. */
  function updateEditedImageSize(size) {
    const img = editorImage.value
    if (img && size) props.adjustmentsApi?.setSize?.(img, size)
  }

  /** Positionsregler im Bild-Editor → Bild auf der Canvas verschieben. */
  function updateEditedImagePosition(position) {
    const img = editorImage.value
    if (img && position) props.adjustmentsApi?.setPosition?.(img, position)
  }

  /**
   * Setzt einen Wert pro Bild für das bearbeitete Bild und übernimmt ihn live.
   * @param {'transition'|'duration'|'fadeIn'|'fadeOut'|'audioMode'|'audioSource'} field
   */
  function updateEditedImage(field, value) {
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
