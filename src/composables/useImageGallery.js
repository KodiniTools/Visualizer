/**
 * useImageGallery Composable
 * Verwaltet hochgeladene Bilder: Upload, Auswahl, Löschen
 */
import { ref, computed } from 'vue'

export function useImageGallery() {
  // Reaktive State
  const imageGallery = ref([])
  const selectedImageIndex = ref(null)
  const selectedImageIndices = ref(new Set())
  const lastSelectedImageIndex = ref(null)

  // Computed
  const selectedImage = computed(() => {
    if (selectedImageIndex.value !== null && imageGallery.value[selectedImageIndex.value]) {
      return imageGallery.value[selectedImageIndex.value]
    }
    return null
  })

  const selectedImages = computed(() => {
    return Array.from(selectedImageIndices.value)
      .sort((a, b) => a - b)
      .map((index) => imageGallery.value[index])
      .filter((img) => img !== undefined)
  })

  const selectedImageCount = computed(() => selectedImageIndices.value.size)

  // Prüfen ob ein hochgeladenes Bild ausgewählt ist
  const isImageSelected = (index) => {
    return selectedImageIndices.value.has(index)
  }

  // Formatiere Dateigröße
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Handle Image Upload (mit Multi-Upload)
  function handleImageUpload(event, onSuccess, onError) {
    const files = event.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        console.warn('Überspringe Nicht-Bild-Datei:', file.name)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const imageData = {
            id: Date.now() + Math.random(),
            img: img,
            name: file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name,
            dimensions: `${img.width}×${img.height}`,
            size: formatFileSize(file.size),
          }

          imageGallery.value.push(imageData)

          if (imageGallery.value.length === 1) {
            selectedImageIndex.value = 0
            selectedImageIndices.value = new Set([0])
            lastSelectedImageIndex.value = 0
          }

          console.log('✅ Bild zur Galerie hinzugefügt:', imageData.name, imageData.dimensions)
          if (onSuccess) onSuccess(imageData)
        }
        img.onerror = () => {
          console.error('❌ Bild konnte nicht geladen werden:', file.name)
          if (onError) onError(file.name)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })

    event.target.value = ''
  }

  // Bild aus Galerie auswählen (mit Mehrfachauswahl-Unterstützung)
  function selectImage(index, event = null) {
    const shiftKey = event?.shiftKey || false
    const ctrlKey = event?.ctrlKey || event?.metaKey || false

    if (shiftKey && lastSelectedImageIndex.value !== null) {
      const start = Math.min(lastSelectedImageIndex.value, index)
      const end = Math.max(lastSelectedImageIndex.value, index)

      if (!ctrlKey) {
        selectedImageIndices.value.clear()
      }

      for (let i = start; i <= end; i++) {
        selectedImageIndices.value.add(i)
      }
      selectedImageIndices.value = new Set(selectedImageIndices.value)
      console.log(`📌 ${end - start + 1} Bilder ausgewählt (Range)`)
    } else if (ctrlKey) {
      if (selectedImageIndices.value.has(index)) {
        selectedImageIndices.value.delete(index)
      } else {
        selectedImageIndices.value.add(index)
      }
      selectedImageIndices.value = new Set(selectedImageIndices.value)
      lastSelectedImageIndex.value = index
      console.log('📌 Bild getoggelt:', imageGallery.value[index].name)
    } else {
      selectedImageIndices.value = new Set([index])
      lastSelectedImageIndex.value = index
      console.log('📌 Bild ausgewählt:', imageGallery.value[index].name)
    }

    selectedImageIndex.value = index
  }

  // Alle hochgeladenen Bilder auswählen
  function selectAllImages() {
    const indices = imageGallery.value.map((_, index) => index)
    selectedImageIndices.value = new Set(indices)
    if (indices.length > 0) {
      selectedImageIndex.value = indices[0]
      lastSelectedImageIndex.value = indices[0]
    }
    console.log(`📌 Alle ${indices.length} Bilder ausgewählt`)
  }

  // Auswahl aller hochgeladenen Bilder aufheben
  function deselectAllImages() {
    selectedImageIndices.value = new Set()
    selectedImageIndex.value = null
    lastSelectedImageIndex.value = null
    console.log('📌 Bildauswahl aufgehoben')
  }

  // Einzelnes Bild aus Galerie löschen
  function deleteImage(index) {
    const deletedImage = imageGallery.value[index]
    imageGallery.value.splice(index, 1)

    const newSelectedIndices = new Set()
    selectedImageIndices.value.forEach((i) => {
      if (i < index) {
        newSelectedIndices.add(i)
      } else if (i > index) {
        newSelectedIndices.add(i - 1)
      }
    })
    selectedImageIndices.value = newSelectedIndices

    if (selectedImageIndex.value === index) {
      selectedImageIndex.value = imageGallery.value.length > 0 ? 0 : null
    } else if (selectedImageIndex.value > index) {
      selectedImageIndex.value--
    }

    if (lastSelectedImageIndex.value === index) {
      lastSelectedImageIndex.value = null
    } else if (lastSelectedImageIndex.value > index) {
      lastSelectedImageIndex.value--
    }

    console.log('🗑️ Bild gelöscht:', deletedImage.name)
    return deletedImage
  }

  // Alle Bilder löschen
  function clearAllImages() {
    const count = imageGallery.value.length
    imageGallery.value = []
    selectedImageIndex.value = null
    selectedImageIndices.value = new Set()
    lastSelectedImageIndex.value = null
    console.log('🗑️ Galerie geleert')
    return count
  }

  return {
    // State
    imageGallery,
    selectedImageIndex,
    selectedImageIndices,

    // Computed
    selectedImage,
    selectedImages,
    selectedImageCount,

    // Methods
    isImageSelected,
    formatFileSize,
    handleImageUpload,
    selectImage,
    selectAllImages,
    deselectAllImages,
    deleteImage,
    clearAllImages,
  }
}
