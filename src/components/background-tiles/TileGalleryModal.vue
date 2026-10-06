<template>
  <Teleport to="body">
    <div v-if="showGalleryModal" class="tile-gallery-modal-overlay" @click="closeGalleryModal">
      <div class="tile-gallery-modal" @click.stop>
        <div class="gallery-modal-header">
          <h3>{{ t('backgroundTiles.galleryTitle') }}</h3>
          <button class="gallery-modal-close" @click="closeGalleryModal">×</button>
        </div>

        <div class="gallery-modal-content">
          <!-- Kategorie-Tabs -->
          <div class="gallery-categories">
            <button
              v-for="category in galleryCategories"
              :key="category.id"
              class="category-tab"
              :class="{ active: selectedGalleryCategory === category.id }"
              @click="selectGalleryCategory(category.id)"
            >
              <span class="category-icon">{{ category.icon }}</span>
              <span class="category-name">{{
                locale === 'de' ? category.name : category.name_en
              }}</span>
            </button>
          </div>

          <!-- Bilder-Grid -->
          <div class="gallery-images-container">
            <div v-if="galleryLoading" class="gallery-loading">
              <span class="loading-spinner"></span>
            </div>
            <div v-else class="gallery-images-grid">
              <div
                v-for="image in galleryImages"
                :key="image.id"
                class="gallery-image-item"
                :class="{ selected: selectedGalleryImage?.id === image.id }"
                @click="selectGalleryImage(image)"
                @dblclick="confirmGallerySelection"
              >
                <img :src="image.thumbnail || image.file" :alt="image.name" loading="lazy" />
                <span class="gallery-image-name">{{
                  locale === 'de' ? image.name : image.name_en || image.name
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="gallery-modal-footer">
          <button class="btn-cancel" @click="closeGalleryModal">
            {{ t('backgroundTiles.galleryCancel') }}
          </button>
          <button
            class="btn-select"
            :disabled="!selectedGalleryImage"
            @click="confirmGallerySelection"
          >
            {{ t('backgroundTiles.gallerySelect') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t, locale } = useI18n()
const {
  showGalleryModal,
  galleryCategories,
  galleryImages,
  selectedGalleryCategory,
  selectedGalleryImage,
  galleryLoading,
  closeGalleryModal,
  selectGalleryCategory,
  selectGalleryImage,
  confirmGallerySelection,
} = inject('tileGallery')
</script>

<style scoped>
/* Modal Overlay */
.tile-gallery-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

/* Modal Container */
.tile-gallery-modal {
  background: var(--primary-bg);
  border-radius: 12px;
  border: 1px solid var(--ds-border);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(201, 152, 77, 0.2);
  width: 90vw;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

/* Modal Header */
.gallery-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--ds-border);
}

.gallery-modal-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ds-text);
}

.gallery-modal-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--ds-border);
  color: var(--ds-text);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-modal-close:hover {
  background: color-mix(in srgb, var(--ds-danger) 80%, transparent);
  border-color: color-mix(in srgb, var(--ds-danger) 90%, transparent);
}

/* Modal Content */
.gallery-modal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* Category Tabs */
.gallery-categories {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid var(--ds-border);
  overflow-x: auto;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--ds-border);
  color: var(--ds-text-2);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.category-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--ds-text);
}

.category-tab.active {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
  border-color: var(--ds-accent);
  color: var(--accent-ink);
}

.category-icon {
  font-size: 14px;
}

.category-name {
  font-weight: 500;
}

/* Images Container */
.gallery-images-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 200px;
}

.gallery-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--ds-border);
  border-top-color: var(--ds-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Images Grid */
.gallery-images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.gallery-image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background: rgba(0, 0, 0, 0.3);
}

.gallery-image-item:hover {
  border-color: var(--ds-accent);
  transform: scale(1.03);
}

.gallery-image-item.selected {
  border-color: var(--ds-accent);
  box-shadow:
    0 0 0 2px rgba(201, 152, 77, 0.4),
    0 4px 12px rgba(201, 152, 77, 0.3);
}

.gallery-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gallery-image-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: var(--ds-text);
  font-size: 9px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Modal Footer */
.gallery-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--ds-border);
  background: rgba(0, 0, 0, 0.2);
}

.gallery-modal-footer button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--ds-border);
  color: var(--ds-text-2);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--ds-text);
}

.btn-select {
  background: var(--ds-accent);
  border: 1px solid var(--ds-accent);
  color: var(--ds-on-accent);
}

.btn-select:hover:not(:disabled) {
  background: var(--ds-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(201, 152, 77, 0.4);
}

.btn-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .tile-gallery-modal-overlay {
  background: rgba(0, 0, 0, 0.4);
}

[data-theme='light'] .tile-gallery-modal {
  background: var(--card-bg);
  border-color: var(--border-color);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .gallery-modal-header h3 {
  color: var(--text-primary);
}

[data-theme='light'] .gallery-modal-header {
  border-bottom-color: var(--border-color);
}

[data-theme='light'] .gallery-modal-close {
  background: rgba(0, 0, 0, 0.06);
  border-color: var(--ds-border);
  color: var(--text-primary);
}

[data-theme='light'] .gallery-categories {
  background: rgba(0, 0, 0, 0.03);
  border-bottom-color: var(--border-color);
}

[data-theme='light'] .category-tab {
  background: rgba(0, 0, 0, 0.04);
  border-color: var(--ds-border);
  color: var(--text-muted);
}

[data-theme='light'] .category-tab:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-primary);
}

[data-theme='light'] .category-tab.active {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  border-color: var(--accent-primary);
}

[data-theme='light'] .loading-spinner {
  border-color: var(--border-color);
  border-top-color: var(--accent-primary);
}

[data-theme='light'] .gallery-image-item {
  background: rgba(0, 0, 0, 0.04);
}

[data-theme='light'] .gallery-image-item:hover {
  border-color: var(--accent-primary);
}

[data-theme='light'] .gallery-image-item.selected {
  border-color: var(--accent-primary);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--accent-primary) 30%, transparent),
    0 4px 12px color-mix(in srgb, var(--accent-primary) 20%, transparent);
}

[data-theme='light'] .gallery-image-name {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

[data-theme='light'] .gallery-modal-footer {
  background: rgba(0, 0, 0, 0.03);
  border-top-color: var(--border-color);
}

[data-theme='light'] .btn-cancel {
  background: rgba(0, 0, 0, 0.06);
  border-color: var(--ds-border);
  color: var(--text-muted);
}

[data-theme='light'] .btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
}

[data-theme='light'] .btn-select {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--accent-text);
}

[data-theme='light'] .btn-select:hover:not(:disabled) {
  background: var(--accent-primary);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-primary) 30%, transparent);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .tile-gallery-modal {
    width: 95vw;
    max-height: 85vh;
  }

  .gallery-modal-footer button {
    padding: 10px 16px;
    min-height: 44px;
  }

  .category-tab {
    padding: 8px 12px;
    font-size: 11px;
    min-height: 40px;
  }
}

@media (max-width: 480px) {
  .gallery-images-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }

  .gallery-modal-header {
    padding: 12px;
  }

  .gallery-modal-footer {
    padding: 12px;
  }
}
</style>
