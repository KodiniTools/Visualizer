import { ref, computed } from 'vue'

/**
 * Hintergrund ersetzen: Modal (Datei-Upload + Vorschau) und Galerie-Auswahl.
 * @param {import('vue').Ref<object|null>} canvasManager
 * @param {{ backgroundImageSrc: import('vue').Ref<string|null>, workspaceBackgroundImageSrc: import('vue').Ref<string|null> }} sources
 */
export function useBgReplace(canvasManager, { backgroundImageSrc, workspaceBackgroundImageSrc }) {
  const showBackgroundReplaceModal = ref(false)
  const replaceType = ref('background')
  const pendingBackgroundReplaceImage = ref(null)
  const pendingBackgroundReplaceSrc = ref(null)

  const showBgReplaceGallery = ref(false)
  const bgGalleryCategories = ref([])
  const bgGalleryImages = ref([])
  const selectedBgCategory = ref(null)
  const selectedBgGalleryImage = ref(null)
  const bgGalleryLoading = ref(false)
  const bgGalleryCategoryCache = ref(new Map())

  const currentBackgroundForReplace = computed(() => {
    if (replaceType.value === 'workspace') {
      return workspaceBackgroundImageSrc.value
    }
    return backgroundImageSrc.value
  })

  // ===== MODAL =====

  function openBackgroundReplaceModal(type) {
    replaceType.value = type
    pendingBackgroundReplaceImage.value = null
    pendingBackgroundReplaceSrc.value = null
    showBackgroundReplaceModal.value = true
    console.log(`🖼️ Hintergrund-Ersetzung Modal geöffnet für: ${type}`)
  }

  function closeBackgroundReplaceModal() {
    showBackgroundReplaceModal.value = false
    pendingBackgroundReplaceImage.value = null
    pendingBackgroundReplaceSrc.value = null
    showBgReplaceGallery.value = false
    selectedBgGalleryImage.value = null
  }

  function handleBackgroundReplaceFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        pendingBackgroundReplaceImage.value = img
        pendingBackgroundReplaceSrc.value = e.target.result
        console.log(
          '🔍 Neues Hintergrundbild in Vorschau geladen:',
          img.naturalWidth,
          'x',
          img.naturalHeight,
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)

    event.target.value = ''
  }

  function confirmBackgroundReplace() {
    if (!pendingBackgroundReplaceImage.value || !canvasManager.value) return

    let result
    if (replaceType.value === 'workspace') {
      result = canvasManager.value.replaceWorkspaceBackground(pendingBackgroundReplaceImage.value)
    } else {
      result = canvasManager.value.replaceBackground(pendingBackgroundReplaceImage.value)
    }

    if (result) {
      console.log(
        `✅ ${replaceType.value === 'workspace' ? 'Workspace-' : ''}Hintergrund erfolgreich ersetzt`,
      )
    }

    closeBackgroundReplaceModal()
  }

  function cancelBackgroundReplace() {
    pendingBackgroundReplaceImage.value = null
    pendingBackgroundReplaceSrc.value = null
    console.log('❌ Hintergrund-Ersetzen abgebrochen')
  }

  // ===== GALERIE =====

  async function openBgReplaceGallery() {
    showBgReplaceGallery.value = true
    selectedBgGalleryImage.value = null

    if (bgGalleryCategories.value.length === 0) {
      await loadBgGalleryIndex()
    }
  }

  function closeBgReplaceGallery() {
    showBgReplaceGallery.value = false
    selectedBgGalleryImage.value = null
  }

  async function loadBgGalleryIndex() {
    bgGalleryLoading.value = true
    try {
      const paths = ['gallery/gallery.json', './gallery/gallery.json']
      let response = null

      for (const path of paths) {
        try {
          response = await fetch(path)
          if (response.ok) break
        } catch {
          // Nächsten Pfad versuchen
        }
      }

      if (!response || !response.ok) {
        throw new Error('Galerie konnte nicht geladen werden')
      }

      const data = await response.json()

      if (data._version === '2.0' && data.categories) {
        bgGalleryCategories.value = data.categories

        if (bgGalleryCategories.value.length > 0) {
          await selectBgGalleryCategory(bgGalleryCategories.value[0].id)
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Galerie:', error)
    } finally {
      bgGalleryLoading.value = false
    }
  }

  async function selectBgGalleryCategory(categoryId) {
    if (selectedBgCategory.value === categoryId) return

    selectedBgCategory.value = categoryId
    selectedBgGalleryImage.value = null

    if (bgGalleryCategoryCache.value.has(categoryId)) {
      bgGalleryImages.value = bgGalleryCategoryCache.value.get(categoryId)
      return
    }

    bgGalleryLoading.value = true
    try {
      const categoryInfo = bgGalleryCategories.value.find((c) => c.id === categoryId)
      if (!categoryInfo || !categoryInfo.jsonFile) {
        bgGalleryImages.value = []
        return
      }

      const response = await fetch(categoryInfo.jsonFile)
      if (!response.ok) {
        throw new Error(`Kategorie ${categoryId} konnte nicht geladen werden`)
      }

      const data = await response.json()
      const images = data.images || []

      bgGalleryCategoryCache.value.set(categoryId, images)
      bgGalleryImages.value = images
    } catch (error) {
      console.error('❌ Fehler beim Laden der Kategorie:', error)
      bgGalleryImages.value = []
    } finally {
      bgGalleryLoading.value = false
    }
  }

  function selectBgGalleryImage(image) {
    selectedBgGalleryImage.value = image
  }

  async function confirmBgReplaceFromGallery() {
    if (!selectedBgGalleryImage.value) {
      closeBgReplaceGallery()
      return
    }

    const imagePath = selectedBgGalleryImage.value.file

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imagePath
      })

      pendingBackgroundReplaceImage.value = img
      pendingBackgroundReplaceSrc.value = imagePath
      console.log('🔍 Galeriebild in Vorschau geladen:', imagePath)

      closeBgReplaceGallery()
    } catch (error) {
      console.error('❌ Fehler beim Laden des Galeriebildes:', error)
    }
  }

  return {
    showBackgroundReplaceModal,
    replaceType,
    pendingBackgroundReplaceImage,
    pendingBackgroundReplaceSrc,
    showBgReplaceGallery,
    bgGalleryCategories,
    bgGalleryImages,
    selectedBgCategory,
    selectedBgGalleryImage,
    bgGalleryLoading,
    bgGalleryCategoryCache,
    currentBackgroundForReplace,
    openBackgroundReplaceModal,
    closeBackgroundReplaceModal,
    handleBackgroundReplaceFile,
    confirmBackgroundReplace,
    cancelBackgroundReplace,
    openBgReplaceGallery,
    closeBgReplaceGallery,
    selectBgGalleryCategory,
    selectBgGalleryImage,
    confirmBgReplaceFromGallery,
  }
}
