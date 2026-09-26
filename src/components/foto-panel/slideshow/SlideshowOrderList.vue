<template>
  <!-- Reihenfolge der Bilder per Drag & Drop -->
  <div class="order-section">
    <label class="section-label">{{ t('slideshow.order') }}</label>
    <p class="hint">{{ t('slideshow.perImageDuration') }}</p>
    <div class="image-order-list">
      <div
        v-for="(img, index) in orderedImages"
        :key="img.id || index"
        class="order-item"
        :class="{ dragging: dragIndex === index }"
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragover.prevent="onDragOver(index)"
        @drop="onDrop"
        @dragend="onDragEnd"
      >
        <span class="order-number">{{ index + 1 }}</span>
        <img
          :src="img.img?.src || img.imageObject?.src"
          :alt="img.name || 'Bild'"
          class="order-thumb"
        />
        <span class="order-name">{{ img.name || `Bild ${index + 1}` }}</span>
        <input
          class="order-duration"
          type="number"
          min="0.5"
          max="60"
          step="0.5"
          draggable="false"
          :value="secondsFor(img)"
          :placeholder="(defaultDuration / 1000).toFixed(1)"
          :title="t('slideshow.perImageDurationHint')"
          :aria-label="t('slideshow.perImageDurationHint')"
          @input="onDurationInput(img, $event)"
          @dragstart.prevent.stop
          @mousedown.stop
        />
        <span class="order-duration-unit">s</span>
        <span class="drag-handle">&#x2630;</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Bildreihenfolge der Slideshow (Drag & Drop). Die Liste wird per v-model
 * gehalten; nach einem Drop wird `order-changed` mit der neuen Reihenfolge emittiert.
 * Optional pro Bild eine eigene Anzeigedauer (v-model:durations, { [id]: ms }).
 * Leeres Feld = globale Anzeigedauer (defaultDuration).
 */
import { ref } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

defineProps({
  defaultDuration: { type: Number, default: 3000 },
})

const orderedImages = defineModel({ type: Array, default: () => [] })
const durations = defineModel('durations', { type: Object, default: () => ({}) })
const emit = defineEmits(['order-changed'])
const { t } = useI18n()

const dragIndex = ref(null)

function onDragStart(index, event) {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', index.toString())
}

function onDragOver(index) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const list = [...orderedImages.value]
  const item = list[dragIndex.value]
  list.splice(dragIndex.value, 1)
  list.splice(index, 0, item)
  orderedImages.value = list
  dragIndex.value = index
}

function onDrop() {
  emit('order-changed', orderedImages.value)
}

function durationKey(img) {
  return img.id ?? img.name
}

function secondsFor(img) {
  const ms = durations.value[durationKey(img)]
  return Number.isFinite(ms) ? ms / 1000 : ''
}

function onDurationInput(img, event) {
  const key = durationKey(img)
  if (key === undefined) return
  const next = { ...durations.value }
  const seconds = parseFloat(event.target.value)
  if (Number.isFinite(seconds) && seconds > 0) {
    next[key] = Math.round(Math.min(seconds, 60) * 1000)
  } else {
    delete next[key]
  }
  durations.value = next
}

function onDragEnd() {
  dragIndex.value = null
}
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.image-order-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 4px;
}
.image-order-list::-webkit-scrollbar {
  width: 6px;
}
.image-order-list::-webkit-scrollbar-track {
  background: var(--secondary-bg);
  border-radius: 3px;
}
.image-order-list::-webkit-scrollbar-thumb {
  background: var(--btn-hover);
  border-radius: 3px;
}
.order-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: var(--card-bg);
  border-radius: 6px;
  padding: 8px 10px;
  cursor: grab;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}
.order-item:hover {
  background-color: var(--secondary-bg);
  border-color: var(--border-color);
}
.order-item.dragging {
  opacity: 0.5;
  border-color: var(--image-section-accent, #6ea8fe);
}
.order-number {
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a9af8 100%);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.order-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}
.order-name {
  flex: 1;
  font-size: 12px;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.order-duration {
  width: 52px;
  flex-shrink: 0;
  padding: 3px 4px;
  font-size: 11px;
  text-align: right;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.order-duration-unit {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: -6px;
}
.drag-handle {
  color: #666;
  font-size: 14px;
  cursor: grab;
  padding: 4px;
}
.drag-handle:hover {
  color: var(--text-muted);
}
[data-theme='light'] .image-order-list::-webkit-scrollbar-track {
  background: #f9f2d5;
}
[data-theme='light'] .image-order-list::-webkit-scrollbar-thumb {
  background: #d4c8a8;
}
[data-theme='light'] .order-item {
  background-color: #f0ead0;
}
[data-theme='light'] .order-item:hover {
  background-color: #e8e0c0;
  border-color: #d4c8a8;
}
[data-theme='light'] .order-number {
  background: linear-gradient(135deg, #014f99 0%, #003971 100%);
  color: #f5f4d6;
}
[data-theme='light'] .order-name {
  color: #003971;
}
[data-theme='light'] .order-duration {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
[data-theme='light'] .drag-handle {
  color: #4d6d8e;
}
[data-theme='light'] .drag-handle:hover {
  color: #003971;
}
</style>
