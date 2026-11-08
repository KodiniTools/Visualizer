<template>
  <div class="canvas-images-bar">
    <span :id="labelId" class="canvas-images-label">{{ t('app.imagesOnCanvas') }}</span>
    <div
      ref="scrollRef"
      class="canvas-images-scroll"
      role="group"
      :aria-labelledby="labelId"
      @scroll.passive="onScroll"
    >
      <div class="canvas-images-inner" :style="{ width: totalWidth + 'px' }">
        <div class="canvas-images-window" :style="{ transform: `translateX(${offsetLeft}px)` }">
          <div
            v-for="{ imgData, globalIndex } in visibleItems"
            :key="imgData.id"
            class="canvas-thumb"
            :class="{
              selected: selectedCanvasImageId === imgData.id,
              dragging: draggedImageIndex === globalIndex,
              'drag-over': dragOverIndex === globalIndex && draggedImageIndex !== globalIndex,
            }"
            draggable="true"
            :title="`${t('common.layer')} ${globalIndex + 1} – ${t('app.dragToReorder')}`"
            @dragstart="handleDragStart($event, globalIndex)"
            @dragend="handleDragEnd"
            @dragover.prevent="handleDragOver($event, globalIndex)"
            @dragleave="handleDragLeave"
            @drop.prevent="handleDrop($event, globalIndex)"
          >
            <button
              type="button"
              class="canvas-thumb-select"
              :aria-label="`${t('common.layer')} ${globalIndex + 1}`"
              :aria-pressed="selectedCanvasImageId === imgData.id"
              :aria-description="t('app.dblClickPreview')"
              @click="selectCanvasImage(imgData)"
              @dblclick="openImagePreview(imgData, globalIndex)"
            >
              <img :src="imgData.imageObject.src" alt="" draggable="false" />
              <span class="canvas-thumb-layer" aria-hidden="true">{{ globalIndex + 1 }}</span>
            </button>
            <UiIconButton
              :label="t('app.deleteImage')"
              size="sm"
              round
              class="canvas-thumb-delete"
              @click.stop="deleteCanvasImage(imgData.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </UiIconButton>
          </div>
        </div>
      </div>
    </div>
    <UiButton
      variant="danger"
      size="sm"
      class="canvas-images-clear-all"
      :title="t('app.confirmDeleteAll')"
      @click="deleteAllCanvasImages"
    >
      {{ t('app.deleteAllImages') }}
    </UiButton>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useId } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import type { CanvasImage } from '../../lib/multiImageManager'
import type { CanvasImagesApi } from '../../composables/useCanvasImages'
import type { TranslateFn } from '../../composables/types'

type Api = CanvasImagesApi

const props = withDefaults(
  defineProps<{
    canvasImages: CanvasImage[]
    selectedCanvasImageId?: CanvasImage['id'] | null
    draggedImageIndex?: number | null
    dragOverIndex?: number | null
    t: TranslateFn
    selectCanvasImage: Api['selectCanvasImage']
    openImagePreview: Api['openImagePreview']
    deleteCanvasImage: Api['deleteCanvasImage']
    deleteAllCanvasImages: Api['deleteAllCanvasImages']
    handleDragStart: Api['handleDragStart']
    handleDragEnd: Api['handleDragEnd']
    handleDragOver: Api['handleDragOver']
    handleDragLeave: Api['handleDragLeave']
    handleDrop: Api['handleDrop']
  }>(),
  { selectedCanvasImageId: null, draggedImageIndex: null, dragOverIndex: null },
)

// Virtual scrolling: 44px thumb + 8px gap = 52px per slot
const ITEM_SLOT = 52
const BUFFER = 4

const labelId = `canvas-images-label-${useId()}`
const scrollRef = ref<HTMLElement | null>(null)
const scrollLeft = ref(0)
const containerWidth = ref(600) // avoid empty render on first paint

// Full virtual width: N items with N-1 gaps between them
const totalWidth = computed(() => {
  const n = props.canvasImages.length
  return n > 0 ? n * ITEM_SLOT - 8 : 0
})

