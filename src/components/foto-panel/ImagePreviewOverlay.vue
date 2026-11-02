<template>
  <UiDialog
    :open="!!previewImage"
    size="lg"
    :title="previewImage?.name || t('app.imagePreview')"
    @close="$emit('close')"
  >
    <figure v-if="previewImage" class="preview-stage">
      <img :src="previewImage.src" :alt="previewImage.name" />
    </figure>

    <template #footer>
      <UiButton @click="$emit('set-as-background')">{{ t('foto.asBackground') }}</UiButton>
      <UiButton variant="primary" @click="$emit('add-to-canvas')">
        {{ t('foto.placeOnCanvas') }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<script setup>
/** Großansicht eines Galerie-Bildes mit Platzieren / Als Hintergrund (Foto-Panel, Galerie). */
import { useI18n } from '../../lib/i18n.js'
import UiButton from '../ui/UiButton.vue'
import UiDialog from '../ui/UiDialog.vue'

const { t } = useI18n()

defineProps({
  previewImage: {
    type: Object,
    default: null,
  },
})

defineEmits(['close', 'add-to-canvas', 'set-as-background'])
</script>

<style scoped>
/* Bild auf neutraler Fläche, nie höher als das Fenster erlaubt */
.preview-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: var(--ds-space-2);
  background: var(--ds-surface-2);
  border-radius: var(--ds-radius-md);
}

.preview-stage img {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: var(--ds-radius-sm);
}
</style>
