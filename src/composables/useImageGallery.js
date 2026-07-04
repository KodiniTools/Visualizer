/**
 * useImageGallery Composable
 * Verwaltet hochgeladene Bilder: Upload, Auswahl, Löschen
 *
 * Der State liegt auf Modulebene, damit die Galerie ein einziger, geteilter
 * Speicher ist. So können sowohl das FotoPanel als auch die App-Shell
 * (z. B. für per Handoff übernommene Bilder) dieselbe Galerie befüllen.
 */
import { ref, computed } from 'vue'

// ── Geteilter State (Singleton) ────────────────────────────────────────────────
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

// Kürzt lange Dateinamen für die Galerie-Anzeige
function shortenName(name) {
  return name.length > 20 ? name.substring(0, 17) + '...' : name
}

// Fügt ein bereits geladenes Image-Element als Galerie-Eintrag hinzu
function pushGalleryImage(img, name, size) {
  const imageData = {
    id: Date.now() + Math.random(),
    img,
    name: shortenName(name),
    dimensions: `${img.width}×${img.height}`,
    size,
  }

  imageGallery.value.push(imageData)

  if (imageGallery.value.length === 1) {
    selectedImageIndex.value = 0
    selectedImageIndices.value = new Set([0])
    lastSelectedImageIndex.value = 0
  }

  return imageData
}

// Schätzt die Bytegröße einer Data-URL (base64) ab
function estimateDataUrlBytes(dataUrl) {
  const comma = dataUrl.indexOf(',')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding)
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
        const imageData = pushGalleryImage(img, file.name, formatFileSize(file.size))
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

/**
 * Fügt Bilder aus Data-URLs zur Galerie hinzu – exakt so, als wären sie
 * normal hochgeladen worden. Genutzt für per Handoff übernommene Bilder.
 *
 * @param {Array<{ name?: string, dataUrl: string }>} images
 * @returns {Promise<number>} Anzahl erfolgreich hinzugefügter Bilder
 */
function addImagesFromData(images) {
  if (!Array.isArray(images) || images.length === 0) return Promise.resolve(0)

  const tasks = images.map(
    ({ name, dataUrl }) =>
      new Promise((resolve) => {
        if (!dataUrl) return resolve(false)
        const img = new Image()
        img.onload = () => {
          const imageData = pushGalleryImage(
            img,
            name || 'Bild',
            formatFileSize(estimateDataUrlBytes(dataUrl)),
          )
          console.log(
            '✅ Bild (Handoff) zur Galerie hinzugefügt:',
            imageData.name,
            imageData.dimensions,
          )
          resolve(true)
        }
        img.onerror = () => {
          console.error('❌ Handoff-Bild konnte nicht geladen werden:', name)
          resolve(false)
        }
        img.src = dataUrl
      }),
  )

  return Promise.all(tasks).then((results) => results.filter(Boolean).length)
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

export function useImageGallery() {
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
    addImagesFromData,
    selectImage,
    selectAllImages,
    deselectAllImages,
    deleteImage,
    clearAllImages,
  }
}
