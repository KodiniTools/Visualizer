<template>
  <div :ref="ifc.containerRef" class="foto-panel-container">
    <!-- Ebenen-Steuerung -->
    <LayerControls v-if="currentActiveImage" />

    <!-- Position & Größe (nur normale Canvas-Bilder, nicht Hintergrund/Slideshow) -->
    <PositionSizeControls
      v-if="isPlaceableImage"
      :key="editableImage.id"
      :image="editableImage"
      :api="boundsApi"
    />

    <!-- Animationen wie bei Texten (Canvas-Bilder und Bild-Hintergründe) -->
    <ImageAnimationControls
      v-if="isAnimatableImage"
      :key="`anim-${editableImage.id}`"
      :image="editableImage"
    />

    <!-- Preset + Undo/Redo/Reset -->
    <PresetAndHistory />

    <!-- Basisfilter (Helligkeit … Farbton) -->
    <BasicFilters />

    <div class="modern-divider"></div>

    <!-- Schatten -->
    <ShadowControls />

    <div class="modern-divider"></div>

    <!-- Rotation -->
    <RotationControls />

    <!-- Spiegeln -->
    <FlipControls />

    <div class="modern-divider"></div>

    <!-- Bildkontur -->
    <BorderControls />
  </div>
</template>

<script setup lang="ts">
import { toRefs, provide, computed } from 'vue'
import { useI18n } from '../../lib/i18n'
import {
  useImageFilterControls,
  type ImageFilterEmit,
} from '../../composables/useImageFilterControls'
import type { FotoImageObject, FotoPresetInfo } from '../../lib/fotoManager'
import type { CanvasImage } from '../../lib/multiImageManager'
import type { FilterChange } from './useActiveImageEditing'
import type { ImageBoundsApi, ImageFilterContext } from './image-filters/imageFilterContext'
import LayerControls from './image-filters/LayerControls.vue'
import PresetAndHistory from './image-filters/PresetAndHistory.vue'
import BasicFilters from './image-filters/BasicFilters.vue'
import ShadowControls from './image-filters/ShadowControls.vue'
import RotationControls from './image-filters/RotationControls.vue'
import FlipControls from './image-filters/FlipControls.vue'
import BorderControls from './image-filters/BorderControls.vue'
import PositionSizeControls from './image-filters/PositionSizeControls.vue'
import ImageAnimationControls from './image-animation/ImageAnimationControls.vue'

const { locale } = useI18n()

const props = withDefaults(
  defineProps<{
    currentActiveImage?: FotoImageObject | null
    presets?: FotoPresetInfo[]
    canMoveUp?: boolean
    canMoveDown?: boolean
    currentLayerInfo?: string
    /** Für Position & Größe: { getCanvas(), redraw() } */
    boundsApi?: ImageBoundsApi | null
  }>(),
  {
    currentActiveImage: null,
    presets: () => [],
    canMoveUp: false,
    canMoveDown: false,
    currentLayerInfo: '',
    boundsApi: null,
  },
)

const emit = defineEmits<{
  'bring-to-front': []
  'move-up': []
  'move-down': []
  'send-to-back': []
  'preset-change': [presetId: string]
  'filter-change': [change: FilterChange]
  'reset-filters': []
}>()

const controls = useImageFilterControls(props, emit as ImageFilterEmit)

/** Aktives Bild mit den Feldern, die Position/Größe und Animationen bearbeiten */
type EditableImage = FotoImageObject &
  Partial<
    Pick<
      CanvasImage,
      'id' | 'relX' | 'relY' | 'relWidth' | 'relHeight' | 'imageObject' | 'timedAnimation'
    >
  >

// Nur in den v-if-Zweigen (isPlaceableImage/isAnimatableImage) genutzt – dort ist ein Bild aktiv
const editableImage = computed(() => props.currentActiveImage as EditableImage)

// Frei platzierbares Canvas-Bild (Hintergründe und Slideshow-Bilder haben eigene Regler)
const isPlaceableImage = computed(() => {
  const img = props.currentActiveImage
  return !!img && img.type === 'image' && !img.isSlideshowImage
})

// Bilder mit Animationen wie bei Texten: Canvas-Bilder und Bild-Hintergründe
// (Canvas/Workspace), nicht Slideshow-Bilder
const ANIMATABLE_TYPES: readonly unknown[] = ['image', 'background', 'workspace-background']
const isAnimatableImage = computed(() => {
  const img = props.currentActiveImage
  return !!img && ANIMATABLE_TYPES.includes(img.type) && !img.isSlideshowImage
})

// The sub-sections consume everything through provide/inject: the DOM/reactive
// refs and handlers from the composable, the (reactive) props they display, the
// current locale, and thin wrappers for the layer-ordering emits.
const { currentActiveImage, presets, canMoveUp, canMoveDown, currentLayerInfo } = toRefs(props)

const ifc: ImageFilterContext = {
  ...controls,
  currentActiveImage,
  presets,
  canMoveUp,
  canMoveDown,
  currentLayerInfo,
  locale: computed(() => locale.value),
  bringToFront: () => emit('bring-to-front'),
  moveUp: () => emit('move-up'),
  moveDown: () => emit('move-down'),
  sendToBack: () => emit('send-to-back'),
}
provide('imageFilterControls', ifc)

// Only loadImageSettings is consumed by the parent (FotoPanel).
defineExpose({ loadImageSettings: controls.loadImageSettings })
</script>

<style scoped>
.foto-panel-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
}
.foto-panel-container h4 {
  margin: 0 0 6px 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Modern Divider */
.modern-divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--image-section-accent), transparent);
  margin: 24px 0 20px 0;
  border-radius: var(--ds-radius-sm);
}

[data-theme='light'] .foto-panel-container {
  border-top-color: var(--border-color);
}
</style>
