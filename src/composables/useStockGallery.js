/**
 * useStockGallery Composable
 * Verwaltet die Stock-Galerie: Laden, Kategorien, Auswahl, Caching
 */
import { ref, computed, toRaw } from 'vue'

// Fallback-Kategorien falls JSON nicht lädt
const FALLBACK_CATEGORIES = [
  {
    id: 'backgrounds',
    name: 'Hintergründe',
    name_en: 'Backgrounds',
    icon: '🎨',
    description: 'Farbverläufe und Hintergrundbilder',
  },
  {
    id: 'elements',
    name: 'Elemente',
    name_en: 'Elements',
    icon: '✨',
    description: 'Grafische Formen und Objekte',
  },
  {
    id: 'patterns',
    name: 'Muster',
    name_en: 'Patterns',
    icon: '🔲',
    description: 'Wiederholende Muster und Texturen',
  },
  {
    id: 'text',
    name: 'Text',
    name_en: 'Text',
    icon: 'T',
    description: 'Fertige Textvorlagen als PNG, JPG und SVG',
  },
]

// ── Geteilter State (Singleton) ────────────────────────────────────────────────
// Liegt auf Modulebene, damit Galerie-Popover und Foto-Panel (Slideshow)
// dieselbe Stock-Auswahl sehen.
const stockCategories = ref([])
const stockImages = ref([])
const selectedStockCategory = ref('backgrounds')
const loadedCategoryData = ref(new Map())
const selectedStockImage = ref(null)
const selectedStockImages = ref(new Set())
const lastSelectedStockId = ref(null)
const stockImagesLoading = ref(true)
const categoryLoading = ref(false)
const loadedStockImages = ref(new Map())

// Alle bisher geladenen Stock-Bilder (id → Eintrag), kategorieübergreifend –
// damit ausgewählte Bilder auch nach einem Kategoriewechsel auffindbar bleiben
const stockImageIndex = new Map()
// Laufende Ladevorgänge (id → Promise<HTMLImageElement>)
const pendingStockLoads = new Map()

function setStockImages(list) {
  stockImages.value = list
  for (const img of list || []) {
    if (img?.id) stockImageIndex.set(img.id, img)
  }
}

