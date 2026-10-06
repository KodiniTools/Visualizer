<template>
  <Teleport to="body">
    <div v-if="showImagePreview" class="image-preview-modal-overlay" @click="closeImagePreview">
      <div class="image-preview-modal" @click.stop>
        <button class="preview-modal-close" @click="closeImagePreview">×</button>
        <div class="preview-modal-content">
          <div class="preview-modal-image-container">
            <img v-if="previewImageData" :src="previewImageData.imageObject.src" alt="Preview" />
          </div>
          <div class="preview-modal-info">
            <h3>{{ t('app.imageMetadata') }}</h3>
            <div class="preview-info-grid" v-if="previewImageData">
              <div class="preview-info-item">
                <span class="preview-info-label">{{ t('app.layer') }}:</span>
                <span class="preview-info-value"
                  >{{ previewImageIndex + 1 }} / {{ canvasImagesCount }}</span
                >
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">{{ t('app.dimensions') }}:</span>
                <span class="preview-info-value">
                  {{ previewImageData.imageObject.naturalWidth }} ×
                  {{ previewImageData.imageObject.naturalHeight }} px
                </span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">{{ t('app.position') }}:</span>
                <span class="preview-info-value">
                  X: {{ Math.round(previewImageData.relX * 100) }}%, Y:
                  {{ Math.round(previewImageData.relY * 100) }}%
                </span>
              </div>
              <div class="preview-info-item">
                <span class="preview-info-label">{{ t('common.size') || 'Größe' }}:</span>
                <span class="preview-info-value">
                  {{ Math.round(previewImageData.relWidth * 100) }}% ×
                  {{ Math.round(previewImageData.relHeight * 100) }}%
                </span>
              </div>
            </div>

            <div class="preview-modal-actions">
              <span class="replace-with-label">{{ t('app.replaceWith') }}:</span>
              <div class="replace-buttons-row">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleReplaceCanvasImage"
                  ref="replaceCanvasImageInput"
                  style="display: none"
                />
                <button class="btn-replace-canvas-image" @click="replaceCanvasImageInput?.click()">
                  📁 {{ t('app.uploadImage') }}
                </button>
                <button class="btn-replace-canvas-image btn-gallery" @click="openReplaceGallery">
                  🖼️ {{ t('app.fromGallery') }}
                </button>
              </div>
            </div>

            <div v-if="pendingReplaceImageSrc" class="pending-replace-preview">
              <div class="pending-replace-header">
                <span class="pending-replace-label">{{ t('app.newImagePreview') }}:</span>
              </div>
              <div class="pending-replace-image-container">
                <img :src="pendingReplaceImageSrc" alt="Preview" class="pending-replace-image" />
              </div>
              <div class="pending-replace-actions">
                <button class="btn-cancel-replace" @click="cancelPendingReplace">
                  ✕ {{ t('common.cancel') }}
                </button>
                <button class="btn-confirm-replace" @click="confirmPendingReplace">
                  ✓ {{ t('app.confirmReplace') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  showImagePreview: { type: Boolean, required: true },
  previewImageData: { type: Object, default: null },
  previewImageIndex: { type: Number, default: 0 },
  canvasImagesCount: { type: Number, default: 0 },
  pendingReplaceImageSrc: { type: String, default: null },
  t: { type: Function, required: true },
  closeImagePreview: { type: Function, required: true },
  handleReplaceCanvasImage: { type: Function, required: true },
  openReplaceGallery: { type: Function, required: true },
  cancelPendingReplace: { type: Function, required: true },
  confirmPendingReplace: { type: Function, required: true },
})

const replaceCanvasImageInput = ref(null)
</script>

<style scoped>
.image-preview-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--ds-z-toast);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.image-preview-modal {
  background: var(--card-bg);
  border-radius: var(--ds-radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--ds-shadow-overlay);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
  animation: modalSlideIn 0.25s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.preview-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: var(--ds-radius-full);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--ds-border);
  color: var(--ds-text);
  font-size: var(--ds-text-xl);
  line-height: 1;
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.preview-modal-close:hover {
  background: color-mix(in srgb, var(--ds-danger) 80%, transparent);
  border-color: color-mix(in srgb, var(--ds-danger) 90%, transparent);
}