const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollLeft.value / ITEM_SLOT) - BUFFER)
  const end = Math.min(
    props.canvasImages.length - 1,
    Math.ceil((scrollLeft.value + containerWidth.value) / ITEM_SLOT) + BUFFER,
  )
  return { start, end }
})

const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.canvasImages.slice(start, end + 1).map((imgData, i) => ({
    imgData,
    globalIndex: start + i,
  }))
})

// translateX so visible items land at their correct virtual positions
const offsetLeft = computed(() => visibleRange.value.start * ITEM_SLOT)

function onScroll(e: Event) {
  scrollLeft.value = (e.target as HTMLElement).scrollLeft
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!scrollRef.value) return
  containerWidth.value = scrollRef.value.clientWidth
  resizeObserver = new ResizeObserver(([entry]) => {
    containerWidth.value = (entry as ResizeObserverEntry).contentRect.width
  })
  resizeObserver.observe(scrollRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.canvas-images-bar {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  margin-bottom: var(--ds-space-2);
  padding: var(--ds-space-1) var(--ds-space-3);
  background: var(--ds-surface-1);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}

.canvas-images-label {
  flex-shrink: 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ds-text-2);
}

.canvas-images-scroll {
  flex-grow: 1;
  overflow-x: auto;
  overflow-y: hidden;
  /* Platz für die vergrößerte Auswahl und den Löschen-Knopf an der Ecke */
  padding: var(--ds-space-2) var(--ds-space-1);
}

/* Inner div carries the full virtual width to enable scrolling */
.canvas-images-inner {
  position: relative;
  height: 44px;
}

/* Only visible items, translated to their correct scroll position */
.canvas-images-window {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  gap: 8px; /* ITEM_SLOT im Skript: 44px + 8px */
  height: 44px;
  will-change: transform;
}

.canvas-thumb {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  cursor: grab;
  transition: transform var(--ds-duration) var(--ds-ease);
}

.canvas-thumb:active {
  cursor: grabbing;
}

.canvas-thumb-select {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
  background: var(--ds-surface-2);
  border: 2px solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  cursor: inherit;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

.canvas-thumb-select:hover,
.canvas-thumb.selected .canvas-thumb-select {
  border-color: var(--ds-accent);
}

.canvas-thumb-select:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.canvas-thumb.selected {
  z-index: 1;
  transform: scale(1.1);
}

.canvas-thumb.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.canvas-thumb.drag-over {
  transform: scale(1.1);
}

.canvas-thumb.drag-over .canvas-thumb-select {
  border-color: var(--ds-success);
  border-style: dashed;
}

.canvas-thumb-select img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.canvas-thumb-layer {
  position: absolute;
  bottom: 2px;
  left: 2px;
  min-width: 12px;
  padding: 0 var(--ds-space-1);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  line-height: 1.4;
  text-align: center;
  color: var(--ds-on-accent);
  background: var(--ds-accent);
  border-radius: var(--ds-radius-sm);
}

/* Löschen: klein an der Ecke, bei Hover oder Tastaturfokus sichtbar */
.canvas-thumb-delete {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 2;
  width: 18px;
  height: 18px;
  color: #fff;
  background: var(--ds-danger);
  opacity: 0;
  transition: opacity var(--ds-duration) var(--ds-ease);
}

.canvas-thumb:hover .canvas-thumb-delete,
.canvas-thumb:has(:focus-visible) .canvas-thumb-delete {
  opacity: 1;
}

.canvas-thumb-delete:hover,
.canvas-thumb-delete:focus-visible {
  color: #fff;
  background: var(--ds-danger);
}

.canvas-thumb-delete svg {
  width: 10px;
  height: 10px;
}

.canvas-images-clear-all {
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .canvas-images-bar {
    gap: var(--ds-space-2);
    padding: var(--ds-space-1) var(--ds-space-2);
  }
}
</style>