export function useStockGallery() {
  // Computed
  const filteredStockImages = computed(() => stockImages.value)

  const selectedStockImagesList = computed(() => {
    return stockImages.value.filter((img) => selectedStockImages.value.has(img.id))
  })

  const selectedStockCount = computed(() => selectedStockImages.value.size)

  // Ausgewählte Stock-Bilder aller Kategorien (für die Slideshow)
  const selectedStockImagesAll = computed(() =>
    Array.from(selectedStockImages.value)
      .map((id) => stockImageIndex.get(id))
      .filter(Boolean),
  )

  /** Bereits geladenes Image-Objekt eines Stock-Bildes (nicht reaktiv) oder null. */
  function getLoadedStockImage(id) {
    return toRaw(loadedStockImages.value).get(id) ?? null
  }

  // Prüfen ob ein Stock-Bild ausgewählt ist
  const isStockImageSelected = (imgId) => {
    return selectedStockImages.value.has(imgId)
  }

  // Stock-Galerie Index laden (Modulare Struktur v2.0)
  async function loadStockGallery() {
    stockImagesLoading.value = true
    try {
      const paths = ['gallery/gallery.json', './gallery/gallery.json']
      let response = null
      let lastError = null

      for (const path of paths) {
        try {
          response = await fetch(path)
          if (response.ok) break
        } catch (e) {
          lastError = e
        }
      }

      if (!response || !response.ok) {
        throw new Error(lastError?.message || 'Galerie konnte nicht geladen werden')
      }

      const data = await response.json()

      if (data._version === '2.0' && data.categories) {
        stockCategories.value = data.categories || FALLBACK_CATEGORIES

        if (stockCategories.value.length > 0) {
          const firstCategory = stockCategories.value[0].id
          selectedStockCategory.value = firstCategory
          await loadCategoryImages(firstCategory)
        }

        console.log('✅ Stock-Galerie Index geladen (v2.0):', data.totalImages, 'Bilder total')
      } else {
        stockCategories.value = data.categories || FALLBACK_CATEGORIES
        setStockImages(data.images || [])

        if (stockCategories.value.length > 0) {
          selectedStockCategory.value = stockCategories.value[0].id
        }

        console.log('✅ Stock-Galerie geladen (v1.0):', stockImages.value.length, 'Bilder')
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Stock-Galerie:', error)
      stockCategories.value = FALLBACK_CATEGORIES
      setStockImages([])
    } finally {
      stockImagesLoading.value = false
    }
  }

  // Lädt die Bilder einer Kategorie (aus category.json)
  async function loadCategoryImages(categoryId) {
    if (loadedCategoryData.value.has(categoryId)) {
      setStockImages(loadedCategoryData.value.get(categoryId))
      console.log(
        `📁 Kategorie "${categoryId}" aus Cache geladen:`,
        stockImages.value.length,
        'Bilder',
      )
      return
    }

    categoryLoading.value = true
    try {
      const categoryInfo = stockCategories.value.find((c) => c.id === categoryId)
      if (!categoryInfo || !categoryInfo.jsonFile) {
        console.warn(`⚠️ Keine JSON-Datei für Kategorie "${categoryId}" gefunden`)
        setStockImages([])
        return
      }

      const response = await fetch(categoryInfo.jsonFile)
      if (!response.ok) {
        throw new Error(`Kategorie ${categoryId} konnte nicht geladen werden`)
      }

      const data = await response.json()
      const images = data.images || []

      loadedCategoryData.value.set(categoryId, images)
      setStockImages(images)

      console.log(`✅ Kategorie "${categoryId}" geladen:`, images.length, 'Bilder')
    } catch (error) {
      console.error(`❌ Fehler beim Laden der Kategorie "${categoryId}":`, error)
      setStockImages([])
    } finally {
      categoryLoading.value = false
    }
  }

  // Kategorie auswählen und laden
  async function selectStockCategory(categoryId) {
    selectedStockCategory.value = categoryId
    selectedStockImage.value = null
    selectedStockImages.value = new Set()
    lastSelectedStockId.value = null

    await loadCategoryImages(categoryId)
    console.log('📁 Kategorie ausgewählt:', categoryId)
  }

  // Stock-Bild auswählen (mit Mehrfachauswahl-Unterstützung)
  function selectStockImage(img, event = null) {
    const shiftKey = event?.shiftKey || false
    const ctrlKey = event?.ctrlKey || event?.metaKey || false

    if (shiftKey && lastSelectedStockId.value !== null) {
      const currentImages = stockImages.value
      const lastIndex = currentImages.findIndex((i) => i.id === lastSelectedStockId.value)
      const currentIndex = currentImages.findIndex((i) => i.id === img.id)

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)

        if (!ctrlKey) {
          selectedStockImages.value.clear()
        }

        for (let i = start; i <= end; i++) {
          selectedStockImages.value.add(currentImages[i].id)
        }
        selectedStockImages.value = new Set(selectedStockImages.value)
        console.log(`📌 ${end - start + 1} Stock-Bilder ausgewählt (Range)`)
      }
    } else if (ctrlKey) {
      if (selectedStockImages.value.has(img.id)) {
        selectedStockImages.value.delete(img.id)
      } else {
        selectedStockImages.value.add(img.id)
      }
      selectedStockImages.value = new Set(selectedStockImages.value)
      lastSelectedStockId.value = img.id
      console.log('📌 Stock-Bild getoggelt:', img.name)
    } else {
      selectedStockImages.value = new Set([img.id])
      lastSelectedStockId.value = img.id
      console.log('📌 Stock-Bild ausgewählt:', img.name)
    }

    selectedStockImage.value = img
  }

  // Alle Stock-Bilder in der aktuellen Kategorie auswählen
  function selectAllStockImages() {
    const allIds = stockImages.value.map((img) => img.id)
    selectedStockImages.value = new Set(allIds)
    if (stockImages.value.length > 0) {
      selectedStockImage.value = stockImages.value[0]
      lastSelectedStockId.value = stockImages.value[0].id
    }
    console.log(`📌 Alle ${allIds.length} Stock-Bilder ausgewählt`)
  }

  // Auswahl aller Stock-Bilder aufheben
  function deselectAllStockImages() {
    selectedStockImages.value = new Set()
    selectedStockImage.value = null
    lastSelectedStockId.value = null
    console.log('📌 Stock-Bildauswahl aufgehoben')
  }

  // Stock-Bild als Image-Objekt laden (mit Caching)
  async function loadStockImageObject(stockImg) {
    if (loadedStockImages.value.has(stockImg.id)) {
      return toRaw(loadedStockImages.value).get(stockImg.id)
    }
    // Laufenden Ladevorgang wiederverwenden – sonst entstünden zwei
    // Image-Objekte für dasselbe Stock-Bild
    if (pendingStockLoads.has(stockImg.id)) return pendingStockLoads.get(stockImg.id)

    const promise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        loadedStockImages.value.set(stockImg.id, img)
        pendingStockLoads.delete(stockImg.id)
        resolve(img)
      }
      img.onerror = () => {
        pendingStockLoads.delete(stockImg.id)
        reject(new Error(`Bild konnte nicht geladen werden: ${stockImg.file}`))
      }
      img.src = stockImg.file
    })
    pendingStockLoads.set(stockImg.id, promise)
    return promise
  }

  return {
    // State
    stockCategories,
    stockImages,
    selectedStockCategory,
    selectedStockImage,
    selectedStockImages,
    stockImagesLoading,
    categoryLoading,

    // Computed
    filteredStockImages,
    selectedStockImagesList,
    selectedStockImagesAll,
    selectedStockCount,
    getLoadedStockImage,

    // Methods
    isStockImageSelected,
    loadStockGallery,
    loadCategoryImages,
    selectStockCategory,
    selectStockImage,
    selectAllStockImages,
    deselectAllStockImages,
    loadStockImageObject,
  }
}
