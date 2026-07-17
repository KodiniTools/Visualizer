<template>
  <Teleport to="body">
    <div
      v-if="showBackgroundReplaceModal"
      class="bg-replace-modal-overlay"
      @click="closeBackgroundReplaceModal"
    >
      <div class="bg-replace-modal" @click.stop>
        <button class="bg-replace-modal-close" @click="closeBackgroundReplaceModal">×</button>
        <div class="bg-replace-modal-content">
          <div class="bg-replace-modal-image-container">
            <img
              v-if="currentBackgroundForReplace"
              :src="currentBackgroundForReplace"
              alt="Current Background"
            />
          </div>
          <div class="bg-replace-modal-info">
            <h3>
              {{
                replaceType === 'workspace'
                  ? t('canvasControl.replaceWorkspaceBackground') ||
                    'Workspace-Hintergrund ersetzen'
                  : t('canvasControl.replaceBackground') || 'Hintergrund ersetzen'
              }}
            </h3>
            <p class="bg-replace-hint">
              {{
                t('canvasControl.audioReactiveKept') ||
                'Audio-Reactive Einstellungen werden übernommen'
              }}
            </p>

            <div class="bg-replace-modal-actions">
              <input
                type="file"
                accept="image/*"
                @change="handleBackgroundReplaceFile"
                ref="bgReplaceFileInput"
                style="display: none"
              />
              <button class="btn-replace" @click="bgReplaceFileInput?.click()">
                {{ t('app.uploadImage') || 'Bild hochladen' }}
              </button>
              <button class="btn-replace btn-gallery" @click="openBgReplaceGallery">
                {{ t('app.fromGallery') || 'Aus Galerie' }}
              </button>
            </div>

            <!-- Galerie-Auswahl -->
            <div v-if="showBgReplaceGallery" class="bg-gallery-section">
              <div class="bg-gallery-categories">
                <button
                  v-for="category in bgGalleryCategories"
                  :key="category.id"
                  class="bg-category-tab"
                  :class="{ active: selectedBgCategory === category.id }"
                  @click="selectBgGalleryCategory(category.id)"
                >
                  <span class="category-icon">{{ category.icon }}</span>
                  <span class="category-name">{{ category.name }}</span>
                </button>
              </div>

              <div class="bg-gallery-content">
                <div v-if="bgGalleryLoading" class="bg-gallery-loading">
                  {{ t('common.loading') || 'Laden...' }}
                </div>
                <div v-else-if="bgGalleryImages.length === 0" class="bg-gallery-empty">
                  {{ t('common.noResults') || 'Keine Ergebnisse' }}
                </div>
                <div v-else class="bg-gallery-grid">
                  <div
                    v-for="image in bgGalleryImages"
                    :key="image.file"
                    class="bg-gallery-item"
                    :class="{ selected: selectedBgGalleryImage === image }"
                    @click="selectBgGalleryImage(image)"
                  >
                    <img
                      :src="image.thumb || image.file"
                      :alt="image.name || 'Gallery image'"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <div class="bg-gallery-footer">
                <button class="btn-cancel-gallery" @click="closeBgReplaceGallery">
                  {{ t('common.cancel') || 'Abbrechen' }}
                </button>
                <button
                  class="btn-confirm-gallery"
                  :disabled="!selectedBgGalleryImage"
                  @click="confirmBgReplaceFromGallery"
                >
                  {{ t('app.selectImage') || 'Bild auswählen' }}
                </button>
              </div>
            </div>

            <!-- Vorschau für neues Bild -->
            <div v-if="pendingBackgroundReplaceSrc" class="pending-bg-replace-preview">
              <div class="pending-bg-replace-header">
                <span class="pending-bg-replace-label">{{
                  t('app.newImagePreview') || 'Vorschau:'
                }}</span>
              </div>
              <div class="pending-bg-replace-image-container">
                <img
                  :src="pendingBackgroundReplaceSrc"
                  alt="Preview"
                  class="pending-bg-replace-image"
                />
              </div>
              <div class="pending-bg-replace-actions">
                <button class="btn-cancel-replace" @click="cancelBackgroundReplace">
                  {{ t('common.cancel') || 'Abbrechen' }}
                </button>
                <button class="btn-confirm-replace" @click="confirmBackgroundReplace">
                  {{ t('app.confirmReplace') || 'Ersetzen bestätigen' }}
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
import { ref, inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const bg = inject('bgSettings')
const bgReplaceFileInput = ref(null)

const {
  showBackgroundReplaceModal,
  replaceType,
  pendingBackgroundReplaceSrc,
  showBgReplaceGallery,
  bgGalleryCategories,
  bgGalleryImages,
  selectedBgCategory,
  selectedBgGalleryImage,
  bgGalleryLoading,
  currentBackgroundForReplace,
  closeBackgroundReplaceModal,
  handleBackgroundReplaceFile,
  confirmBackgroundReplace,
  cancelBackgroundReplace,
  openBgReplaceGallery,
  closeBgReplaceGallery,
  selectBgGalleryCategory,
  selectBgGalleryImage,
  confirmBgReplaceFromGallery,
} = bg
</script>

<style scoped>
.bg-replace-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(4px);
}
.bg-replace-modal {
  position: relative;
  background: var(--card-bg, #142640);
  border: 1px solid var(--accent-primary, #c9984d);
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.bg-replace-modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}
.bg-replace-modal-close:hover {
  background: rgba(244, 67, 54, 0.4);
  transform: scale(1.1);
}
.bg-replace-modal-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;
}
.bg-replace-modal-image-container {
  width: 100%;
  height: 150px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 8px;
  overflow: hidden;
  background: var(--secondary-bg, #0e1c32);
}
.bg-replace-modal-image-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.bg-replace-modal-info h3 {
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  color: var(--text-primary, #e9e9eb);
}
.bg-replace-hint {
  font-size: 0.55rem;
  color: var(--accent-primary, #c9984d);
  margin: 0 0 12px 0;
  padding: 6px 8px;
  background: rgba(201, 152, 77, 0.1);
  border-radius: 4px;
  border-left: 2px solid var(--accent-primary, #c9984d);
}
.bg-replace-modal-actions {
  display: flex;
  gap: 8px;
}
.btn-replace {
  flex: 1;
  padding: 8px 12px;
  background: rgba(201, 152, 77, 0.2);
  border: 1px solid var(--accent-primary, #c9984d);
  border-radius: 6px;
  color: var(--accent-tertiary, #f8e1a9);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-replace:hover {
  background: rgba(201, 152, 77, 0.3);
  transform: translateY(-1px);
}
.btn-replace.btn-gallery {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  color: #a78bfa;
}
.btn-replace.btn-gallery:hover {
  background: rgba(139, 92, 246, 0.3);
}
.pending-bg-replace-preview {
  margin-top: 12px;
  padding: 10px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 8px;
}
.pending-bg-replace-header {
  margin-bottom: 8px;
}
.pending-bg-replace-label {
  font-size: 0.6rem;
  color: var(--accent-tertiary, #f8e1a9);
  font-weight: 600;
}
.pending-bg-replace-image-container {
  width: 100%;
  height: 100px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}
.pending-bg-replace-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.pending-bg-replace-actions {
  display: flex;
  gap: 8px;
}
.btn-cancel-replace {
  flex: 1;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  color: #f44336;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel-replace:hover {
  background: rgba(244, 67, 54, 0.3);
}
.btn-confirm-replace {
  flex: 1;
  padding: 8px 12px;
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 6px;
  color: #4caf50;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-confirm-replace:hover {
  background: rgba(76, 175, 80, 0.3);
}

.bg-gallery-section {
  margin-top: 12px;
  padding: 10px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 8px;
}
.bg-gallery-categories {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.bg-category-tab {
  padding: 5px 8px;
  background: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.55rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.bg-category-tab:hover {
  border-color: var(--accent-primary, #c9984d);
}
.bg-category-tab.active {
  background: rgba(201, 152, 77, 0.2);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
}
.bg-category-tab .category-icon {
  font-size: 0.7rem;
}
.bg-category-tab .category-name {
  font-size: 0.5rem;
}
.bg-gallery-content {
  min-height: 100px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 10px;
}
.bg-gallery-loading,
.bg-gallery-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--text-muted, #7a8da0);
  font-size: 0.6rem;
}
.bg-gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.bg-gallery-item {
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}
.bg-gallery-item:hover {
  border-color: var(--accent-primary, #c9984d);
  transform: scale(1.05);
}
.bg-gallery-item.selected {
  border-color: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
}
.bg-gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.bg-gallery-footer {
  display: flex;
  gap: 8px;
}
.btn-cancel-gallery {
  flex: 1;
  padding: 6px 10px;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 5px;
  color: #f44336;
  font-size: 0.55rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel-gallery:hover {
  background: rgba(244, 67, 54, 0.3);
}
.btn-confirm-gallery {
  flex: 1;
  padding: 6px 10px;
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 5px;
  color: #4caf50;
  font-size: 0.55rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-confirm-gallery:hover {
  background: rgba(76, 175, 80, 0.3);
}
.btn-confirm-gallery:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

[data-theme='light'] .btn-replace {
  background: rgba(1, 79, 153, 0.1);
}
[data-theme='light'] .btn-replace:hover {
  background: rgba(1, 79, 153, 0.18);
}
[data-theme='light'] .bg-replace-hint {
  background: rgba(1, 79, 153, 0.08);
  color: #014f99;
  border-left-color: #014f99;
}
[data-theme='light'] .bg-category-tab.active {
  background: rgba(1, 79, 153, 0.12);
}
[data-theme='light'] .bg-replace-modal-overlay {
  background-color: rgba(0, 0, 0, 0.4);
}
[data-theme='light'] .bg-replace-modal {
  background: #ffffff;
  border-color: #014f99;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
}

@media (max-width: 768px) {
  .bg-replace-modal {
    max-width: 95vw;
    width: 95%;
  }
  .bg-replace-modal-content {
    padding: 10px;
    gap: 10px;
  }
}
</style>
