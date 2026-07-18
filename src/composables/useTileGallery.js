import { ref } from 'vue'

/**
 * Verwaltet den Zustand und die Datenbeschaffung des Galerie-Modals, über das
 * ein Bild aus der gehosteten Galerie in die aktuell ausgewählte Kachel
 * geladen werden kann.
 *
 * @param {object} tilesStore - Der Background-Tiles-Store
 * @param {Function} redraw   - Callback zum Neuzeichnen des Canvas
 */
export function useTileGallery(tilesStore, redraw) {
  const showGalleryModal = ref(false)
  const galleryCategories = ref([])
  const galleryImages = ref([])
  const selectedGalleryCategory = ref(null)
  const selectedGalleryImage = ref(null)
  const galleryLoading = ref(false)
  const galleryCategoryCache = ref(new Map())

  // Galerie-Modal öffnen
  async function openGalleryModal() {
    showGalleryModal.value = true
    selectedGalleryImage.value = null

    // Galerie-Index laden wenn noch nicht geladen
    if (galleryCategories.value.length === 0) {
      await loadGalleryIndex()
    }
  }

  // Galerie-Modal schließen
  function closeGalleryModal() {
    showGalleryModal.value = false
    selectedGalleryImage.value = null
  }

  // Galerie-Index laden
  async function loadGalleryIndex() {
    galleryLoading.value = true
    try {
      const paths = ['gallery/gallery.json', './gallery/gallery.json']
      let response = null

      for (const path of paths) {
        try {
          response = await fetch(path)
          if (response.ok) break
        } catch (e) {
          // Try next path
        }
      }

      if (!response || !response.ok) {
        throw new Error('Galerie konnte nicht geladen werden')
      }

      const data = await response.json()

      if (data._version === '2.0' && data.categories) {
        galleryCategories.value = data.categories

        // Erste Kategorie auswählen und laden
        if (galleryCategories.value.length > 0) {
          await selectGalleryCategory(galleryCategories.value[0].id)
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Galerie:', error)
    } finally {
      galleryLoading.value = false
    }
  }

  // Kategorie auswählen
  async function selectGalleryCategory(categoryId) {
    if (selectedGalleryCategory.value === categoryId) return

    selectedGalleryCategory.value = categoryId
    selectedGalleryImage.value = null

    // Prüfen ob bereits im Cache
    if (galleryCategoryCache.value.has(categoryId)) {
      galleryImages.value = galleryCategoryCache.value.get(categoryId)
      return
    }

    galleryLoading.value = true
    try {
      const categoryInfo = galleryCategories.value.find((c) => c.id === categoryId)
      if (!categoryInfo || !categoryInfo.jsonFile) {
        galleryImages.value = []
        return
      }

      const response = await fetch(categoryInfo.jsonFile)
      if (!response.ok) {
        throw new Error(`Kategorie ${categoryId} konnte nicht geladen werden`)
      }

      const data = await response.json()
      const images = data.images || []

      // Im Cache speichern
      galleryCategoryCache.value.set(categoryId, images)
      galleryImages.value = images
    } catch (error) {
      console.error('❌ Fehler beim Laden der Kategorie:', error)
      galleryImages.value = []
    } finally {
      galleryLoading.value = false
    }
  }

  // Bild auswählen
  function selectGalleryImage(image) {
    selectedGalleryImage.value = image
  }

  // Auswahl bestätigen und Bild in Kachel laden
  async function confirmGallerySelection() {
    if (!selectedGalleryImage.value || tilesStore.selectedTileIndex === null) {
      closeGalleryModal()
      return
    }

    const imagePath = selectedGalleryImage.value.file

    try {
      // Bild laden
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imagePath
      })

      // Bild als Data-URL konvertieren für Persistenz
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

      // Bild in Kachel setzen
      tilesStore.setTileImage(tilesStore.selectedTileIndex, img, dataUrl)

      redraw()

      console.log('✅ Bild aus Galerie in Kachel geladen:', selectedGalleryImage.value.name)
    } catch (error) {
      console.error('❌ Fehler beim Laden des Galerie-Bildes:', error)
    }

    closeGalleryModal()
  }

  return {
    showGalleryModal,
    galleryCategories,
    galleryImages,
    selectedGalleryCategory,
    selectedGalleryImage,
    galleryLoading,
    openGalleryModal,
    closeGalleryModal,
    loadGalleryIndex,
    selectGalleryCategory,
    selectGalleryImage,
    confirmGallerySelection,
  }
}
