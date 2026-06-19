import { ref, computed } from 'vue'

export function useCanvasImages({ multiImageManagerInstance, canvasManagerInstance, t }) {
  const selectedCanvasImageId = ref(null)
  const showImagePreview = ref(false)
  const previewImageData = ref(null)
  const previewImageIndex = ref(0)
  const replaceCanvasImageInput = ref(null)

  const showReplaceGallery = ref(false)
  const replaceGalleryCategories = ref([])
  const replaceGalleryImages = ref([])
  const selectedReplaceCategory = ref(null)
  const selectedReplaceImage = ref(null)
  const replaceGalleryLoading = ref(false)
  const replaceGalleryCategoryCache = ref(new Map())

  const pendingReplaceImage = ref(null)
  const pendingReplaceImageSrc = ref(null)

  const draggedImageIndex = ref(null)
  const dragOverIndex = ref(null)

  const canvasImages = computed(() => {
    const manager = multiImageManagerInstance.value
    if (!manager) return []
    return manager.getAllImages() || []
  })

  function selectCanvasImage(imgData) {
    const manager = multiImageManagerInstance.value
    const canvasManager = canvasManagerInstance.value
    if (!manager || !imgData) return

    if (canvasManager) {
      canvasManager.setActiveObject(imgData)
    } else {
      manager.setSelectedImage(imgData)
    }
    selectedCanvasImageId.value = imgData.id

    if (window.fotoPanelControls?.currentActiveImage) {
      window.fotoPanelControls.currentActiveImage.value = imgData
    }
  }

  function deleteCanvasImage(imageId) {
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

  function openImagePreview(imgData, index) {
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

  function handleReplaceCanvasImage(event) {
    const file = event.target.files?.[0]
    if (!file || !previewImageData.value) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        pendingReplaceImage.value = img
        pendingReplaceImageSrc.value = e.target.result
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
    event.target.value = ''
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
      let response = null

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
          await selectReplaceGalleryCategory(replaceGalleryCategories.value[0].id)
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Galerie:', error)
    } finally {
      replaceGalleryLoading.value = false
    }
  }

  async function selectReplaceGalleryCategory(categoryId) {
    if (selectedReplaceCategory.value === categoryId) return
    selectedReplaceCategory.value = categoryId
    selectedReplaceImage.value = null

    if (replaceGalleryCategoryCache.value.has(categoryId)) {
      replaceGalleryImages.value = replaceGalleryCategoryCache.value.get(categoryId)
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

  function selectReplaceGalleryImage(image) {
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

  function handleDragStart(event, index) {
    draggedImageIndex.value = index
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index.toString())
    setTimeout(() => event.target.classList.add('dragging'), 0)
  }

  function handleDragEnd() {
    draggedImageIndex.value = null
    dragOverIndex.value = null
  }

  function handleDragOver(event, index) {
    if (draggedImageIndex.value === null || draggedImageIndex.value === index) return
    dragOverIndex.value = index
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDragLeave() {}

  function handleDrop(event, toIndex) {
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
