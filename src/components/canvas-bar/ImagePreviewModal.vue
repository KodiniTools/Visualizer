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
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
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
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(20, 38, 64, 0.98) 100%);
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(201, 152, 77, 0.2);
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
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.preview-modal-close:hover {
  background: rgba(255, 69, 58, 0.8);
  border-color: rgba(255, 69, 58, 0.9);
  transform: rotate(90deg);
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
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.preview-modal-info {
  padding: 20px 24px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.preview-modal-info h3 {
  margin: 0 0 16px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-primary, #c9984d);
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
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.preview-info-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: #e9e9eb;
  font-family: 'SF Mono', 'Monaco', monospace;
}

.preview-modal-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
  display: flex;
  justify-content: center;
}

.replace-with-label {
  display: block;
  font-size: 0.7rem;
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
  font-size: 0.85rem;
  font-weight: 600;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-replace-canvas-image:hover {
  background: rgba(74, 222, 128, 0.2);
  border-color: rgba(74, 222, 128, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.2);
}

.btn-replace-canvas-image.btn-gallery {
  color: #c4b5fd;
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.3);
}

.btn-replace-canvas-image.btn-gallery:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.pending-replace-preview {
  margin-top: 20px;
  padding: 15px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px dashed rgba(34, 197, 94, 0.4);
  border-radius: 12px;
}

.pending-replace-header {
  margin-bottom: 12px;
}

.pending-replace-label {
  font-size: 0.75rem;
  color: #22c55e;
  font-weight: 600;
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
  border-radius: 8px;
  border: 2px solid rgba(34, 197, 94, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.pending-replace-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-cancel-replace {
  padding: 8px 16px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel-replace:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.btn-confirm-replace {
  padding: 8px 20px;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.btn-confirm-replace:hover {
  background: linear-gradient(135deg, #16a34a, #15803d);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  transform: translateY(-1px);
}

/* Light theme */
[data-theme='light'] .image-preview-modal {
  background: linear-gradient(180deg, #ffffff 0%, rgba(249, 242, 213, 0.98) 100%);
  border-color: rgba(201, 152, 77, 0.3);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(201, 152, 77, 0.15);
}
[data-theme='light'] .preview-modal-close {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.15);
  color: #003971;
}
[data-theme='light'] .preview-modal-close:hover {
  background: rgba(255, 69, 58, 0.8);
  color: #fff;
}
[data-theme='light'] .preview-modal-image-container {
  background: rgba(0, 0, 0, 0.03);
}
[data-theme='light'] .preview-info-value {
  color: #003971;
}
[data-theme='light'] .replace-with-label {
  color: #4d6d8e;
}

@media (max-width: 600px) {
  .preview-info-grid {
    grid-template-columns: 1fr;
  }
  .image-preview-modal {
    max-width: 95vw;
    max-height: 95vh;
    border-radius: 8px;
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
