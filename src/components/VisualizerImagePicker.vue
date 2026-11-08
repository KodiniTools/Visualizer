<template>
  <div class="image-picker">
    <UiSelect
      v-model="selected"
      :options="options"
      :label="t('visualizer.image.label')"
      label-hidden
      size="sm"
    />
    <div class="image-actions">
      <UiButton variant="primary" size="sm" @click="fileInput?.click()">
        {{ t('visualizer.image.upload') }}
      </UiButton>
      <UiButton v-if="modelValue" size="sm" @click="onSelect('')">
        {{ t('visualizer.image.remove') }}
      </UiButton>
    </div>
    <input ref="fileInput" type="file" accept="image/*" class="image-file" @change="onFile" />
    <span class="image-hint">{{ t('visualizer.image.hint') }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import { useI18n } from '../lib/i18n'
import {
  visualizerImages,
  registerImageFile,
  registerCanvasImage,
  registerGalleryImage,
} from '../lib/visualizers/imageRegistry'
import { useImageGallery } from '../composables/useImageGallery'
import { UiButton, UiSelect } from './ui'
import type { UiSelectEntry } from './ui/UiSelect.vue'
import type { MultiImageManager } from '../lib/multiImageManager'

interface ImageChoice {
  id: string
  name: string
}

const props = withDefaults(defineProps<{ modelValue?: string | null }>(), { modelValue: null })
const emit = defineEmits<{ 'update:modelValue': [id: string | null] }>()
const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const multiImageManagerRef = inject<Ref<MultiImageManager | null | undefined> | null>(
  'multiImageManager',
  null,
)
const gallery = useImageGallery()

const uploads = computed(() => visualizerImages.value.filter((img) => img.kind === 'upload'))

// Canvas images are registered on demand so the registry mirrors the canvas.
const canvasImages = computed((): ImageChoice[] => {
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
    .filter((c): c is ImageChoice => c !== null)
})

const galleryImages = computed((): ImageChoice[] =>
  (gallery.imageGallery.value || [])
    .map((img) => {
      const id = registerGalleryImage(img)
      return id ? { id, name: img.name } : null
    })
    .filter((c): c is ImageChoice => c !== null),
)

/** Optionen für UiSelect: „Automatisch“ plus je Quelle eine Gruppe (nur wenn befüllt). */
const options = computed((): UiSelectEntry[] => {
  const group = (label: string, list: ImageChoice[]): UiSelectEntry[] =>
    list.length
      ? [{ label, options: list.map(({ id, name }) => ({ value: id, label: name })) }]
      : []
  return [
    { value: '', label: t('visualizer.image.auto') },
    ...group(t('visualizer.image.uploads'), uploads.value),
    ...group(t('visualizer.image.fromCanvas'), canvasImages.value),
    ...group(t('visualizer.image.fromGallery'), galleryImages.value),
  ]
})

const selected = computed({
  get: () => props.modelValue || '',
  set: (id: string) => onSelect(id),
})

function onSelect(id: string | null) {
  emit('update:modelValue', id || null)
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return
  try {
    const id = await registerImageFile(file)
    emit('update:modelValue', id)
  } catch (err) {
    console.error('[VisualizerImagePicker] Bild konnte nicht geladen werden:', err)
  } finally {
    if (input) input.value = ''
  }
}
</script>

<style scoped>
.image-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.image-actions {
  display: flex;
  gap: 6px;
}
.image-actions > * {
  flex: 1 1 0;
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
