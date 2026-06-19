<template>
  <div class="canvas-images-bar">
    <span class="canvas-images-label">{{ t('app.imagesOnCanvas') }}:</span>
    <div class="canvas-images-scroll">
      <div
        v-for="(imgData, index) in canvasImages"
        :key="imgData.id"
        class="canvas-thumb"
        :class="{
          selected: selectedCanvasImageId === imgData.id,
          dragging: draggedImageIndex === index,
          'drag-over': dragOverIndex === index && draggedImageIndex !== index,
        }"
        draggable="true"
        @click="selectCanvasImage(imgData)"
        @dblclick="openImagePreview(imgData, index)"
        @dragstart="handleDragStart($event, index)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleDragOver($event, index)"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop($event, index)"
        :title="`${t('common.layer')} ${index + 1} - ${t('app.dragToReorder')}`"
      >
        <img :src="imgData.imageObject.src" alt="Canvas Bild" draggable="false" />
        <span class="canvas-thumb-layer">{{ index + 1 }}</span>
        <button
          class="canvas-thumb-delete"
          @click.stop="deleteCanvasImage(imgData.id)"
          :title="t('app.deleteImage')"
        >
          ×
        </button>
      </div>
    </div>
    <button
      class="canvas-images-clear-all"
      @click="deleteAllCanvasImages"
      :title="t('app.confirmDeleteAll')"
    >
      <span class="clear-all-icon">🗑</span>
      <span class="clear-all-text">{{ t('app.deleteAllImages') }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  canvasImages: { type: Array, required: true },
  selectedCanvasImageId: { type: String, default: null },
  draggedImageIndex: { type: Number, default: null },
  dragOverIndex: { type: Number, default: null },
  t: { type: Function, required: true },
  selectCanvasImage: { type: Function, required: true },
  openImagePreview: { type: Function, required: true },
  deleteCanvasImage: { type: Function, required: true },
  deleteAllCanvasImages: { type: Function, required: true },
  handleDragStart: { type: Function, required: true },
  handleDragEnd: { type: Function, required: true },
  handleDragOver: { type: Function, required: true },
  handleDragLeave: { type: Function, required: true },
  handleDrop: { type: Function, required: true },
})
</script>

<style scoped>
.canvas-images-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(201, 152, 77, 0.08) 100%);
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid var(--accent-primary, #c9984d);
}

.canvas-images-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent-primary, #c9984d);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.canvas-images-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0;
  flex-grow: 1;
}

.canvas-images-scroll::-webkit-scrollbar {
  height: 6px;
}
.canvas-images-scroll::-webkit-scrollbar-track {
  background: var(--secondary-bg, #0e1c32);
  border-radius: 3px;
}
.canvas-images-scroll::-webkit-scrollbar-thumb {
  background: var(--text-muted, #7a8da0);
  border-radius: 3px;
}
.canvas-images-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--accent-primary, #c9984d);
}

.canvas-thumb {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--border-color, rgba(201, 152, 77, 0.3));
  transition: all 0.2s ease;
  background-color: var(--secondary-bg, #0e1c32);
  flex-shrink: 0;
}

.canvas-thumb:hover {
  border-color: var(--accent-primary, #c9984d);
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(201, 152, 77, 0.4);
}

.canvas-thumb.selected {
  border-color: var(--accent-primary, #c9984d);
  box-shadow:
    0 0 0 2px rgba(201, 152, 77, 0.5),
    0 4px 12px rgba(201, 152, 77, 0.4);
}

.canvas-thumb[draggable='true'] {
  cursor: grab;
}
.canvas-thumb[draggable='true']:active {
  cursor: grabbing;
}

.canvas-thumb.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  border-color: var(--accent-primary, #c9984d);
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.3);
}

.canvas-thumb.drag-over {
  border-color: #4ade80;
  box-shadow:
    0 0 0 2px rgba(74, 222, 128, 0.5),
    0 4px 16px rgba(74, 222, 128, 0.4);
  transform: scale(1.1);
}

.canvas-thumb.drag-over::before {
  content: '';
  position: absolute;
  inset: -3px;
  border: 2px dashed #4ade80;
  border-radius: 7px;
  pointer-events: none;
  animation: dragPulse 0.8s ease-in-out infinite;
}

@keyframes dragPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.canvas-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.canvas-thumb-layer {
  position: absolute;
  bottom: 2px;
  left: 2px;
  background: rgba(201, 152, 77, 0.95);
  color: #e9e9eb;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  min-width: 12px;
  text-align: center;
}

.canvas-thumb-delete {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 69, 58, 0.95);
  border: 2px solid var(--card-bg, #142640);
  color: white;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 10;
}

.canvas-thumb:hover .canvas-thumb-delete {
  opacity: 1;
  transform: scale(1);
}

.canvas-thumb-delete:hover {
  background: #ff453a;
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(255, 69, 58, 0.5);
}

.canvas-images-clear-all {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 69, 58, 0.15);
  border: 1px solid rgba(255, 69, 58, 0.4);
  border-radius: 5px;
  color: #ff6b6b;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  white-space: nowrap;
}

.canvas-images-clear-all:hover {
  background: rgba(255, 69, 58, 0.25);
  border-color: rgba(255, 69, 58, 0.6);
  color: #ff453a;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 69, 58, 0.3);
}

.clear-all-icon {
  font-size: 0.7rem;
}

/* Light theme */
[data-theme='light'] .canvas-images-bar {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.04) 100%);
  border-color: rgba(201, 152, 77, 0.25);
  border-left-color: #014f99;
}
[data-theme='light'] .canvas-images-label {
  color: #014f99;
}
[data-theme='light'] .canvas-thumb {
  background-color: #f9f2d5;
  border-color: rgba(201, 152, 77, 0.3);
}
[data-theme='light'] .canvas-thumb:hover {
  border-color: #014f99;
  box-shadow: 0 4px 12px rgba(1, 79, 153, 0.25);
}
[data-theme='light'] .canvas-thumb.selected {
  border-color: #014f99;
  box-shadow:
    0 0 0 2px rgba(1, 79, 153, 0.35),
    0 4px 12px rgba(1, 79, 153, 0.2);
}
[data-theme='light'] .canvas-thumb.dragging {
  border-color: #014f99;
  box-shadow: 0 0 0 2px rgba(1, 79, 153, 0.25);
}
[data-theme='light'] .canvas-thumb-layer {
  background: rgba(1, 79, 153, 0.9);
  color: #f5f4d6;
}
[data-theme='light'] .canvas-thumb-delete {
  border-color: #ffffff;
}
[data-theme='light'] .canvas-images-scroll::-webkit-scrollbar-thumb {
  background: #c9984d;
}
[data-theme='light'] .canvas-images-scroll::-webkit-scrollbar-thumb:hover {
  background: #014f99;
}

/* Responsive */
@media (max-width: 480px) {
  .canvas-images-bar {
    padding: 4px 6px;
    gap: 6px;
  }
  .canvas-images-label {
    font-size: 0.55rem;
  }
  .canvas-thumb {
    width: 36px;
    height: 36px;
  }
  .clear-all-text {
    display: none;
  }
}
</style>
