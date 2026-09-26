import { computed } from 'vue'

// Standardwerte beim Zurücksetzen der Filter. Audio-Reaktiv-Einstellungen und
// Ebenen-Optionen (renderBehindVisualizer) gehören nicht dazu.
const DEFAULT_FILTER_SETTINGS = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
  blur: 0,
  hueRotate: 0,
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  borderColor: '#ffffff',
  borderWidth: 0,
  borderOpacity: 100,
})

/**
 * Ebenen-Reihenfolge und Filter des aktiven Canvas-Bildes.
 * @param {object} deps
 * @param {import('vue').Ref} deps.multiImageManagerRef
 * @param {import('vue').Ref} deps.fotoManagerRef
 * @param {import('vue').Ref<object|null>} deps.currentActiveImage
 */
export function useActiveImageEditing({
  multiImageManagerRef,
  fotoManagerRef,
  currentActiveImage,
}) {
  /** Ebenen-Index/-Anzahl des aktiven Bildes (null ohne Bild/Manager). */
  const layer = computed(() => {
    if (!currentActiveImage.value) return null
    const multiImageManager = multiImageManagerRef?.value
    if (!multiImageManager) return null
    return {
      index: multiImageManager.getImageIndex(currentActiveImage.value),
      count: multiImageManager.getImageCount(),
    }
  })

  const canMoveUp = computed(() => {
    const l = layer.value
    return !!l && l.index !== -1 && l.index < l.count - 1
  })

  const canMoveDown = computed(() => {
    const l = layer.value
    return !!l && l.index > 0
  })

  const currentLayerInfo = computed(() => {
    const l = layer.value
    if (!l || l.index === -1 || l.count === 0) return ''
    return `${l.index + 1} / ${l.count}`
  })

  /** Ruft eine Ebenen-Methode des MultiImageManagers für das aktive Bild auf. */
  function layerAction(method) {
    return () => {
      const multiImageManager = multiImageManagerRef?.value
      if (!multiImageManager || !currentActiveImage.value) return
      multiImageManager[method](currentActiveImage.value)
    }
  }

  const onBringToFront = layerAction('bringToFront')
  const onSendToBack = layerAction('sendToBack')
  const onMoveUp = layerAction('moveUp')
  const onMoveDown = layerAction('moveDown')

  function onPresetChange(presetId) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return

    fotoManager.applyPreset(currentActiveImage.value, presetId === '' ? 'normal' : presetId)
    console.log('🎨 Preset angewendet:', presetId || 'normal')
  }

  function onFilterChange({ property, value }) {
    if (!currentActiveImage.value) return

    if (!currentActiveImage.value.fotoSettings) {
      currentActiveImage.value.fotoSettings = {}
    }

    currentActiveImage.value.fotoSettings[property] = value
    console.log(`✏️ Filter aktualisiert: ${property} = ${value}`)
  }

  function resetFilters() {
    if (!currentActiveImage.value) return
    Object.assign(currentActiveImage.value.fotoSettings, DEFAULT_FILTER_SETTINGS)
    console.log('🔄 Filter zurückgesetzt')
  }

  return {
    canMoveUp,
    canMoveDown,
    currentLayerInfo,
    onBringToFront,
    onSendToBack,
    onMoveUp,
    onMoveDown,
    onPresetChange,
    onFilterChange,
    resetFilters,
  }
}
