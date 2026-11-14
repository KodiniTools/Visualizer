import { computed, type Ref } from 'vue'
import type { FotoImageObject, FotoManager, FotoSettings } from '../../lib/fotoManager'
import type { MultiImageManager } from '../../lib/multiImageManager'
import type { VideoManager } from '../../lib/videoManager'
import {
  canMoveInStack,
  moveInStack,
  stackPosition,
  type StackAction,
  type StackObject,
} from '../../lib/canvasObjects/mediaStack'

/** Abhängigkeiten von useActiveImageEditing */
export interface ActiveImageEditingDeps {
  multiImageManagerRef: Ref<MultiImageManager | null | undefined> | undefined
  /** Videos teilen sich die Ebenen-Reihenfolge mit den Bildern (optional) */
  videoManagerRef?: Ref<VideoManager | null | undefined> | undefined
  fotoManagerRef: Ref<FotoManager | null | undefined> | undefined
  currentActiveImage: Ref<FotoImageObject | null>
}

/** Änderung eines einzelnen Filterwerts (ImageFiltersPanel → filter-change) */
export interface FilterChange {
  property: string
  value: unknown
}

// Standardwerte beim Zurücksetzen der Filter. Audio-Reaktiv-Einstellungen und
// Ebenen-Optionen (renderBehindVisualizer) gehören nicht dazu.
const DEFAULT_FILTER_SETTINGS: Readonly<Partial<FotoSettings>> = Object.freeze({
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
  videoManagerRef,
  fotoManagerRef,
  currentActiveImage,
}: ActiveImageEditingDeps) {
  /**
   * Bilder und Videos im gemeinsamen Ebenen-Stapel (canvasObjects/mediaStack):
   * „Nach vorne“ bringt ein Bild auch über Videos und umgekehrt.
   */
  const stackLists = () => {
    const multiImageManager = multiImageManagerRef?.value
    if (!multiImageManager) return null
    return {
      images: multiImageManager.images as StackObject[],
      videos: (videoManagerRef?.value?.videos ?? []) as StackObject[],
    }
  }
  const activeStackObject = () => currentActiveImage.value as unknown as StackObject | null

  /** Ebenen-Position/-Anzahl des aktiven Elements (null ohne Element/Manager). */
  const layer = computed(() => {
    if (!currentActiveImage.value) return null
    const lists = stackLists()
    if (!lists) return null
    // Hintergründe sind nicht im Stapel (index -1)
    return stackPosition(lists.images, lists.videos, activeStackObject())
  })

  const canMove = (action: StackAction) => {
    const lists = stackLists()
    if (!lists || !layer.value || layer.value.index === -1) return false
    return canMoveInStack(lists.images, lists.videos, activeStackObject(), action)
  }

  const canMoveUp = computed(() => canMove('moveUp'))
  const canMoveDown = computed(() => canMove('moveDown'))

  const currentLayerInfo = computed(() => {
    const l = layer.value
    if (!l || l.index === -1 || l.count === 0) return ''
    return `${l.index + 1} / ${l.count}`
  })

  /** Verschiebt das aktive Bild bzw. Video im gemeinsamen Stapel. */
  function layerAction(action: StackAction) {
    return () => {
      const multiImageManager = multiImageManagerRef?.value
      const videoManager = videoManagerRef?.value
      if (!multiImageManager || !currentActiveImage.value) return
      const moved = moveInStack(
        multiImageManager.images,
        videoManager?.videos ?? [],
        activeStackObject(),
        action,
      )
      if (!moved) return
      multiImageManager.redrawCallback?.()
      // Verlauf und Thumbnail-Leisten beider Listen aktualisieren
      multiImageManager.onImageChanged?.()
      videoManager?.onVideoChanged?.()
    }
  }

  const onBringToFront = layerAction('bringToFront')
  const onSendToBack = layerAction('sendToBack')
  const onMoveUp = layerAction('moveUp')
  const onMoveDown = layerAction('moveDown')

  function onPresetChange(presetId: string) {
    if (!currentActiveImage.value) return
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) return

    fotoManager.applyPreset(currentActiveImage.value, presetId === '' ? 'normal' : presetId)
    console.log('🎨 Preset angewendet:', presetId || 'normal')
  }

  function onFilterChange({ property, value }: FilterChange) {
    if (!currentActiveImage.value) return

    if (!currentActiveImage.value.fotoSettings) {
      // Wird von applyFilters/initializeImageSettings ergänzt
      currentActiveImage.value.fotoSettings = {} as FotoSettings
    }

    currentActiveImage.value.fotoSettings[property] = value
    console.log(`✏️ Filter aktualisiert: ${property} = ${String(value)}`)
  }

  function resetFilters() {
    if (!currentActiveImage.value) return
    Object.assign(currentActiveImage.value.fotoSettings as FotoSettings, DEFAULT_FILTER_SETTINGS)
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
