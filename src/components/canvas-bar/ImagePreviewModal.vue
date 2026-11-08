<template>
  <UiDialog :open="showImagePreview" size="lg" :title="t('app.imagePreview')" @close="requestClose">
    <div class="preview-body">
      <figure class="preview-stage">
        <img
          v-if="previewImageData"
          :src="previewImageData.imageObject.src"
          :alt="t('app.imagePreview')"
        />
      </figure>

      <section class="preview-section">
        <h3 class="preview-eyebrow">{{ t('app.imageMetadata') }}</h3>
        <dl v-if="previewImageData" class="preview-info-grid">
          <div class="preview-info-item">
            <dt>{{ t('app.layer') }}</dt>
            <dd>{{ previewImageIndex + 1 }} / {{ canvasImagesCount }}</dd>
          </div>
          <div class="preview-info-item">
            <dt>{{ t('app.dimensions') }}</dt>
            <dd>
              {{ previewImageData.imageObject.naturalWidth }} ×
              {{ previewImageData.imageObject.naturalHeight }} px
            </dd>
          </div>
          <div class="preview-info-item">
            <dt>{{ t('app.position') }}</dt>
            <dd>
              X: {{ Math.round(previewImageData.relX * 100) }}%, Y:
              {{ Math.round(previewImageData.relY * 100) }}%
            </dd>
          </div>
          <div class="preview-info-item">
            <dt>{{ t('common.size') }}</dt>
            <dd>
              {{ Math.round(previewImageData.relWidth * 100) }}% ×
              {{ Math.round(previewImageData.relHeight * 100) }}%
            </dd>
          </div>
        </dl>
      </section>

      <section class="preview-section">
        <h3 class="preview-eyebrow">{{ t('app.replaceWith') }}</h3>
        <input
          ref="replaceCanvasImageInput"
          type="file"
          accept="image/*"
          hidden
          @change="handleReplaceCanvasImage"
        />
        <div class="preview-actions">
          <UiButton variant="secondary" block @click="replaceCanvasImageInput?.click()">
            {{ t('app.uploadImage') }}
          </UiButton>
          <UiButton variant="secondary" block @click="openReplaceGallery">
            {{ t('app.fromGallery') }}
          </UiButton>
        </div>
      </section>

      <section v-if="pendingReplaceImageSrc" class="preview-section preview-pending">
        <h3 class="preview-eyebrow">{{ t('app.newImagePreview') }}</h3>
        <figure class="preview-pending-stage">
          <img :src="pendingReplaceImageSrc" :alt="t('app.newImagePreview')" />
        </figure>
        <div class="preview-actions">
          <UiButton variant="secondary" block @click="cancelPendingReplace">
            {{ t('common.cancel') }}
          </UiButton>
          <UiButton variant="primary" block @click="confirmPendingReplace">
            {{ t('app.confirmReplace') }}
          </UiButton>
        </div>
      </section>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiDialog from '../ui/UiDialog.vue'
import type { CanvasImage } from '../../lib/multiImageManager'
import type { CanvasImagesApi } from '../../composables/useCanvasImages'
import type { TranslateFn } from '../../composables/types'

type Api = CanvasImagesApi

const props = withDefaults(
  defineProps<{
    showImagePreview: boolean
    previewImageData?: CanvasImage | null
    previewImageIndex?: number
    canvasImagesCount?: number
    pendingReplaceImageSrc?: string | null
    /**
     * Ersatz-Galerie liegt gerade über der Vorschau. Escape oder Klick daneben
     * schließen dann nicht die Vorschau, sonst liefe die Galerie-Auswahl ins Leere.
     */
    replaceGalleryOpen?: boolean
    t: TranslateFn
    closeImagePreview: Api['closeImagePreview']
    handleReplaceCanvasImage: Api['handleReplaceCanvasImage']
    openReplaceGallery: Api['openReplaceGallery']
    cancelPendingReplace: Api['cancelPendingReplace']
    confirmPendingReplace: Api['confirmPendingReplace']
  }>(),
  {
    previewImageData: null,
    previewImageIndex: 0,
    canvasImagesCount: 0,
    pendingReplaceImageSrc: null,
    replaceGalleryOpen: false,
  },
)

const replaceCanvasImageInput = ref<HTMLInputElement | null>(null)

function requestClose() {
  if (props.replaceGalleryOpen) return
  props.closeImagePreview()
}
</script>

<style scoped>
.preview-body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
}

.preview-stage,
.preview-pending-stage {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-2);
}

.preview-stage {
  min-height: 200px;
  max-height: 50vh;
  padding: var(--ds-space-4);
}

.preview-stage img {
  max-width: 100%;
  max-height: calc(50vh - 2 * var(--ds-space-4));
  object-fit: contain;
  border-radius: var(--ds-radius-sm);
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding-top: var(--ds-space-4);
  border-top: var(--ds-border-width) solid var(--ds-border);
}

.preview-eyebrow {
  margin: 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

.preview-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ds-space-3);
  margin: 0;
}

.preview-info-item {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
}

.preview-info-item dt {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

.preview-info-item dd {
  margin: 0;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  font-family: var(--ds-font-mono);
  color: var(--ds-text);
}

.preview-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ds-space-2);
}

.preview-pending-stage {
  padding: var(--ds-space-3);
}

.preview-pending-stage img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
  border-radius: var(--ds-radius-sm);
}

@media (max-width: 600px) {
  .preview-info-grid,
  .preview-actions {
    grid-template-columns: 1fr;
  }
}
</style>
