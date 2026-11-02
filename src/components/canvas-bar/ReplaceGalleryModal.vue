<template>
  <!-- Liegt über der Bildvorschau (ebenfalls UiDialog): gleiche Ebene, aber später im DOM -->
  <UiDialog
    :open="showReplaceGallery"
    size="lg"
    :title="t('app.selectFromGallery')"
    @close="closeReplaceGallery"
  >
    <div class="gallery-body">
      <UiSegmentedControl
        v-if="categoryOptions.length"
        :model-value="selectedReplaceCategory == null ? '' : String(selectedReplaceCategory)"
        :options="categoryOptions"
        :label="t('backgroundTiles.galleryCategories')"
        size="sm"
        class="gallery-categories"
        @update:model-value="onCategoryChange"
      />

      <div class="gallery-content">
        <p v-if="replaceGalleryLoading" class="gallery-state">{{ t('common.loading') }}</p>
        <p v-else-if="replaceGalleryImages.length === 0" class="gallery-state">
          {{ t('common.noResults') }}
        </p>
        <div v-else class="gallery-grid">
          <button
            v-for="image in replaceGalleryImages"
            :key="image.file"
            type="button"
            class="gallery-item"
            :class="{ selected: selectedReplaceImage === image }"
            :aria-pressed="selectedReplaceImage === image"
            :aria-label="localizedName(image) || image.file"
            @click="selectReplaceGalleryImage(image)"
          >
            <img :src="image.thumb || image.file" alt="" loading="lazy" />
            <span v-if="localizedName(image)" class="gallery-item-name" aria-hidden="true">
              {{ localizedName(image) }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="closeReplaceGallery">
        {{ t('common.cancel') }}
      </UiButton>
      <UiButton
        variant="primary"
        :disabled="!selectedReplaceImage"
        @click="confirmReplaceFromGallery"
      >
        {{ t('app.replaceImage') }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import UiButton from '../ui/UiButton.vue'
import UiDialog from '../ui/UiDialog.vue'
import UiSegmentedControl from '../ui/UiSegmentedControl.vue'

const props = defineProps({
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

const { locale } = useI18n()

/** Name aus der Galerie in der aktuellen Sprache (`name` = DE, `name_en` = EN) */
const localizedName = (entry) => (locale.value === 'de' ? entry.name : entry.name_en || entry.name)

const categoryOptions = computed(() =>
  props.replaceGalleryCategories.map((category) => ({
    value: String(category.id),
    label: `${category.icon ? category.icon + ' ' : ''}${localizedName(category)}`,
  })),
)

// Segmented Control liefert Strings; die Galerie vergleicht mit der Original-ID
function onCategoryChange(value) {
  const category = props.replaceGalleryCategories.find((c) => String(c.id) === value)
  if (category) props.selectReplaceGalleryCategory(category.id)
}
</script>

<style scoped>
.gallery-body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.gallery-categories {
  align-self: flex-start;
  max-width: 100%;
  overflow-x: auto;
}

.gallery-content {
  max-height: 50vh;
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
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: var(--ds-space-2);
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  background: var(--ds-surface-2);
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

/* Liegt auf dem Bild: in beiden Themes weiße Schrift auf dunklem Verlauf */
.gallery-item-name {
  position: absolute;
  inset: auto 0 0;
  padding: var(--ds-space-4) var(--ds-space-2) var(--ds-space-1);
  overflow: hidden;
  font-size: var(--ds-text-xs);
  color: #fff;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
}
</style>
