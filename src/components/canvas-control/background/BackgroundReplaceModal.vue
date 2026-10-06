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
  z-index: var(--ds-z-dialog);
}
.bg-replace-modal {
  position: relative;
  background: var(--card-bg);
  border: 1px solid var(--accent-primary);
  border-radius: var(--ds-radius-lg);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--ds-shadow-overlay);
}
.bg-replace-modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  color: var(--ds-danger);
  font-size: var(--ds-text-xl);
  cursor: pointer;
  border-radius: var(--ds-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ds-duration) var(--ds-ease);
  z-index: 10;
}
.bg-replace-modal-close:hover {
  background: color-mix(in srgb, var(--ds-danger) 40%, transparent);
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
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-md);
  overflow: hidden;
  background: var(--secondary-bg);
}
.bg-replace-modal-image-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.bg-replace-modal-info h3 {
  margin: 0 0 8px 0;
  font-size: var(--ds-text-sm);
  color: var(--text-primary);
}
.bg-replace-hint {
  font-size: var(--ds-text-xs);
  color: var(--accent-ink);
  margin: 0 0 12px 0;
  padding: 6px 8px;
  background: var(--ds-accent-soft);
  border-radius: var(--ds-radius-sm);
  border-left: 2px solid var(--accent-primary);
}
.bg-replace-modal-actions {
  display: flex;
  gap: 8px;
}
.btn-replace {
  flex: 1;
  padding: 8px 12px;
  background: var(--ds-accent-soft);
  border: 1px solid var(--accent-primary);
  border-radius: var(--ds-radius-sm);
  color: var(--accent-tertiary);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}
.btn-replace:hover {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
}
.btn-replace.btn-gallery {
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  border-color: var(--ds-link);
  color: var(--ds-link);
}
.btn-replace.btn-gallery:hover {
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
}
.pending-bg-replace-preview {
  margin-top: 12px;
  padding: 10px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-md);
}
.pending-bg-replace-header {
  margin-bottom: 8px;
}
.pending-bg-replace-label {
  font-size: var(--ds-text-xs);
  color: var(--accent-tertiary);
  font-weight: var(--ds-weight-semibold);
}
.pending-bg-replace-image-container {
  width: 100%;
  height: 100px;
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
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
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-danger) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  color: var(--ds-danger);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}
.btn-cancel-replace:hover {
  background: color-mix(in srgb, var(--ds-danger) 30%, transparent);
}
.btn-confirm-replace {
  flex: 1;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--ds-success) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  color: var(--ds-success);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}
.btn-confirm-replace:hover {
  background: color-mix(in srgb, var(--ds-success) 30%, transparent);
}

.bg-gallery-section {
  margin-top: 12px;
  padding: 10px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-md);
}
.bg-gallery-categories {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.bg-category-tab {
  padding: 5px 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  display: flex;
  align-items: center;
  gap: 4px;
}
.bg-category-tab:hover {
  border-color: var(--accent-primary);
}
.bg-category-tab.active {
  background: var(--ds-accent-soft);
  border-color: var(--accent-primary);
  color: var(--accent-tertiary);
}
.bg-category-tab .category-icon {
  font-size: var(--ds-text-xs);
}
.bg-category-tab .category-name {
  font-size: var(--ds-text-xs);
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
  color: var(--text-muted);
  font-size: var(--ds-text-xs);
}
.bg-gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.bg-gallery-item {
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: var(--ds-radius-sm);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}
.bg-gallery-item:hover {
  border-color: var(--accent-primary);
}
.bg-gallery-item.selected {
  border-color: var(--ds-success);
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
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-danger) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  color: var(--ds-danger);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}
.btn-cancel-gallery:hover {
  background: color-mix(in srgb, var(--ds-danger) 30%, transparent);
}
.btn-confirm-gallery {
  flex: 1;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--ds-success) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  color: var(--ds-success);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}
.btn-confirm-gallery:hover {
  background: color-mix(in srgb, var(--ds-success) 30%, transparent);
}
.btn-confirm-gallery:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

[data-theme='light'] .btn-replace {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
}
[data-theme='light'] .btn-replace:hover {
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
}
[data-theme='light'] .bg-replace-hint {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-left-color: var(--accent-primary);
}
[data-theme='light'] .bg-category-tab.active {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
}
[data-theme='light'] .bg-replace-modal-overlay {
  background-color: rgba(0, 0, 0, 0.4);
}
[data-theme='light'] .bg-replace-modal {
  border-color: var(--accent-primary);
  box-shadow: var(--ds-shadow-overlay);
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
