<template>
  <div :ref="ifc.containerRef" class="foto-panel-container">
    <!-- Ebenen-Steuerung -->
    <LayerControls v-if="currentActiveImage" />

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

<script setup>
import { toRefs, provide, computed } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useImageFilterControls } from '../../composables/useImageFilterControls.js'
import LayerControls from './image-filters/LayerControls.vue'
import PresetAndHistory from './image-filters/PresetAndHistory.vue'
import BasicFilters from './image-filters/BasicFilters.vue'
import ShadowControls from './image-filters/ShadowControls.vue'
import RotationControls from './image-filters/RotationControls.vue'
import FlipControls from './image-filters/FlipControls.vue'
import BorderControls from './image-filters/BorderControls.vue'

const { locale } = useI18n()

const props = defineProps({
  currentActiveImage: {
    type: Object,
    default: null,
  },
  presets: {
    type: Array,
    default: () => [],
  },
  canMoveUp: {
    type: Boolean,
    default: false,
  },
  canMoveDown: {
    type: Boolean,
    default: false,
  },
  currentLayerInfo: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'bring-to-front',
  'move-up',
  'move-down',
  'send-to-back',
  'preset-change',
  'filter-change',
  'reset-filters',
])

const controls = useImageFilterControls(props, emit)

// The sub-sections consume everything through provide/inject: the DOM/reactive
// refs and handlers from the composable, the (reactive) props they display, the
// current locale, and thin wrappers for the layer-ordering emits.
const { currentActiveImage, presets, canMoveUp, canMoveDown, currentLayerInfo } = toRefs(props)

const ifc = {
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
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  padding-top: 10px;
}
.foto-panel-container h4 {
  margin: 0 0 6px 0;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Modern Divider */
.modern-divider {
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--image-section-accent, #6ea8fe),
    transparent
  );
  margin: 24px 0 20px 0;
  border-radius: 2px;
}

[data-theme='light'] .foto-panel-container {
  border-top-color: rgba(1, 79, 153, 0.2);
}
[data-theme='light'] .foto-panel-container h4 {
  color: #4d6d8e;
}
</style>