.preview-modal-content {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.preview-modal-image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 300px;
  max-height: 60vh;
  background: rgba(0, 0, 0, 0.3);
}

.preview-modal-image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--ds-radius-sm);
  box-shadow: var(--ds-shadow-overlay);
}

.preview-modal-info {
  padding: 20px 24px;
  border-top: 1px solid var(--border-color);
}

.preview-modal-info h3 {
  margin: 0 0 16px 0;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--accent-ink);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.preview-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-info-label {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.preview-info-value {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
  font-family: var(--ds-font-mono);
}

.preview-modal-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: center;
}

.replace-with-label {
  display: block;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.replace-buttons-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-replace-canvas-image {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-success);
  background: color-mix(in srgb, var(--ds-success) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-radius: var(--ds-radius-md);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-replace-canvas-image:hover {
  background: color-mix(in srgb, var(--ds-success) 20%, transparent);
  border-color: color-mix(in srgb, var(--ds-success) 50%, transparent);
}

.btn-replace-canvas-image.btn-gallery {
  color: var(--ds-link);
  background: color-mix(in srgb, var(--ds-link) 12%, transparent);
  border-color: color-mix(in srgb, var(--ds-link) 30%, transparent);
}

.btn-replace-canvas-image.btn-gallery:hover {
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  border-color: color-mix(in srgb, var(--ds-link) 50%, transparent);
}

.pending-replace-preview {
  margin-top: 20px;
  padding: 15px;
  background: color-mix(in srgb, var(--ds-success) 8%, transparent);
  border: 1px dashed color-mix(in srgb, var(--ds-success) 40%, transparent);
  border-radius: var(--ds-radius-lg);
}

.pending-replace-header {
  margin-bottom: 12px;
}

.pending-replace-label {
  font-size: var(--ds-text-xs);
  color: var(--ds-success);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pending-replace-image-container {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}

.pending-replace-image {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
  border-radius: var(--ds-radius-md);
  border: 2px solid color-mix(in srgb, var(--ds-success) 30%, transparent);
  box-shadow: var(--ds-shadow-overlay);
}

.pending-replace-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-cancel-replace {
  padding: 8px 16px;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  border: 1px solid color-mix(in srgb, var(--ds-danger) 30%, transparent);
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--ds-danger) 10%, transparent);
  color: var(--ds-danger);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-cancel-replace:hover {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  border-color: color-mix(in srgb, var(--ds-danger) 50%, transparent);
}

.btn-confirm-replace {
  padding: 8px 20px;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  border: none;
  border-radius: var(--ds-radius-md);
  background: var(--ds-success);
  color: white;
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-confirm-replace:hover {
  background: var(--ds-success);
}

/* Light theme */
[data-theme='light'] .image-preview-modal {
  border-color: var(--border-color);
  box-shadow: var(--ds-shadow-overlay);
}
[data-theme='light'] .preview-modal-close {
  background: rgba(0, 0, 0, 0.06);
  border-color: var(--ds-border);
  color: var(--text-primary);
}
[data-theme='light'] .preview-modal-close:hover {
  color: #fff;
}
[data-theme='light'] .preview-modal-image-container {
  background: rgba(0, 0, 0, 0.03);
}
[data-theme='light'] .preview-info-value {
  color: var(--text-primary);
}

@media (max-width: 600px) {
  .preview-info-grid {
    grid-template-columns: 1fr;
  }
  .image-preview-modal {
    max-width: 95vw;
    max-height: 95vh;
    border-radius: var(--ds-radius-md);
  }
  .preview-modal-image-container {
    padding: 10px;
    min-height: 200px;
  }
  .preview-modal-info {
    padding: 12px;
  }
}
</style>
