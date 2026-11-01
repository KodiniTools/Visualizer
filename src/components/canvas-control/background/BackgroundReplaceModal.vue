<template>
  <UiDialog
    :open="showBackgroundReplaceModal"
    size="lg"
    :title="
      replaceType === 'workspace'
        ? t('canvasControl.replaceWorkspaceBackground')
        : t('canvasControl.replaceBackground')
    "
    :description="t('canvasControl.audioReactiveKept')"
    @close="closeBackgroundReplaceModal"
  >
    <div class="replace-body">
      <div v-if="currentBackgroundForReplace" class="current-bg">
        <img :src="currentBackgroundForReplace" :alt="t('canvasControl.currentBackground')" />
      </div>

      <div class="replace-actions">
        <input
          ref="bgReplaceFileInput"
          type="file"
          accept="image/*"
          hidden
          @change="handleBackgroundReplaceFile"
        />
        <UiButton variant="secondary" block @click="bgReplaceFileInput?.click()">
          {{ t('app.uploadImage') }}
        </UiButton>
        <UiButton variant="secondary" block @click="openBgReplaceGallery">
          {{ t('app.fromGallery') }}
        </UiButton>
      </div>

      <!-- Galerie-Auswahl -->
      <section v-if="showBgReplaceGallery" class="replace-panel">
        <UiSegmentedControl
          v-if="categoryOptions.length"
          :model-value="selectedBgCategory == null ? '' : String(selectedBgCategory)"
          :options="categoryOptions"
          :label="t('backgroundTiles.galleryCategories')"
          size="sm"
          class="gallery-categories"
          @update:model-value="onCategoryChange"
        />

        <div class="gallery-content">
          <p v-if="bgGalleryLoading" class="gallery-state">{{ t('common.loading') }}</p>
          <p v-else-if="bgGalleryImages.length === 0" class="gallery-state">
            {{ t('common.noResults') }}
          </p>
          <div v-else class="gallery-grid">
            <button
              v-for="image in bgGalleryImages"
              :key="image.file"
              type="button"
              class="gallery-item"
              :class="{ selected: selectedBgGalleryImage === image }"
              :aria-pressed="selectedBgGalleryImage === image"
              :aria-label="localizedName(image) || image.file"
              @click="selectBgGalleryImage(image)"
            >
              <img :src="image.thumb || image.file" :alt="localizedName(image)" loading="lazy" />
            </button>
          </div>
        </div>

        <div class="panel-actions">
          <UiButton variant="ghost" size="sm" @click="closeBgReplaceGallery">
            {{ t('common.cancel') }}
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="!selectedBgGalleryImage"
            @click="confirmBgReplaceFromGallery"
          >
            {{ t('app.selectImage') }}
          </UiButton>
        </div>
      </section>

      <!-- Vorschau für neues Bild -->
      <section v-if="pendingBackgroundReplaceSrc" class="replace-panel">
        <h3 class="panel-title">{{ t('app.newImagePreview') }}</h3>
        <div class="preview-image">
          <img :src="pendingBackgroundReplaceSrc" :alt="t('app.newImagePreview')" />
        </div>
        <div class="panel-actions">
          <UiButton variant="ghost" size="sm" @click="cancelBackgroundReplace">
            {{ t('common.cancel') }}
          </UiButton>
          <UiButton variant="primary" size="sm" @click="confirmBackgroundReplace">
            {{ t('app.confirmReplace') }}
          </UiButton>
        </div>
      </section>
    </div>
  </UiDialog>
</template>

<script setup>
import { computed, ref, inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import UiButton from '../../ui/UiButton.vue'
import UiDialog from '../../ui/UiDialog.vue'
import UiSegmentedControl from '../../ui/UiSegmentedControl.vue'

const { t, locale } = useI18n()
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

/** Name aus der Galerie in der aktuellen Sprache (`name` = DE, `name_en` = EN) */
const localizedName = (entry) => (locale.value === 'de' ? entry.name : entry.name_en || entry.name)

const categoryOptions = computed(() =>
  bgGalleryCategories.value.map((category) => ({
    value: String(category.id),
    label: `${category.icon ? category.icon + ' ' : ''}${localizedName(category)}`,
  })),
)

// Segmented Control liefert Strings; die Galerie vergleicht mit der Original-ID
function onCategoryChange(value) {
  const category = bgGalleryCategories.value.find((c) => String(c.id) === value)
  if (category) selectBgGalleryCategory(category.id)
}
</script>

<style scoped>
.replace-body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.current-bg,
.preview-image {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 140px;
  overflow: hidden;
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}

.current-bg img,
.preview-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.replace-actions {
  display: flex;
  gap: var(--ds-space-2);
}

.replace-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}

.panel-title {
  margin: 0;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}

.gallery-categories {
  align-self: flex-start;
  max-width: 100%;
  overflow-x: auto;
}

.gallery-content {
  max-height: 40vh;
  overflow-y: auto;
}

.gallery-state {
  margin: 0;
  padding: var(--ds-space-6) 0;
  text-align: center;
  font-size: var(--ds-text-sm);
  color: var(--ds-text-3);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--ds-space-2);
}

.gallery-item {
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  background: var(--ds-surface-1);
  border: 2px solid transparent;
  border-radius: var(--ds-radius-md);
  cursor: pointer;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

.gallery-item:hover,
.gallery-item.selected {
  border-color: var(--ds-accent);
}

.gallery-item:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.gallery-item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ds-space-2);
}
</style>
