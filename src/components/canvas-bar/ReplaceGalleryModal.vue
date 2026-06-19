<template>
  <Teleport to="body">
    <div
      v-if="showReplaceGallery"
      class="replace-gallery-modal-overlay"
      @click="closeReplaceGallery"
    >
      <div class="replace-gallery-modal" @click.stop>
        <div class="replace-gallery-header">
          <h3>🖼️ {{ t('app.selectFromGallery') }}</h3>
          <button class="replace-gallery-close" @click="closeReplaceGallery">×</button>
        </div>

        <div class="replace-gallery-categories">
          <button
            v-for="category in replaceGalleryCategories"
            :key="category.id"
            class="replace-category-tab"
            :class="{ active: selectedReplaceCategory === category.id }"
            @click="selectReplaceGalleryCategory(category.id)"
          >
            <span class="category-icon">{{ category.icon }}</span>
            <span class="category-name">{{ category.name }}</span>
          </button>
        </div>

        <div class="replace-gallery-content">
          <div v-if="replaceGalleryLoading" class="replace-gallery-loading">
            ⏳ {{ t('common.loading') }}
          </div>
          <div v-else-if="replaceGalleryImages.length === 0" class="replace-gallery-empty">
            {{ t('common.noResults') }}
          </div>
          <div v-else class="replace-gallery-grid">
            <div
              v-for="image in replaceGalleryImages"
              :key="image.file"
              class="replace-gallery-item"
              :class="{ selected: selectedReplaceImage === image }"
              @click="selectReplaceGalleryImage(image)"
            >
              <img
                :src="image.thumb || image.file"
                :alt="image.name || 'Gallery image'"
                loading="lazy"
              />
              <span v-if="image.name" class="replace-gallery-item-name">{{ image.name }}</span>
            </div>
          </div>
        </div>

        <div class="replace-gallery-footer">
          <button class="btn-cancel" @click="closeReplaceGallery">
            {{ t('common.cancel') }}
          </button>
          <button
            class="btn-confirm"
            :disabled="!selectedReplaceImage"
            @click="confirmReplaceFromGallery"
          >
            ✓ {{ t('app.replaceImage') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  showReplaceGallery: { type: Boolean, required: true },
  replaceGalleryCategories: { type: Array, required: true },
  replaceGalleryImages: { type: Array, required: true },
  selectedReplaceCategory: { type: String, default: null },
  selectedReplaceImage: { type: Object, default: null },
  replaceGalleryLoading: { type: Boolean, required: true },
  t: { type: Function, required: true },
  closeReplaceGallery: { type: Function, required: true },
  selectReplaceGalleryCategory: { type: Function, required: true },
  selectReplaceGalleryImage: { type: Function, required: true },
  confirmReplaceFromGallery: { type: Function, required: true },
})
</script>

<style scoped>
.replace-gallery-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
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

.replace-gallery-modal {
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(20, 38, 64, 0.98) 100%);
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  width: 90vw;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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

.replace-gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.replace-gallery-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-primary, #c9984d);
}

.replace-gallery-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.replace-gallery-close:hover {
  background: rgba(255, 69, 58, 0.3);
  border-color: rgba(255, 69, 58, 0.5);
}

.replace-gallery-categories {
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
  overflow-x: auto;
  scrollbar-width: thin;
}

.replace-category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid rgba(201, 152, 77, 0.2);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.replace-category-tab:hover {
  background: rgba(201, 152, 77, 0.15);
  color: var(--text-secondary);
}

.replace-category-tab.active {
  background: rgba(201, 152, 77, 0.25);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-primary, #c9984d);
}

.category-icon {
  font-size: 1rem;
}
.category-name {
  font-size: 0.75rem;
}

.replace-gallery-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 200px;
}

.replace-gallery-loading,
.replace-gallery-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.replace-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.replace-gallery-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  position: relative;
}

.replace-gallery-item:hover {
  border-color: rgba(201, 152, 77, 0.5);
  transform: scale(1.03);
}

.replace-gallery-item.selected {
  border-color: #4ade80;
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.3);
}

.replace-gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.replace-gallery-item-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 0.65rem;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.replace-gallery-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.btn-cancel {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-confirm {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid rgba(74, 222, 128, 0.4);
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.25);
  transform: translateY(-1px);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Light theme */
[data-theme='light'] .replace-gallery-modal {
  background: linear-gradient(180deg, #ffffff 0%, rgba(249, 242, 213, 0.98) 100%);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
}
[data-theme='light'] .replace-gallery-close {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.15);
  color: #003971;
}
[data-theme='light'] .replace-gallery-close:hover {
  background: rgba(255, 69, 58, 0.15);
  color: #ef4444;
}
[data-theme='light'] .replace-category-tab {
  border-color: rgba(201, 152, 77, 0.25);
  background: rgba(249, 242, 213, 0.5);
  color: #4d6d8e;
}
[data-theme='light'] .replace-category-tab:hover {
  background: rgba(1, 79, 153, 0.06);
  color: #003971;
}
[data-theme='light'] .replace-category-tab.active {
  background: rgba(1, 79, 153, 0.1);
  border-color: #014f99;
  color: #014f99;
}
[data-theme='light'] .replace-gallery-item {
  background: rgba(0, 0, 0, 0.03);
}
[data-theme='light'] .replace-gallery-item:hover {
  border-color: rgba(1, 79, 153, 0.5);
}
[data-theme='light'] .replace-gallery-loading,
[data-theme='light'] .replace-gallery-empty {
  color: #4d6d8e;
}
[data-theme='light'] .btn-cancel {
  border-color: rgba(0, 57, 113, 0.2);
  background: rgba(0, 57, 113, 0.04);
  color: #4d6d8e;
}
[data-theme='light'] .btn-cancel:hover {
  background: rgba(0, 57, 113, 0.08);
  color: #003971;
}
</style>
