<template>
  <UiDialog
    :open="showGalleryModal"
    size="lg"
    :title="t('backgroundTiles.galleryTitle')"
    @close="closeGalleryModal"
  >
    <!-- Kategorie-Tabs -->
    <UiSegmentedControl
      v-if="categoryOptions.length"
      :model-value="selectedGalleryCategory == null ? '' : String(selectedGalleryCategory)"
      class="gallery-categories"
      size="sm"
      :label="t('backgroundTiles.galleryCategories')"
      :options="categoryOptions"
      @update:model-value="selectGalleryCategory($event)"
    />

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
          <span class="gallery-image-name">{{ localizedName(image) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="closeGalleryModal">
        {{ t('backgroundTiles.galleryCancel') }}
      </UiButton>
      <UiButton
        variant="primary"
        :disabled="!selectedGalleryImage"
        @click="confirmGallerySelection"
      >
        {{ t('backgroundTiles.gallerySelect') }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import UiButton from '../ui/UiButton.vue'
import UiDialog from '../ui/UiDialog.vue'
import UiSegmentedControl from '../ui/UiSegmentedControl.vue'

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

/** Name aus gallery.json in der aktuellen Sprache (`name` = DE, `name_en` = EN) */
const localizedName = (entry) => (locale.value === 'de' ? entry.name : entry.name_en || entry.name)

const categoryOptions = computed(() =>
  galleryCategories.value.map((category) => ({
    value: String(category.id),
    label: `${category.icon ? category.icon + ' ' : ''}${localizedName(category)}`,
  })),
)
</script>

<style scoped>
.gallery-categories {
  align-self: flex-start;
  max-width: 100%;
  overflow-x: auto;
}

.gallery-images-container {
  overflow-y: auto;
  max-height: 55vh;
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
  border-radius: var(--ds-radius-full);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.gallery-images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.gallery-image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--ds-radius-md);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all var(--ds-duration) var(--ds-ease);
  background: rgba(0, 0, 0, 0.3);
}

.gallery-image-item:hover {
  border-color: var(--ds-accent);
}

.gallery-image-item.selected {
  border-color: var(--ds-accent);
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
  color: white;
  font-size: var(--ds-text-xs);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
}

[data-theme='light'] .gallery-image-name {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

@media (max-width: 480px) {
  .gallery-images-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }
}
</style>
