import { ref, watch } from 'vue'
import { loadPlacementSettings, savePlacementSettings } from '../../lib/imagePlacementSettings.js'

/**
 * Eigene Galerie-Bilder auf den Canvas bringen: direkt, per Bereichsauswahl
 * (mit Animation/Skalierung/Versatz), als (Workspace-)Hintergrund oder aus der
 * Vorschau heraus.
 *
 * @param {object} deps
 * @param {import('vue').Ref} deps.multiImageManagerRef
 * @param {import('vue').Ref} deps.canvasManagerRef
 * @param {ReturnType<typeof import('../../composables/useImageGallery.js').useImageGallery>} deps.gallery
 * @param {object} deps.toastStore
 * @param {(key: string) => string} deps.t
 */
export function useImagePlacement({
  multiImageManagerRef,
  canvasManagerRef,
  gallery,
  toastStore,
  t,
}) {
  const { imageGallery, selectedImages, selectedImageCount, deselectAllImages } = gallery

  // Platzierungs-Einstellungen (dauerhaft gespeichert)
  const savedPlacement = loadPlacementSettings('uploads')
  const selectedAnimation = ref(savedPlacement.selectedAnimation)
  const animationDuration = ref(savedPlacement.animationDuration)
  const imageScale = ref(savedPlacement.imageScale)
  const imageOffsetX = ref(savedPlacement.imageOffsetX)
  const imageOffsetY = ref(savedPlacement.imageOffsetY)
  watch([selectedAnimation, animationDuration, imageScale, imageOffsetX, imageOffsetY], (v) =>
    savePlacementSettings('uploads', {
      selectedAnimation: v[0],
      animationDuration: v[1],
      imageScale: v[2],
      imageOffsetX: v[3],
      imageOffsetY: v[4],
    }),
  )

  // Bereichsauswahl-Modus
  const isInRangeSelectionMode = ref(false)
  const pendingRangeSelectionImage = ref(null)

  // Bild-Vorschau
  const previewImage = ref(null)

  /** Genau ein ausgewähltes Galerie-Bild (sonst null). */
  function singleSelection() {
    if (selectedImageCount.value !== 1) return null
    return selectedImages.value[0] || null
  }

  // ─── Galerie ────────────────────────────────────────────────────────────

  function handleImageUpload(event) {
    gallery.handleImageUpload(
      event,
      () => toastStore.success(t('toast.imageLoadSuccess')),
      (name) => toastStore.error(`${t('toast.imageLoadError')}: ${name}`),
    )
  }

  function clearAllImages() {
    if (!confirm(`Alle ${imageGallery.value.length} Bilder aus der Galerie löschen?`)) return
    gallery.clearAllImages()
  }

  // ─── Platzieren ─────────────────────────────────────────────────────────

  function addImageToCanvas() {
    const imagesToAdd = selectedImages.value
    if (imagesToAdd.length === 0) return
    const multiImageManager = multiImageManagerRef?.value
    if (!multiImageManager) return

    imagesToAdd.forEach((imgData) => {
      multiImageManager.addImage(imgData.img)
    })

    console.log(`✅ ${imagesToAdd.length} Bild(er) auf Canvas platziert`)
    toastStore.success(t('toast.imagesAddedToCanvas').replace('{count}', imagesToAdd.length))
    deselectAllImages()
  }

  function setAsBackground() {
    const imgToSet = singleSelection()
    if (!imgToSet) return
    const canvasManager = canvasManagerRef?.value
    if (!canvasManager) return
    canvasManager.setBackground(imgToSet.img)
    console.log('✅ Bild als Hintergrund gesetzt:', imgToSet.name)
    deselectAllImages()
  }

  function setAsWorkspaceBackground() {
    const imgToSet = singleSelection()
    if (!imgToSet) return
    const canvasManager = canvasManagerRef?.value
    if (!canvasManager) return
    const success = canvasManager.setWorkspaceBackground(imgToSet.img)
    if (success) {
      console.log('✅ Bild als Workspace-Hintergrund gesetzt:', imgToSet.name)
      deselectAllImages()
    } else {
      toastStore.warning(t('toast.selectWorkspaceFirst'))
    }
  }

  function updatePlacementSettings(settings) {
    selectedAnimation.value = settings.selectedAnimation
    animationDuration.value = settings.animationDuration
    imageScale.value = settings.imageScale
    imageOffsetX.value = settings.imageOffsetX
    imageOffsetY.value = settings.imageOffsetY
  }

  function startUploadedImageRangeSelection() {
    const imgData = singleSelection()
    if (!imgData || !imgData.img) return
    const canvasManager = canvasManagerRef?.value
    if (!canvasManager) return

    pendingRangeSelectionImage.value = imgData.img
    isInRangeSelectionMode.value = true
    canvasManager.startImageSelectionMode(
      (bounds) => handleRangeSelectionComplete(bounds),
      selectedAnimation.value,
    )
    console.log('📐 Bereichsauswahl-Modus gestartet für hochgeladenes Bild:', imgData.name)
  }

  function handleRangeSelectionComplete(bounds) {
    if (!bounds || !pendingRangeSelectionImage.value) {
      isInRangeSelectionMode.value = false
      pendingRangeSelectionImage.value = null
      return
    }

    const multiImageManager = multiImageManagerRef?.value
    const canvasManager = canvasManagerRef?.value
    if (!multiImageManager || !canvasManager) {
      isInRangeSelectionMode.value = false
      return
    }

    // Ausgewählten Bereich um sein Zentrum skalieren und verschieben
    const canvas = canvasManager.canvas
    const scale = imageScale.value
    const offsetX = imageOffsetX.value / canvas.width
    const offsetY = imageOffsetY.value / canvas.height

    const scaledBounds = {
      ...bounds,
      relWidth: bounds.relWidth * scale,
      relHeight: bounds.relHeight * scale,
      relX: bounds.relX + (bounds.relWidth * (1 - scale)) / 2 + offsetX,
      relY: bounds.relY + (bounds.relHeight * (1 - scale)) / 2 + offsetY,
    }

    multiImageManager.addImageWithBounds(
      pendingRangeSelectionImage.value,
      scaledBounds,
      bounds.animation || selectedAnimation.value,
      { duration: animationDuration.value },
    )

    deselectAllImages()

    isInRangeSelectionMode.value = false
    pendingRangeSelectionImage.value = null
  }

  function addUploadedImageDirectly() {
    const imgData = singleSelection()
    if (!imgData || !imgData.img) return
    const multiImageManager = multiImageManagerRef?.value
    const canvasManager = canvasManagerRef?.value
    if (!multiImageManager || !canvasManager) return

    // Canvas-Mitte + Versatz, Grundgröße 15 % × Skalierung
    const canvas = canvasManager.canvas
    const relX = 0.5 + imageOffsetX.value / canvas.width
    const relY = 0.5 + imageOffsetY.value / canvas.height
    const baseSize = 0.15
    const relSize = baseSize * imageScale.value

    const bounds = {
      relX: relX - relSize / 2,
      relY: relY - relSize / 2,
      relWidth: relSize,
      relHeight: relSize,
    }

    multiImageManager.addImageWithBounds(imgData.img, bounds, selectedAnimation.value, {
      duration: animationDuration.value,
    })
    console.log('✅ Bild platziert')
    deselectAllImages()
  }

  // ─── Vorschau ───────────────────────────────────────────────────────────

  function openUploadedPreview(imgData) {
    previewImage.value = {
      src: imgData.img.src,
      name: imgData.name,
      type: 'uploaded',
      data: imgData,
    }
  }

  function closePreview() {
    previewImage.value = null
  }

  function addPreviewToCanvas() {
    if (!previewImage.value) return
    const multiImageManager = multiImageManagerRef?.value
    if (!multiImageManager) return

    multiImageManager.addImage(previewImage.value.data.img)
    closePreview()
  }

  function setPreviewAsBackground() {
    if (!previewImage.value) return
    const canvasManager = canvasManagerRef?.value
    if (!canvasManager) return

    canvasManager.setBackground(previewImage.value.data.img)
    closePreview()
  }

  return {
    selectedAnimation,
    animationDuration,
    imageScale,
    imageOffsetX,
    imageOffsetY,
    isInRangeSelectionMode,
    previewImage,
    handleImageUpload,
    clearAllImages,
    addImageToCanvas,
    setAsBackground,
    setAsWorkspaceBackground,
    updatePlacementSettings,
    startUploadedImageRangeSelection,
    addUploadedImageDirectly,
    openUploadedPreview,
    closePreview,
    addPreviewToCanvas,
    setPreviewAsBackground,
  }
}
