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
  z-index: calc(var(--ds-z-toast) + 1);
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
  background: var(--card-bg);
  border-radius: var(--ds-radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--ds-shadow-overlay);
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
  border-bottom: 1px solid var(--border-color);
}

.replace-gallery-header h3 {
  margin: 0;
  font-size: var(--ds-text-lg);
  font-weight: var(--ds-weight-semibold);
  color: var(--accent-ink);
}

.replace-gallery-close {
  width: 28px;
  height: 28px;
  border-radius: var(--ds-radius-full);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--ds-border);
  color: var(--ds-text);
  font-size: var(--ds-text-xl);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ds-duration) var(--ds-ease);
}

.replace-gallery-close:hover {
  background: color-mix(in srgb, var(--ds-danger) 30%, transparent);
  border-color: color-mix(in srgb, var(--ds-danger) 50%, transparent);
}

.replace-gallery-categories {
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  scrollbar-width: thin;
}

.replace-category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--ds-radius-lg);
  border: 1px solid var(--ds-border);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-muted);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--ds-duration) var(--ds-ease);
}

.replace-category-tab:hover {
  background: var(--ds-accent-soft);
  color: var(--text-secondary);
}

.replace-category-tab.active {
  background: var(--ds-accent-soft);
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}

.category-icon {
  font-size: var(--ds-text-lg);
}
.category-name {
  font-size: var(--ds-text-xs);
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
  font-size: var(--ds-text-md);
}

.replace-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.replace-gallery-item {
  aspect-ratio: 1;
  border-radius: var(--ds-radius-md);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.3);
  transition: all var(--ds-duration) var(--ds-ease);
  position: relative;
}

.replace-gallery-item:hover {
  border-color: var(--ds-accent);
}

.replace-gallery-item.selected {
  border-color: var(--ds-success);
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
  color: var(--ds-text);
  font-size: var(--ds-text-xs);
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
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  padding: 8px 16px;
  border-radius: var(--ds-radius-sm);
  border: 1px solid var(--ds-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  font-size: var(--ds-text-sm);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--ds-text);
}

.btn-confirm {
  padding: 8px 20px;
  border-radius: var(--ds-radius-sm);
  border: 1px solid color-mix(in srgb, var(--ds-success) 40%, transparent);
  background: color-mix(in srgb, var(--ds-success) 15%, transparent);
  color: var(--ds-success);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-confirm:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-success) 25%, transparent);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Light theme */
[data-theme='light'] .replace-gallery-modal {
  box-shadow: var(--ds-shadow-overlay);
}
[data-theme='light'] .replace-gallery-close {
  background: rgba(0, 0, 0, 0.06);
  border-color: var(--ds-border);
  color: var(--text-primary);
}
[data-theme='light'] .replace-gallery-close:hover {
  background: color-mix(in srgb, var(--ds-danger) 15%, transparent);
  color: var(--ds-danger);
}
[data-theme='light'] .replace-category-tab {
  border-color: var(--border-color);
  background: var(--ds-surface-2);
}
[data-theme='light'] .replace-category-tab:hover {
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  color: var(--text-primary);
}
[data-theme='light'] .replace-category-tab.active {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
}
[data-theme='light'] .replace-gallery-item {
  background: rgba(0, 0, 0, 0.03);
}
[data-theme='light'] .replace-gallery-item:hover {
  border-color: var(--accent-primary);
}
[data-theme='light'] .btn-cancel {
  border-color: var(--border-color);
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
}
[data-theme='light'] .btn-cancel:hover {
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  color: var(--text-primary);
}
</style>
