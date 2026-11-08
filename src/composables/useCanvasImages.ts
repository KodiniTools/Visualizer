import { ref, computed, type Ref } from 'vue'
import { requestSlideshowImageEdit } from '../lib/slideshowEditRequest'
import { getFotoPanel } from '../lib/fotoPanelBridge'
import type { CanvasImage, MultiImageManager } from '../lib/multiImageManager'
import type { StockCategory, StockImage } from './useStockGallery'
import type { CanvasManagerRef, TranslateFn } from './types'

export interface CanvasImagesDeps {
  multiImageManagerInstance: Ref<MultiImageManager | null | undefined>
  canvasManagerInstance: CanvasManagerRef
  t: TranslateFn
}

export function useCanvasImages({
  multiImageManagerInstance,
  canvasManagerInstance,
  t,
}: CanvasImagesDeps) {
  const selectedCanvasImageId = ref<CanvasImage['id'] | null>(null)
  const showImagePreview = ref(false)
  const previewImageData = ref<CanvasImage | null>(null)
  const previewImageIndex = ref(0)
  const replaceCanvasImageInput = ref<HTMLInputElement | null>(null)

  const showReplaceGallery = ref(false)
  const replaceGalleryCategories = ref<StockCategory[]>([])
  const replaceGalleryImages = ref<StockImage[]>([])
  const selectedReplaceCategory = ref<string | null>(null)
  const selectedReplaceImage = ref<StockImage | null>(null)
  const replaceGalleryLoading = ref(false)
  const replaceGalleryCategoryCache = ref(new Map<string, StockImage[]>())

  const pendingReplaceImage = ref<HTMLImageElement | null>(null)
  const pendingReplaceImageSrc = ref<string | null>(null)

  const draggedImageIndex = ref<number | null>(null)
  const dragOverIndex = ref<number | null>(null)

  const canvasImages = computed(() => {
    const manager = multiImageManagerInstance.value
    if (!manager) return []
    return manager.getAllImages() || []
  })

  function selectCanvasImage(imgData: CanvasImage | null | undefined) {
    const manager = multiImageManagerInstance.value
    const canvasManager = canvasManagerInstance.value
    if (!manager || !imgData) return

    if (canvasManager) {
      canvasManager.setActiveObject(imgData)
    } else {
      manager.setSelectedImage(imgData)
    }
    selectedCanvasImageId.value = imgData.id

    const fotoPanel = getFotoPanel()
    if (fotoPanel) fotoPanel.currentActiveImage.value = imgData

    // Pausierte Slideshow: Einstellungen dieses Bildes im Slideshow-Panel öffnen
    requestSlideshowImageEdit(imgData)
  }

  function deleteCanvasImage(imageId: CanvasImage['id']) {
    const manager = multiImageManagerInstance.value
    if (!manager) return
    manager.removeImage(imageId)
    if (selectedCanvasImageId.value === imageId) {
      selectedCanvasImageId.value = null
    }
  }

  function deleteAllCanvasImages() {
    const manager = multiImageManagerInstance.value
    if (!manager) return
    manager.clear()
    selectedCanvasImageId.value = null
  }

  function openImagePreview(imgData: CanvasImage, index: number) {
    previewImageData.value = imgData
    previewImageIndex.value = index
    showImagePreview.value = true
  }

  function closeImagePreview() {
    showImagePreview.value = false
    previewImageData.value = null
    previewImageIndex.value = 0
    pendingReplaceImage.value = null
    pendingReplaceImageSrc.value = null
  }

  function handleReplaceCanvasImage(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !previewImageData.value) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = (e.target as FileReader).result as string
      const img = new Image()
      img.onload = () => {
        pendingReplaceImage.value = img
        pendingReplaceImageSrc.value = result
      }
      img.src = result
    }
    reader.readAsDataURL(file)
    input.value = ''
  }

  function confirmPendingReplace() {
    if (!pendingReplaceImage.value || !previewImageData.value) return
    const manager = multiImageManagerInstance.value
    if (!manager) return

    const result = manager.replaceImage(previewImageData.value.id, pendingReplaceImage.value)
    if (result) previewImageData.value = result

    pendingReplaceImage.value = null
    pendingReplaceImageSrc.value = null
  }

  function cancelPendingReplace() {
    pendingReplaceImage.value = null
    pendingReplaceImageSrc.value = null
  }

  async function openReplaceGallery() {
    showReplaceGallery.value = true
    selectedReplaceImage.value = null
    if (replaceGalleryCategories.value.length === 0) {
      await loadReplaceGalleryIndex()
    }
  }

  function closeReplaceGallery() {
    showReplaceGallery.value = false
    selectedReplaceImage.value = null
  }

  async function loadReplaceGalleryIndex() {
    replaceGalleryLoading.value = true
    try {
      const paths = ['gallery/gallery.json', './gallery/gallery.json']
      let response: Response | null = null

      for (const path of paths) {
        try {
          response = await fetch(path)
          if (response.ok) break
        } catch {
          // Try next path
        }
      }

      if (!response?.ok) throw new Error('Galerie konnte nicht geladen werden')

      const data = await response.json()
      if (data._version === '2.0' && data.categories) {
        replaceGalleryCategories.value = data.categories
        if (replaceGalleryCategories.value.length > 0) {
          await selectReplaceGalleryCategory(
            (replaceGalleryCategories.value[0] as StockCategory).id,
          )
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Galerie:', error)
    } finally {
      replaceGalleryLoading.value = false
    }
  }

  async function selectReplaceGalleryCategory(categoryId: string) {
    if (selectedReplaceCategory.value === categoryId) return
    selectedReplaceCategory.value = categoryId
    selectedReplaceImage.value = null

    if (replaceGalleryCategoryCache.value.has(categoryId)) {
      replaceGalleryImages.value = replaceGalleryCategoryCache.value.get(categoryId) as StockImage[]
      return
    }

    replaceGalleryLoading.value = true
    try {
      const categoryInfo = replaceGalleryCategories.value.find((c) => c.id === categoryId)
      if (!categoryInfo?.jsonFile) {
        replaceGalleryImages.value = []
        return
      }

      const response = await fetch(categoryInfo.jsonFile)
      if (!response.ok) throw new Error(`Kategorie ${categoryId} konnte nicht geladen werden`)

      const data = await response.json()
      const images = data.images || []
      replaceGalleryCategoryCache.value.set(categoryId, images)
      replaceGalleryImages.value = images
    } catch (error) {
      console.error('❌ Fehler beim Laden der Kategorie:', error)
      replaceGalleryImages.value = []
    } finally {
      replaceGalleryLoading.value = false
    }
  }

  function selectReplaceGalleryImage(image: StockImage) {
    selectedReplaceImage.value = image
  }

  async function confirmReplaceFromGallery() {
    if (!selectedReplaceImage.value || !previewImageData.value) {
      closeReplaceGallery()
      return
    }

    const imagePath = selectedReplaceImage.value.file
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imagePath
      })

      pendingReplaceImage.value = img
      pendingReplaceImageSrc.value = imagePath
      closeReplaceGallery()
    } catch (error) {
      console.error('❌ Fehler beim Laden des Galeriebildes:', error)
    }
  }

  function handleDragStart(event: DragEvent, index: number) {
    draggedImageIndex.value = index
    const dataTransfer = event.dataTransfer as DataTransfer
    dataTransfer.effectAllowed = 'move'
    dataTransfer.setData('text/plain', index.toString())
    setTimeout(() => (event.target as HTMLElement).classList.add('dragging'), 0)
  }

  function handleDragEnd() {
    draggedImageIndex.value = null
    dragOverIndex.value = null
  }

  function handleDragOver(event: DragEvent, index: number) {
    if (draggedImageIndex.value === null || draggedImageIndex.value === index) return
    dragOverIndex.value = index
    ;(event.dataTransfer as DataTransfer).dropEffect = 'move'
  }

  function handleDragLeave() {}

  function handleDrop(_event: DragEvent, toIndex: number) {
    const fromIndex = draggedImageIndex.value
    if (fromIndex === null || fromIndex === toIndex) {
      handleDragEnd()
      return
    }
    const manager = multiImageManagerInstance.value
    if (manager) manager.reorderImage(fromIndex, toIndex)
    handleDragEnd()
  }

  return {
    selectedCanvasImageId,
    showImagePreview,
    previewImageData,
    previewImageIndex,
    replaceCanvasImageInput,
    showReplaceGallery,
    replaceGalleryCategories,
    replaceGalleryImages,
    selectedReplaceCategory,
    selectedReplaceImage,
    replaceGalleryLoading,
    pendingReplaceImage,
    pendingReplaceImageSrc,
    draggedImageIndex,
    dragOverIndex,
    canvasImages,
    selectCanvasImage,
    deleteCanvasImage,
    deleteAllCanvasImages,
    openImagePreview,
    closeImagePreview,
    handleReplaceCanvasImage,
    confirmPendingReplace,
    cancelPendingReplace,
    openReplaceGallery,
    closeReplaceGallery,
    selectReplaceGalleryCategory,
    selectReplaceGalleryImage,
    confirmReplaceFromGallery,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
