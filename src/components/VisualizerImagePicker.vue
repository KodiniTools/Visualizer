<template>
  <div class="image-picker">
    <select class="image-select" :value="modelValue || ''" @change="onSelect($event.target.value)">
      <option value="">{{ t('visualizer.image.auto') }}</option>
      <optgroup v-if="uploads.length" :label="t('visualizer.image.uploads')">
        <option v-for="img in uploads" :key="img.id" :value="img.id">{{ img.name }}</option>
      </optgroup>
      <optgroup v-if="canvasImages.length" :label="t('visualizer.image.fromCanvas')">
        <option v-for="img in canvasImages" :key="img.id" :value="img.id">{{ img.name }}</option>
      </optgroup>
      <optgroup v-if="galleryImages.length" :label="t('visualizer.image.fromGallery')">
        <option v-for="img in galleryImages" :key="img.id" :value="img.id">{{ img.name }}</option>
      </optgroup>
    </select>
    <div class="image-actions">
      <button type="button" class="image-btn" @click="fileInput?.click()">
        {{ t('visualizer.image.upload') }}
      </button>
      <button
        v-if="modelValue"
        type="button"
        class="image-btn image-btn-secondary"
        @click="onSelect('')"
      >
        {{ t('visualizer.image.remove') }}
      </button>
      <input ref="fileInput" type="file" accept="image/*" class="image-file" @change="onFile" />
    </div>
    <span class="image-hint">{{ t('visualizer.image.hint') }}</span>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'
import { useI18n } from '../lib/i18n.js'
import {
  visualizerImages,
  registerImageFile,
  registerCanvasImage,
  registerGalleryImage,
} from '../lib/visualizers/imageRegistry.js'
import { useImageGallery } from '../composables/useImageGallery.js'

defineProps({ modelValue: { type: String, default: null } })
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const fileInput = ref(null)
const multiImageManagerRef = inject('multiImageManager', null)
const gallery = useImageGallery()

const uploads = computed(() => visualizerImages.value.filter((img) => img.kind === 'upload'))

// Canvas images are registered on demand so the registry mirrors the canvas.
const canvasImages = computed(() => {
  const manager = multiImageManagerRef?.value
  const list = manager?.getAllImages?.() || []
  return list
    .map((img, i) => {
      const id = registerCanvasImage({
        ...img,
        name: `${t('visualizer.image.fromCanvas')} ${i + 1}`,
      })
      return id ? { id, name: `${t('visualizer.image.fromCanvas')} ${i + 1}` } : null
    })
    .filter(Boolean)
})

const galleryImages = computed(() =>
  (gallery.imageGallery.value || [])
    .map((img) => {
      const id = registerGalleryImage(img)
      return id ? { id, name: img.name } : null
    })
    .filter(Boolean),
)

function onSelect(id) {
  emit('update:modelValue', id || null)
}

async function onFile(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  try {
    const id = await registerImageFile(file)
    emit('update:modelValue', id)
  } catch (err) {
    console.error('[VisualizerImagePicker] Bild konnte nicht geladen werden:', err)
  } finally {
    if (event.target) event.target.value = ''
  }
}
</script>

<style scoped>
.image-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.image-select {
  width: 100%;
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  padding: 4px 6px;
  font-size: var(--ds-text-xs);
  cursor: pointer;
}
.image-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}
.image-actions {
  display: flex;
  gap: 6px;
}
.image-btn {
  flex: 1;
  background-color: var(--accent-primary);
  color: var(--accent-text);
  border: 1px solid var(--accent-primary);
  border-radius: var(--ds-radius-sm);
  padding: 4px 6px;
  font-size: var(--ds-text-xs);
  cursor: pointer;
}
.image-btn-secondary {
  background-color: transparent;
  color: var(--text-primary);
  border-color: var(--border-color);
}
.image-file {
  display: none;
}
.image-hint {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  line-height: 1.3;
}
</style>
