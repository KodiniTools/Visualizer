<template>
  <div class="foto-panel-wrapper">
    <!-- ✨ Bild-Vorschau Overlay -->
    <div v-if="previewImage" class="image-preview-overlay" @click="closePreview">
      <div class="preview-container" @click.stop>
        <button class="preview-close" @click="closePreview">✕</button>
        <img :src="previewImage.src" :alt="previewImage.name" class="preview-image">
        <div class="preview-info">
          <span class="preview-name">{{ previewImage.name }}</span>
        </div>
        <div class="preview-actions">
          <button @click="addPreviewToCanvas" class="btn-primary">{{ t('foto.placeOnCanvas') }}</button>
          <button @click="setPreviewAsBackground" class="btn-secondary">{{ t('foto.asBackground') }}</button>
        </div>
      </div>
    </div>

    <!-- ✨ Farbeinstellungen für Bildabschnitte -->
    <div class="color-settings-section">
      <div class="color-settings-header" @click="showColorPicker = !showColorPicker">
        <div class="color-settings-title">
          <span class="color-preview-dot" :style="{ background: panelSettingsStore.getSelectedColor().gradient }"></span>
          <span>{{ t('foto.sectionColor') }}</span>
        </div>
        <button class="color-toggle-btn" :class="{ 'rotated': showColorPicker }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      <transition name="collapse-color">
        <div v-show="showColorPicker" class="color-picker-content">
          <div class="color-presets">
            <button
              v-for="colorOption in panelSettingsStore.colorOptions"
              :key="colorOption.id"
              class="color-preset-btn"
              :class="{ 'active': !panelSettingsStore.useCustomColor && panelSettingsStore.selectedImageSectionColorId === colorOption.id }"
              :style="{ background: colorOption.gradient }"
              :title="colorOption.name"
              @click="panelSettingsStore.setImageSectionColor(colorOption.id)"
            />
          </div>
          <div class="custom-color-row">
            <label class="custom-color-label">
              <input
                type="checkbox"
                :checked="panelSettingsStore.useCustomColor"
                @change="panelSettingsStore.toggleCustomColor($event.target.checked)"
              >
              <span>{{ t('foto.customColor') }}</span>
            </label>
            <input
              type="color"
              class="custom-color-input"
              :value="panelSettingsStore.customColor"
              @input="panelSettingsStore.setCustomColor($event.target.value)"
              :disabled="!panelSettingsStore.useCustomColor"
            >
          </div>
        </div>
      </transition>
    </div>

    <!-- ✨ Stock-Galerie Sektion -->
    <div class="stock-gallery-section">
      <h4>{{ t('foto.gallery') }}</h4>

      <!-- Kategorie-Tabs -->
      <div class="category-tabs">
        <button
          v-for="category in stockCategories"
          :key="category.id"
          class="category-tab"
          :class="{ 'active': selectedStockCategory === category.id }"
          @click="selectStockCategory(category.id)"
        >
          <span class="category-icon">{{ category.icon }}</span>
          <span class="category-name">{{ getStockCategoryName(category) }}</span>
          <span v-if="category.count" class="category-count">{{ category.count }}</span>
        </button>
      </div>

      <!-- Stock-Bilder Grid -->
      <div class="stock-gallery-scroll">
        <!-- Auswahl-Steuerung -->
        <div v-if="filteredStockImages.length > 0" class="selection-controls">
          <button @click="selectAllStockImages" class="btn-select-all" :disabled="selectedStockCount === filteredStockImages.length">
            {{ t('foto.selectAll') }}
          </button>
          <button @click="deselectAllStockImages" class="btn-deselect-all" :disabled="selectedStockCount === 0">
            {{ t('foto.deselectAll') }}
          </button>
          <span v-if="selectedStockCount > 0" class="selection-count">{{ selectedStockCount }} {{ t('foto.selected') }}</span>
        </div>
        <p class="multiselect-hint">{{ t('foto.multiselectHint') }}</p>
        <div class="stock-gallery-grid">
          <div
            v-for="img in filteredStockImages"
            :key="img.id"
            class="stock-thumbnail-item"
            :class="{ 'selected': selectedStockImages.has(img.id) }"
            @click="selectStockImage(img, $event)"
            @dblclick="openStockPreview(img)"
          >
            <!-- Checkbox für Mehrfachauswahl -->
            <div class="selection-checkbox" :class="{ 'checked': selectedStockImages.has(img.id) }">
              <span v-if="selectedStockImages.has(img.id)">✓</span>
            </div>
            <img :src="img.thumbnail" :alt="img.name" loading="lazy">
            <div class="stock-thumbnail-info">
              <span class="stock-thumbnail-name">{{ img.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock-Bild Action-Buttons -->
      <div v-if="selectedStockCount > 0" class="action-buttons stock-actions">
        <button @click="addStockImageToCanvas" class="btn-primary">
          {{ selectedStockCount > 1 ? (locale === 'de' ? `${selectedStockCount} Bilder auf Canvas` : `${selectedStockCount} images on Canvas`) : t('foto.placeOnCanvas') }}
        </button>
        <button v-if="selectedStockCount === 1" @click="setStockAsBackground" class="btn-secondary">
          {{ t('foto.asBackground') }}
        </button>
        <button v-if="selectedStockCount === 1" @click="setStockAsWorkspaceBackground" class="btn-workspace">
          {{ t('foto.asWorkspaceBackground') }}
        </button>
      </div>

      <!-- ✨ Platzierung mit Animation für Stock-Bilder -->
      <div v-if="selectedStockCount === 1" class="placement-section">
        <div class="placement-header">
          <span>{{ locale === 'de' ? 'Platzierung' : 'Placement' }}</span>
        </div>

        <!-- Kompakte Einstellungen Grid -->
        <div class="placement-grid">
          <!-- Animation -->
          <div class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Effekt' : 'Effect' }}</span>
            <select v-model="selectedAnimation" class="placement-select">
              <option value="none">–</option>
              <option value="fade">Fade</option>
              <option value="slideLeft">← Slide</option>
              <option value="slideRight">→ Slide</option>
              <option value="slideUp">↑ Slide</option>
              <option value="slideDown">↓ Slide</option>
              <option value="zoom">Zoom</option>
              <option value="bounce">Bounce</option>
              <option value="spin">Spin</option>
              <option value="elastic">Elastic</option>
            </select>
          </div>

          <!-- Dauer (nur wenn Animation) -->
          <div v-if="selectedAnimation !== 'none'" class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Dauer' : 'Duration' }}</span>
            <div class="placement-slider-wrap">
              <input type="range" v-model.number="animationDuration" min="100" max="5000" step="100" class="placement-slider" />
              <span class="placement-value">{{ (animationDuration / 1000).toFixed(1) }}s</span>
            </div>
          </div>

          <!-- Größe -->
          <div class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Größe' : 'Size' }}</span>
            <div class="placement-slider-wrap">
              <input type="range" v-model.number="imageScale" min="1" max="8" step="1" class="placement-slider" />
              <span class="placement-value">{{ imageScale }}x</span>
            </div>
          </div>

          <!-- X/Y Position in einer Zeile -->
          <div class="placement-row placement-xy">
            <span class="placement-label">X</span>
            <input type="number" v-model.number="imageOffsetX" min="-500" max="500" step="10" class="placement-input" />
            <span class="placement-label">Y</span>
            <input type="number" v-model.number="imageOffsetY" min="-500" max="500" step="10" class="placement-input" />
          </div>
        </div>

        <!-- Buttons -->
        <div class="placement-buttons">
          <button @click="startStockImageRangeSelection" class="btn-placement btn-draw">
            {{ locale === 'de' ? 'Zeichnen' : 'Draw' }}
          </button>
          <button @click="addStockImageDirectly" class="btn-placement btn-place">
            {{ locale === 'de' ? 'Platzieren' : 'Place' }}
          </button>
        </div>
        <p v-if="isInRangeSelectionMode" class="placement-hint">
          {{ locale === 'de' ? 'Bereich auf Canvas ziehen...' : 'Draw area on canvas...' }}
        </p>
      </div>

      <!-- Ladeanzeige -->
      <div v-if="stockImagesLoading || categoryLoading" class="loading-state">
        <p>{{ stockImagesLoading ? t('foto.loadingGallery') : t('foto.loadingCategory') }}</p>
      </div>

      <!-- Fehleranzeige wenn keine Bilder -->
      <div v-if="!stockImagesLoading && stockCategories.length === 0" class="error-state">
        <p>{{ t('foto.galleryLoadError') }}</p>
        <button @click="loadStockGallery" class="btn-retry">{{ t('foto.retryLoad') }}</button>
      </div>

      <!-- Keine Bilder in Kategorie -->
      <div v-if="!stockImagesLoading && !categoryLoading && stockCategories.length > 0 && filteredStockImages.length === 0" class="empty-state">
        <p>{{ t('foto.noImagesInCategory') }}</p>
      </div>
    </div>

    <!-- ✨ Upload-Bereich (immer sichtbar) -->
    <div class="upload-section">
      <h4>{{ t('foto.ownImages') }}</h4>

      <div class="upload-area" @click="triggerFileInput">
        <input
          type="file"
          ref="fileInputRef"
          @change="handleImageUpload"
          accept="image/*"
          multiple
          style="display: none;"
        >
        <div class="upload-placeholder">
          <p>{{ t('foto.clickToUpload') }}</p>
          <small>{{ t('foto.multipleImagesHint') }}</small>
        </div>
      </div>

      <!-- ✨ NEU: Scrollbare Galerie mit Thumbnails -->
      <div v-if="imageGallery.length > 0" class="gallery-container">
        <div class="gallery-header">
          <span class="gallery-title">{{ locale === 'de' ? 'Galerie (' + imageGallery.length + ')' : 'Gallery (' + imageGallery.length + ')' }}</span>
          <button @click="clearAllImages" class="btn-clear-all">{{ t('foto.deleteAll') }}</button>
        </div>

        <!-- Auswahl-Steuerung -->
        <div class="selection-controls">
          <button @click="selectAllImages" class="btn-select-all" :disabled="selectedImageCount === imageGallery.length">
            {{ t('foto.selectAll') }}
          </button>
          <button @click="deselectAllImages" class="btn-deselect-all" :disabled="selectedImageCount === 0">
            {{ t('foto.deselectAll') }}
          </button>
          <span v-if="selectedImageCount > 0" class="selection-count">{{ selectedImageCount }} {{ t('foto.selected') }}</span>
        </div>
        <p class="multiselect-hint">{{ t('foto.multiselectHint') }}</p>

        <div class="gallery-scroll">
          <div class="gallery-grid">
            <div
              v-for="(imgData, index) in imageGallery"
              :key="imgData.id"
              class="thumbnail-item"
              :class="{ 'selected': selectedImageIndices.has(index) }"
              @click="selectImage(index, $event)"
              @dblclick="openUploadedPreview(imgData)"
            >
              <!-- Checkbox für Mehrfachauswahl -->
              <div class="selection-checkbox" :class="{ 'checked': selectedImageIndices.has(index) }">
                <span v-if="selectedImageIndices.has(index)">✓</span>
              </div>
              <img :src="imgData.img.src" :alt="imgData.name">
              <div class="thumbnail-overlay">
                <button @click.stop="deleteImage(index)" class="btn-delete-thumb">✕</button>
              </div>
              <div class="thumbnail-info">
                <span class="thumbnail-name">{{ imgData.name }}</span>
                <span class="thumbnail-size">{{ imgData.dimensions }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action-Buttons (nur sichtbar wenn Bilder ausgewählt) -->
      <div v-if="selectedImageCount > 0" class="action-buttons">
        <button @click="addImageToCanvas" class="btn-primary">
          {{ selectedImageCount > 1 ? (locale === 'de' ? `${selectedImageCount} Bilder auf Canvas` : `${selectedImageCount} images on Canvas`) : t('foto.placeOnCanvas') }}
        </button>
        <button v-if="selectedImageCount === 1" @click="setAsBackground" class="btn-secondary">
          {{ t('foto.asBackground') }}
        </button>
        <button v-if="selectedImageCount === 1" @click="setAsWorkspaceBackground" class="btn-workspace">
          {{ t('foto.asWorkspaceBackground') }}
        </button>
      </div>

      <!-- ✨ Platzierung mit Animation für eigene Bilder -->
      <div v-if="selectedImageCount === 1" class="placement-section">
        <div class="placement-header">
          <span>{{ locale === 'de' ? 'Platzierung' : 'Placement' }}</span>
        </div>

        <!-- Kompakte Einstellungen Grid -->
        <div class="placement-grid">
          <!-- Animation -->
          <div class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Effekt' : 'Effect' }}</span>
            <select v-model="selectedAnimation" class="placement-select">
              <option value="none">–</option>
              <option value="fade">Fade</option>
              <option value="slideLeft">← Slide</option>
              <option value="slideRight">→ Slide</option>
              <option value="slideUp">↑ Slide</option>
              <option value="slideDown">↓ Slide</option>
              <option value="zoom">Zoom</option>
              <option value="bounce">Bounce</option>
              <option value="spin">Spin</option>
              <option value="elastic">Elastic</option>
            </select>
          </div>

          <!-- Dauer (nur wenn Animation) -->
          <div v-if="selectedAnimation !== 'none'" class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Dauer' : 'Duration' }}</span>
            <div class="placement-slider-wrap">
              <input type="range" v-model.number="animationDuration" min="100" max="5000" step="100" class="placement-slider" />
              <span class="placement-value">{{ (animationDuration / 1000).toFixed(1) }}s</span>
            </div>
          </div>

          <!-- Größe -->
          <div class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Größe' : 'Size' }}</span>
            <div class="placement-slider-wrap">
              <input type="range" v-model.number="imageScale" min="1" max="8" step="1" class="placement-slider" />
              <span class="placement-value">{{ imageScale }}x</span>
            </div>
          </div>

          <!-- X/Y Position in einer Zeile -->
          <div class="placement-row placement-xy">
            <span class="placement-label">X</span>
            <input type="number" v-model.number="imageOffsetX" min="-500" max="500" step="10" class="placement-input" />
            <span class="placement-label">Y</span>
            <input type="number" v-model.number="imageOffsetY" min="-500" max="500" step="10" class="placement-input" />
          </div>
        </div>

        <!-- Buttons -->
        <div class="placement-buttons">
          <button @click="startUploadedImageRangeSelection" class="btn-placement btn-draw">
            {{ locale === 'de' ? 'Zeichnen' : 'Draw' }}
          </button>
          <button @click="addUploadedImageDirectly" class="btn-placement btn-place">
            {{ locale === 'de' ? 'Platzieren' : 'Place' }}
          </button>
        </div>
        <p v-if="isInRangeSelectionMode" class="placement-hint">
          {{ locale === 'de' ? 'Bereich auf Canvas ziehen...' : 'Draw area on canvas...' }}
        </p>
      </div>

      <!-- Info-Text wenn keine Bilder -->
      <div v-if="imageGallery.length === 0" class="empty-state">
        <p>{{ t('foto.noImagesUploaded') }}</p>
      </div>
    </div>

    <!-- Filter-Bereich (nur sichtbar wenn Bild auf Canvas ausgewählt) -->
    <div class="foto-panel-container" ref="containerRef" style="display: none;">
      <h4>{{ t('foto.editImage') }}</h4>

      <!-- ✨ NEU: Ebenen-Steuerung -->
      <div class="layer-controls-section">
        <div class="modern-section-header">
          <h4>{{ t('foto.layers') }}</h4>
          <span class="layer-info" v-if="currentLayerInfo">{{ currentLayerInfo }}</span>
        </div>
        <div class="layer-buttons">
          <button
            type="button"
            class="layer-btn"
            @click="onBringToFront"
            :disabled="!canMoveUp"
            :title="locale === 'de' ? 'Ganz nach vorne (oberste Ebene)' : 'Bring to front (top layer)'"
          >
            <span class="layer-icon">⬆⬆</span>
            <span class="layer-text">{{ t('foto.bringToFrontTop') }}</span>
          </button>
          <button
            type="button"
            class="layer-btn"
            @click="onMoveUp"
            :disabled="!canMoveUp"
            :title="locale === 'de' ? 'Eine Ebene nach oben' : 'Move layer up'"
          >
            <span class="layer-icon">↑</span>
            <span class="layer-text">{{ t('foto.layerUp') }}</span>
          </button>
          <button
            type="button"
            class="layer-btn"
            @click="onMoveDown"
            :disabled="!canMoveDown"
            :title="locale === 'de' ? 'Eine Ebene nach unten' : 'Move layer down'"
          >
            <span class="layer-icon">↓</span>
            <span class="layer-text">{{ t('foto.layerDown') }}</span>
          </button>
          <button
            type="button"
            class="layer-btn"
            @click="onSendToBack"
            :disabled="!canMoveDown"
            :title="locale === 'de' ? 'Ganz nach hinten (unterste Ebene)' : 'Send to back (bottom layer)'"
          >
            <span class="layer-icon">⬇⬇</span>
            <span class="layer-text">{{ t('foto.sendToBackBottom') }}</span>
          </button>
        </div>
      </div>

      <div class="modern-divider"></div>

      <div class="control-group">
        <label>{{ t('foto.filterPreset') }}</label>
        <select ref="presetSelectRef" @change="onPresetChange">
          <option value="">{{ t('foto.noFilter') }}</option>
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ locale === 'de' ? preset.name_de : preset.name_en }}
          </option>
        </select>
      </div>

      <div class="control-group slider">
        <label>{{ t('foto.brightness') }}</label>
        <input type="range" min="0" max="200" value="100" ref="brightnessInputRef" @input="onBrightnessChange">
        <span ref="brightnessValueRef">100%</span>
      </div>

      <div class="control-group slider">
        <label>{{ t('foto.contrast') }}</label>
        <input type="range" min="0" max="200" value="100" ref="contrastInputRef" @input="onContrastChange">
        <span ref="contrastValueRef">100%</span>
      </div>

      <div class="control-group slider">
        <label>{{ t('foto.saturate') }}</label>
        <input type="range" min="0" max="200" value="100" ref="saturationInputRef" @input="onSaturationChange">
        <span ref="saturationValueRef">100%</span>
      </div>

      <div class="control-group slider">
        <label>{{ t('foto.opacity') }}</label>
        <input type="range" min="0" max="100" value="100" ref="opacityInputRef" @input="onOpacityChange">
        <span ref="opacityValueRef">100%</span>
      </div>

      <div class="control-group slider">
        <label>{{ t('foto.blur') }}</label>
        <input type="range" min="0" max="20" value="0" step="1" ref="blurInputRef" @input="onBlurChange">
        <span ref="blurValueRef">0px</span>
      </div>

      <div class="control-group slider">
        <label>{{ t('foto.hueRotate') }}</label>
        <input type="range" min="0" max="360" value="0" step="1" ref="hueRotateInputRef" @input="onHueRotateChange">
        <span ref="hueRotateValueRef">0°</span>
      </div>

      <!-- MODERNE SCHATTEN & ROTATIONS-SEKTION -->
      <div class="modern-divider"></div>
      <div class="modern-section-header">
        <h4>{{ t('foto.shadowEffects') }}</h4>
      </div>

      <!-- Shadow Controls Group -->
      <div class="modern-controls-group">
        <!-- Schattenfarbe -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">{{ t('foto.shadowColor') }}</span>
          </label>
          <div class="modern-color-picker">
            <input
              type="color"
              ref="shadowColorInputRef"
              @input="onShadowColorChange"
              value="#000000"
              class="modern-color-input"
              :title="locale === 'de' ? 'Schattenfarbe wählen' : 'Choose shadow color'"
            />
            <input
              type="text"
              ref="shadowColorTextRef"
              @input="onShadowColorTextChange"
              value="#000000"
              class="modern-color-text"
              placeholder="#000000"
            />
          </div>
        </div>

        <!-- Schatten-Unschärfe -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">{{ t('foto.shadowBlur') }}</span>
            <span class="label-value" ref="shadowBlurValueRef">0px</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="50" 
            value="0" 
            step="1" 
            ref="shadowBlurInputRef" 
            @input="onShadowBlurChange"
            class="modern-slider shadow-slider"
          />
        </div>

        <!-- Schatten X-Offset -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">{{ t('foto.shadowHorizontal') }}</span>
            <span class="label-value" ref="shadowOffsetXValueRef">0px</span>
          </label>
          <input
            type="range"
            min="-50"
            max="50"
            value="0"
            step="1"
            ref="shadowOffsetXInputRef"
            @input="onShadowOffsetXChange"
            class="modern-slider shadow-slider"
          />
        </div>

        <!-- Schatten Y-Offset -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">{{ t('foto.shadowVertical') }}</span>
            <span class="label-value" ref="shadowOffsetYValueRef">0px</span>
          </label>
          <input
            type="range"
            min="-50"
            max="50"
            value="0"
            step="1"
            ref="shadowOffsetYInputRef"
            @input="onShadowOffsetYChange"
            class="modern-slider shadow-slider"
          />
        </div>
      </div>

      <!-- Rotation Section -->
      <div class="modern-section-header" style="margin-top: 20px;">
        <h4>{{ t('foto.rotation') }}</h4>
      </div>

      <div class="modern-controls-group">
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">{{ t('foto.rotationAngle') }}</span>
            <span class="label-value" ref="rotationValueRef">0°</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value="50"
            step="1"
            ref="rotationInputRef"
            @input="onRotationChange"
            class="modern-slider rotation-slider"
          />
          <div class="rotation-hint">← -180° | 0° | +180° →</div>
        </div>

        <!-- Spiegeln (Flip) Buttons -->
        <div class="modern-control flip-controls">
          <label class="modern-label">
            <span class="label-text">{{ t('foto.flip') }}</span>
          </label>
          <div class="flip-buttons">
            <button
              type="button"
              class="flip-button"
              :class="{ 'active': flipHRef }"
              @click="onFlipHorizontal"
              :title="t('foto.flipHorizontal')"
            >
              ↔ {{ t('foto.horizontal') }}
            </button>
            <button
              type="button"
              class="flip-button"
              :class="{ 'active': flipVRef }"
              @click="onFlipVertical"
              :title="t('foto.flipVertical')"
            >
              ↕ {{ t('foto.vertical') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Bildkontur Section -->
      <div class="modern-section-header" style="margin-top: 20px;">
        <h4>{{ t('foto.imageBorder') }}</h4>
      </div>

      <div class="modern-controls-group">
        <!-- Konturfarbe -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">{{ t('foto.shadowColor') }}</span>
          </label>
          <div class="modern-color-picker">
            <input
              type="color"
              ref="borderColorInputRef"
              @input="onBorderColorChange"
              value="#ffffff"
              class="modern-color-input"
              :title="locale === 'de' ? 'Konturfarbe wählen' : 'Choose border color'"
            />
            <input
              type="text"
              ref="borderColorTextRef"
              @input="onBorderColorTextChange"
              value="#ffffff"
              class="modern-color-text"
              placeholder="#ffffff"
            />
          </div>
        </div>

        <!-- Konturbreite -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">{{ t('foto.borderWidth') }}</span>
            <span class="label-value" ref="borderWidthValueRef">0px</span>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value="0"
            step="1"
            ref="borderWidthInputRef"
            @input="onBorderWidthChange"
            class="modern-slider border-slider"
          />
        </div>

        <!-- Konturtransparenz -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">{{ t('foto.opacity') }}</span>
            <span class="label-value" ref="borderOpacityValueRef">100%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value="100"
            step="1"
            ref="borderOpacityInputRef"
            @input="onBorderOpacityChange"
            class="modern-slider border-opacity-slider"
          />
        </div>
      </div>

      <!-- ✨ AUDIO-REAKTIV SEKTION -->
      <div class="modern-divider"></div>
      <div class="modern-section-header">
        <h4>🎵 Audio-Reaktiv</h4>
      </div>

      <div class="modern-controls-group audio-reactive-group">
        <!-- Master-Aktivierung -->
        <div class="modern-control checkbox-control">
          <label class="modern-checkbox-label">
            <input
              type="checkbox"
              ref="audioReactiveEnabledRef"
              @change="onAudioReactiveToggle"
              class="modern-checkbox"
            />
            <span class="checkbox-text">Audio-Reaktiv Aktiviert</span>
          </label>
        </div>

        <!-- Audio-Quelle -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">Reagiert auf</span>
          </label>
          <select
            ref="audioReactiveSourceRef"
            @change="onAudioReactiveSourceChange"
            class="modern-select"
          >
            <option value="bass">Bass (Kick/Sub)</option>
            <option value="mid">Mitten (Vocals)</option>
            <option value="treble">Höhen (Hi-Hats)</option>
            <option value="volume">Lautstärke (Gesamt)</option>
            <option value="dynamic">✨ Dynamisch (Auto-Blend)</option>
          </select>
        </div>

        <!-- Glättung -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">Glättung</span>
            <span class="label-value" ref="audioReactiveSmoothingValueRef">50%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value="50"
            step="5"
            ref="audioReactiveSmoothingRef"
            @input="onAudioReactiveSmoothingChange"
            class="modern-slider audio-slider"
          />
        </div>

        <!-- Effekte-Auswahl (Mehrfachauswahl) -->
        <div class="modern-control effects-grid">
          <label class="modern-label">
            <span class="label-text">Effekte (Mehrfachauswahl)</span>
          </label>

          <!-- Farbe (Hue) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectHueEnabledRef"
                @change="(e) => onEffectToggle('hue', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🎨 Farbe (Hue)</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="80"
              step="5"
              ref="effectHueIntensityRef"
              @input="(e) => onEffectIntensityChange('hue', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectHueValueRef">80%</span>
          </div>

          <!-- Helligkeit -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectBrightnessEnabledRef"
                @change="(e) => onEffectToggle('brightness', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">☀️ Helligkeit</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="80"
              step="5"
              ref="effectBrightnessIntensityRef"
              @input="(e) => onEffectIntensityChange('brightness', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectBrightnessValueRef">80%</span>
          </div>

          <!-- Sättigung -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectSaturationEnabledRef"
                @change="(e) => onEffectToggle('saturation', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🌈 Sättigung</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="80"
              step="5"
              ref="effectSaturationIntensityRef"
              @input="(e) => onEffectIntensityChange('saturation', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectSaturationValueRef">80%</span>
          </div>

          <!-- Skalieren (Scale/Pulsieren) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectScaleEnabledRef"
                @change="(e) => onEffectToggle('scale', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">📐 Skalieren (Pulsieren)</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="80"
              step="5"
              ref="effectScaleIntensityRef"
              @input="(e) => onEffectIntensityChange('scale', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectScaleValueRef">80%</span>
          </div>

          <!-- Leuchten (Glow) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectGlowEnabledRef"
                @change="(e) => onEffectToggle('glow', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">✨ Leuchten (Glow)</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="80"
              step="5"
              ref="effectGlowIntensityRef"
              @input="(e) => onEffectIntensityChange('glow', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectGlowValueRef">80%</span>
          </div>

          <!-- Bildkontur (Border) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectBorderEnabledRef"
                @change="(e) => onEffectToggle('border', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🖼️ Bildkontur</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="80"
              step="5"
              ref="effectBorderIntensityRef"
              @input="(e) => onEffectIntensityChange('border', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectBorderValueRef">80%</span>
          </div>

          <!-- Unschärfe (Blur) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectBlurEnabledRef"
                @change="(e) => onEffectToggle('blur', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🌫️ Unschärfe</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="50"
              step="5"
              ref="effectBlurIntensityRef"
              @input="(e) => onEffectIntensityChange('blur', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectBlurValueRef">50%</span>
          </div>

          <!-- Rotation -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectRotationEnabledRef"
                @change="(e) => onEffectToggle('rotation', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🔄 Rotation</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="50"
              step="5"
              ref="effectRotationIntensityRef"
              @input="(e) => onEffectIntensityChange('rotation', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectRotationValueRef">50%</span>
          </div>

          <!-- Shake (Erschütterung) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectShakeEnabledRef"
                @change="(e) => onEffectToggle('shake', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🫨 Erschütterung</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="50"
              step="5"
              ref="effectShakeIntensityRef"
              @input="(e) => onEffectIntensityChange('shake', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectShakeValueRef">50%</span>
          </div>

          <!-- Bounce (Hüpfen) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectBounceEnabledRef"
                @change="(e) => onEffectToggle('bounce', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">⬆️ Hüpfen</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="50"
              step="5"
              ref="effectBounceIntensityRef"
              @input="(e) => onEffectIntensityChange('bounce', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectBounceValueRef">50%</span>
          </div>

          <!-- Swing (Horizontales Pendeln) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectSwingEnabledRef"
                @change="(e) => onEffectToggle('swing', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">↔️ Pendeln</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="50"
              step="5"
              ref="effectSwingIntensityRef"
              @input="(e) => onEffectIntensityChange('swing', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectSwingValueRef">50%</span>
          </div>

          <!-- Orbit (Kreisbewegung) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectOrbitEnabledRef"
                @change="(e) => onEffectToggle('orbit', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🔵 Kreisbewegung</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="50"
              step="5"
              ref="effectOrbitIntensityRef"
              @input="(e) => onEffectIntensityChange('orbit', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectOrbitValueRef">50%</span>
          </div>

          <!-- ═══════════════════════════════════════════════════════════ -->
          <!-- ✨ NEUE EFFEKTE -->
          <!-- ═══════════════════════════════════════════════════════════ -->

          <!-- Kontrast -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectContrastEnabledRef"
                @change="(e) => onEffectToggle('contrast', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🔲 Kontrast</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="60"
              step="5"
              ref="effectContrastIntensityRef"
              @input="(e) => onEffectIntensityChange('contrast', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectContrastValueRef">60%</span>
          </div>

          <!-- Graustufen -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectGrayscaleEnabledRef"
                @change="(e) => onEffectToggle('grayscale', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">⬛ Graustufen</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="80"
              step="5"
              ref="effectGrayscaleIntensityRef"
              @input="(e) => onEffectIntensityChange('grayscale', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectGrayscaleValueRef">80%</span>
          </div>

          <!-- Sepia -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectSepiaEnabledRef"
                @change="(e) => onEffectToggle('sepia', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🟤 Sepia (Vintage)</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="70"
              step="5"
              ref="effectSepiaIntensityRef"
              @input="(e) => onEffectIntensityChange('sepia', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectSepiaValueRef">70%</span>
          </div>

          <!-- Invertieren -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectInvertEnabledRef"
                @change="(e) => onEffectToggle('invert', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🔄 Invertieren</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="50"
              step="5"
              ref="effectInvertIntensityRef"
              @input="(e) => onEffectIntensityChange('invert', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectInvertValueRef">50%</span>
          </div>

          <!-- Verzerrung (Skew) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectSkewEnabledRef"
                @change="(e) => onEffectToggle('skew', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">📐 Verzerrung</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="40"
              step="5"
              ref="effectSkewIntensityRef"
              @input="(e) => onEffectIntensityChange('skew', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectSkewValueRef">40%</span>
          </div>

          <!-- Strobe (Blitz) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectStrobeEnabledRef"
                @change="(e) => onEffectToggle('strobe', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">⚡ Strobe (Blitz)</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="70"
              step="5"
              ref="effectStrobeIntensityRef"
              @input="(e) => onEffectIntensityChange('strobe', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectStrobeValueRef">70%</span>
          </div>

          <!-- Chromatische Aberration (Glitch) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectChromaticEnabledRef"
                @change="(e) => onEffectToggle('chromatic', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🌈 RGB-Glitch</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="60"
              step="5"
              ref="effectChromaticIntensityRef"
              @input="(e) => onEffectIntensityChange('chromatic', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectChromaticValueRef">60%</span>
          </div>

          <!-- Perspektive (3D-Kipp) -->
          <div class="effect-item">
            <label class="effect-checkbox-label">
              <input
                type="checkbox"
                ref="effectPerspectiveEnabledRef"
                @change="(e) => onEffectToggle('perspective', e.target.checked)"
                class="effect-checkbox"
              />
              <span class="effect-name">🎲 3D-Perspektive</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value="50"
              step="5"
              ref="effectPerspectiveIntensityRef"
              @input="(e) => onEffectIntensityChange('perspective', e.target.value)"
              class="effect-slider"
            />
            <span class="effect-value" ref="effectPerspectiveValueRef">50%</span>
          </div>
        </div>

        <!-- Audio-Level Anzeige -->
        <div class="audio-level-indicator">
          <span class="level-label">Audio-Level:</span>
          <div class="level-bar-container">
            <div class="level-bar" ref="audioLevelBarRef"></div>
          </div>
        </div>

        <!-- ✨ NEU: Einstellungen Speichern/Anwenden -->
        <div class="audio-preset-actions">
          <button
            @click="saveAudioReactiveSettings"
            class="btn-preset-action btn-save"
            :disabled="!currentActiveImage"
            title="Aktuelle Audio-Reaktiv Einstellungen speichern"
          >
            💾 Speichern
          </button>
          <button
            @click="applyAudioReactiveSettings"
            class="btn-preset-action btn-apply"
            :disabled="!currentActiveImage || !hasSavedAudioSettings"
            title="Gespeicherte Einstellungen auf dieses Bild anwenden"
          >
            📋 Anwenden
          </button>
        </div>
      </div>

      <button @click="resetFilters" class="btn-secondary modern-reset-btn">
        Alle Filter zurücksetzen
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue';
import { usePanelSettingsStore } from '../stores/panelSettingsStore';
import { useI18n } from '../lib/i18n.js';

const { t, locale } = useI18n();

// Function to get translated stock category name
function getStockCategoryName(category) {
  // Check if translation exists for this category ID
  const translationKey = `foto.stockCategories.${category.id}`;
  const translated = t(translationKey);
  // If translation exists and is different from the key, use it
  if (translated !== translationKey) {
    return translated;
  }
  // Otherwise use name_en for English or name for German
  return locale.value === 'en' && category.name_en ? category.name_en : category.name;
}

// Refs für alle UI-Elemente
const containerRef = ref(null);
const presetSelectRef = ref(null);
const brightnessInputRef = ref(null);
const brightnessValueRef = ref(null);
const contrastInputRef = ref(null);
const contrastValueRef = ref(null);
const saturationInputRef = ref(null);
const saturationValueRef = ref(null);
const opacityInputRef = ref(null);
const opacityValueRef = ref(null);
const blurInputRef = ref(null);
const blurValueRef = ref(null);
const hueRotateInputRef = ref(null);
const hueRotateValueRef = ref(null);

// ✨ NEU: Refs für Spiegeln (Flip)
const flipHRef = ref(false);
const flipVRef = ref(false);

// ✨ NEU: Refs für Schatten und Rotation
const shadowColorInputRef = ref(null);
const shadowColorTextRef = ref(null);
const shadowBlurInputRef = ref(null);
const shadowBlurValueRef = ref(null);
const shadowOffsetXInputRef = ref(null);
const shadowOffsetXValueRef = ref(null);
const shadowOffsetYInputRef = ref(null);
const shadowOffsetYValueRef = ref(null);
const rotationInputRef = ref(null);
const rotationValueRef = ref(null);

// ✨ NEU: Refs für Bildkontur
const borderWidthInputRef = ref(null);
const borderWidthValueRef = ref(null);
const borderColorInputRef = ref(null);
const borderColorTextRef = ref(null);
const borderOpacityInputRef = ref(null);
const borderOpacityValueRef = ref(null);

// ✨ NEU: Refs für Audio-Reaktiv (Master-Einstellungen)
const audioReactiveEnabledRef = ref(null);
const audioReactiveSourceRef = ref(null);
const audioReactiveSmoothingRef = ref(null);
const audioReactiveSmoothingValueRef = ref(null);
const audioLevelBarRef = ref(null);
let audioLevelAnimationId = null;

// ✨ NEU: Refs für individuelle Effekte
const effectHueEnabledRef = ref(null);
const effectHueIntensityRef = ref(null);
const effectHueValueRef = ref(null);
const effectBrightnessEnabledRef = ref(null);
const effectBrightnessIntensityRef = ref(null);
const effectBrightnessValueRef = ref(null);
const effectSaturationEnabledRef = ref(null);
const effectSaturationIntensityRef = ref(null);
const effectSaturationValueRef = ref(null);
const effectScaleEnabledRef = ref(null);
const effectScaleIntensityRef = ref(null);
const effectScaleValueRef = ref(null);
const effectGlowEnabledRef = ref(null);
const effectGlowIntensityRef = ref(null);
const effectGlowValueRef = ref(null);
const effectBorderEnabledRef = ref(null);
const effectBorderIntensityRef = ref(null);
const effectBorderValueRef = ref(null);
const effectBlurEnabledRef = ref(null);
const effectBlurIntensityRef = ref(null);
const effectBlurValueRef = ref(null);
const effectRotationEnabledRef = ref(null);
const effectRotationIntensityRef = ref(null);
const effectRotationValueRef = ref(null);
const effectShakeEnabledRef = ref(null);
const effectShakeIntensityRef = ref(null);
const effectShakeValueRef = ref(null);
const effectBounceEnabledRef = ref(null);
const effectBounceIntensityRef = ref(null);
const effectBounceValueRef = ref(null);
const effectSwingEnabledRef = ref(null);
const effectSwingIntensityRef = ref(null);
const effectSwingValueRef = ref(null);
const effectOrbitEnabledRef = ref(null);
const effectOrbitIntensityRef = ref(null);
const effectOrbitValueRef = ref(null);

// ✨ NEUE EFFEKTE - Refs
const effectContrastEnabledRef = ref(null);
const effectContrastIntensityRef = ref(null);
const effectContrastValueRef = ref(null);
const effectGrayscaleEnabledRef = ref(null);
const effectGrayscaleIntensityRef = ref(null);
const effectGrayscaleValueRef = ref(null);
const effectSepiaEnabledRef = ref(null);
const effectSepiaIntensityRef = ref(null);
const effectSepiaValueRef = ref(null);
const effectInvertEnabledRef = ref(null);
const effectInvertIntensityRef = ref(null);
const effectInvertValueRef = ref(null);
const effectSkewEnabledRef = ref(null);
const effectSkewIntensityRef = ref(null);
const effectSkewValueRef = ref(null);
const effectStrobeEnabledRef = ref(null);
const effectStrobeIntensityRef = ref(null);
const effectStrobeValueRef = ref(null);
const effectChromaticEnabledRef = ref(null);
const effectChromaticIntensityRef = ref(null);
const effectChromaticValueRef = ref(null);
const effectPerspectiveEnabledRef = ref(null);
const effectPerspectiveIntensityRef = ref(null);
const effectPerspectiveValueRef = ref(null);

// ✨ NEU: Gespeicherte Audio-Reaktiv Einstellungen
const savedAudioReactiveSettings = ref(null);

// Computed: Prüft ob gespeicherte Einstellungen vorhanden sind
const hasSavedAudioSettings = computed(() => savedAudioReactiveSettings.value !== null);

// ✨ NEU: Refs für Galerie-Funktionalität
const fileInputRef = ref(null);
const imageGallery = ref([]); // Array von Bildern
const selectedImageIndex = ref(null); // Aktuell ausgewählter Index (für Abwärtskompatibilität)
const selectedImageIndices = ref(new Set()); // ✨ NEU: Mehrfachauswahl für hochgeladene Bilder
const lastSelectedImageIndex = ref(null); // ✨ NEU: Für Shift-Click Range-Selection

// ✨ NEU: Refs für Stock-Galerie (Modulare Struktur)
const stockCategories = ref([]);
const stockImages = ref([]); // Bilder der aktuellen Kategorie
const selectedStockCategory = ref('backgrounds');
const loadedCategoryData = ref(new Map()); // Cache für geladene Kategorie-Daten

// ✨ NEU: Ref für Bild-Vorschau Overlay
const previewImage = ref(null); // { src, name, type, data }
const selectedStockImage = ref(null); // Für Abwärtskompatibilität
const selectedStockImages = ref(new Set()); // ✨ NEU: Mehrfachauswahl für Stock-Bilder (nach ID)
const lastSelectedStockId = ref(null); // ✨ NEU: Für Shift-Click Range-Selection
const stockImagesLoading = ref(true);
const categoryLoading = ref(false); // Lädt gerade eine Kategorie?
const loadedStockImages = ref(new Map()); // Cache für geladene Image-Objekte

// ✨ NEU: Panel-Einstellungen Store für Farbkonfiguration
const panelSettingsStore = usePanelSettingsStore();
const showColorPicker = ref(false);

// ✨ NEU: Bereichsauswahl und Animation Refs
const selectedAnimation = ref('none');
const animationDuration = ref(1000); // Animationsdauer in ms (100-5000)
const imageScale = ref(1); // Bildgröße als Multiplikator (1x-8x)
const imageOffsetX = ref(0); // X-Achsen-Verschiebung in Pixel (-500 bis +500)
const imageOffsetY = ref(0); // Y-Achsen-Verschiebung in Pixel (-500 bis +500)
const isInRangeSelectionMode = ref(false);
const pendingRangeSelectionImage = ref(null); // Das Bild, das nach der Bereichsauswahl platziert wird
const pendingRangeSelectionType = ref(null); // 'stock' oder 'uploaded'

// ✨ NEU: Computed - Prüft ob X/Y-Position konfiguriert ist (Direktplatzierung aktiv)
const hasPositionOffset = computed(() => {
  return imageOffsetX.value !== 0 || imageOffsetY.value !== 0;
});

// Holen die Manager-Instanzen aus App.vue (als reactive refs)
const fotoManagerRef = inject('fotoManager');
const canvasManagerRef = inject('canvasManager');
const multiImageManagerRef = inject('multiImageManager');
const presets = ref([]);

// ✨ NEU: Aktuell ausgewähltes Bild auf dem Canvas
const currentActiveImage = ref(null);

// ✨ NEU: Computed für aktuell ausgewähltes Bild aus Galerie (Abwärtskompatibilität)
const selectedImage = computed(() => {
  if (selectedImageIndex.value !== null && imageGallery.value[selectedImageIndex.value]) {
    return imageGallery.value[selectedImageIndex.value];
  }
  return null;
});

// ✨ NEU: Computed für alle ausgewählten hochgeladenen Bilder (Mehrfachauswahl)
const selectedImages = computed(() => {
  return Array.from(selectedImageIndices.value)
    .sort((a, b) => a - b)
    .map(index => imageGallery.value[index])
    .filter(img => img !== undefined);
});

// ✨ NEU: Anzahl der ausgewählten hochgeladenen Bilder
const selectedImageCount = computed(() => selectedImageIndices.value.size);

// ✨ NEU: Computed für alle ausgewählten Stock-Bilder (Mehrfachauswahl)
const selectedStockImagesList = computed(() => {
  return stockImages.value.filter(img => selectedStockImages.value.has(img.id));
});

// ✨ NEU: Anzahl der ausgewählten Stock-Bilder
const selectedStockCount = computed(() => selectedStockImages.value.size);

// ✨ NEU: Prüfen ob ein Stock-Bild ausgewählt ist
const isStockImageSelected = (imgId) => {
  return selectedStockImages.value.has(imgId);
};

// ✨ NEU: Prüfen ob ein hochgeladenes Bild ausgewählt ist
const isImageSelected = (index) => {
  return selectedImageIndices.value.has(index);
};

// ✨ NEU: Computed für gefilterte Stock-Bilder nach Kategorie
// Bei modularer Struktur enthält stockImages bereits nur die aktuelle Kategorie
const filteredStockImages = computed(() => {
  return stockImages.value;
});

// ═══════════════════════════════════════════════════════════════════
// ✨ CANVAS-BILDER VERWALTUNG
// ═══════════════════════════════════════════════════════════════════

// Computed: Alle Bilder, die aktuell auf dem Canvas platziert sind
const canvasImages = computed(() => {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return [];
  return multiImageManager.getAllImages() || [];
});

// Canvas-Bild auswählen (über die Thumbnail-Liste)
function selectCanvasImage(imgData) {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !imgData) return;

  // Setze das Bild als ausgewählt im MultiImageManager
  multiImageManager.setSelectedImage(imgData);

  // Aktualisiere das aktive Bild für die Filter-UI
  currentActiveImage.value = imgData;

  console.log('📌 Canvas-Bild ausgewählt:', imgData.id);
}

// Canvas-Bild löschen
function deleteCanvasImage(imgData) {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !imgData) return;

  multiImageManager.removeImage(imgData.id);
  console.log('🗑️ Canvas-Bild gelöscht:', imgData.id);
}

// ═══════════════════════════════════════════════════════════════════
// ✨ EBENEN-STEUERUNG (Z-Index)
// ═══════════════════════════════════════════════════════════════════

// Computed: Kann das Bild nach oben verschoben werden?
const canMoveUp = computed(() => {
  if (!currentActiveImage.value) return false;
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return false;

  const index = multiImageManager.getImageIndex(currentActiveImage.value);
  const count = multiImageManager.getImageCount();
  return index !== -1 && index < count - 1;
});

// Computed: Kann das Bild nach unten verschoben werden?
const canMoveDown = computed(() => {
  if (!currentActiveImage.value) return false;
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return false;

  const index = multiImageManager.getImageIndex(currentActiveImage.value);
  return index > 0;
});

// Computed: Aktuelle Ebenen-Info (z.B. "Ebene 2 von 5")
const currentLayerInfo = computed(() => {
  if (!currentActiveImage.value) return '';
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return '';

  const index = multiImageManager.getImageIndex(currentActiveImage.value);
  const count = multiImageManager.getImageCount();
  if (index === -1 || count === 0) return '';

  return `${index + 1} / ${count}`;
});

// Bild ganz nach vorne bringen
function onBringToFront() {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !currentActiveImage.value) return;

  multiImageManager.bringToFront(currentActiveImage.value);
}

// Bild ganz nach hinten senden
function onSendToBack() {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !currentActiveImage.value) return;

  multiImageManager.sendToBack(currentActiveImage.value);
}

// Bild eine Ebene nach oben
function onMoveUp() {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !currentActiveImage.value) return;

  multiImageManager.moveUp(currentActiveImage.value);
}

// Bild eine Ebene nach unten
function onMoveDown() {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !currentActiveImage.value) return;

  multiImageManager.moveDown(currentActiveImage.value);
}

// ✨ NEU: Filter-Änderungs-Handler
function onBrightnessChange(event) {
  const value = parseInt(event.target.value);
  brightnessValueRef.value.textContent = value + '%';
  updateActiveImageSetting('brightness', value);
}

function onContrastChange(event) {
  const value = parseInt(event.target.value);
  contrastValueRef.value.textContent = value + '%';
  updateActiveImageSetting('contrast', value);
}

function onSaturationChange(event) {
  const value = parseInt(event.target.value);
  saturationValueRef.value.textContent = value + '%';
  updateActiveImageSetting('saturation', value);
}

function onOpacityChange(event) {
  const value = parseInt(event.target.value);
  opacityValueRef.value.textContent = value + '%';
  updateActiveImageSetting('opacity', value);
}

function onBlurChange(event) {
  const value = parseInt(event.target.value);
  blurValueRef.value.textContent = value + 'px';
  updateActiveImageSetting('blur', value);
}

function onHueRotateChange(event) {
  const value = parseInt(event.target.value);
  hueRotateValueRef.value.textContent = value + '°';
  updateActiveImageSetting('hueRotate', value);
}

// ✨ NEU: Flip-Handler (Horizontal und Vertikal spiegeln)
function onFlipHorizontal() {
  if (!currentActiveImage.value) return;
  const currentValue = currentActiveImage.value.fotoSettings?.flipH || false;
  flipHRef.value = !currentValue;
  updateActiveImageSetting('flipH', !currentValue);
}

function onFlipVertical() {
  if (!currentActiveImage.value) return;
  const currentValue = currentActiveImage.value.fotoSettings?.flipV || false;
  flipVRef.value = !currentValue;
  updateActiveImageSetting('flipV', !currentValue);
}

// ✨ NEU: Schatten-Handler
function onShadowColorChange(event) {
  const value = event.target.value;
  shadowColorTextRef.value.value = value;
  updateActiveImageSetting('shadowColor', value);
}

function onShadowColorTextChange(event) {
  const value = event.target.value;
  shadowColorInputRef.value.value = value;
  updateActiveImageSetting('shadowColor', value);
}

function onShadowBlurChange(event) {
  const value = parseInt(event.target.value);
  shadowBlurValueRef.value.textContent = value + 'px';
  updateActiveImageSetting('shadowBlur', value);
}

function onShadowOffsetXChange(event) {
  const value = parseInt(event.target.value);
  shadowOffsetXValueRef.value.textContent = value + 'px';
  updateActiveImageSetting('shadowOffsetX', value);
}

function onShadowOffsetYChange(event) {
  const value = parseInt(event.target.value);
  shadowOffsetYValueRef.value.textContent = value + 'px';
  updateActiveImageSetting('shadowOffsetY', value);
}

function onRotationChange(event) {
  const sliderValue = parseInt(event.target.value);
  // Umrechnung: Slider 0-100 → Rotation -180° bis +180°
  // Slider 0 = -180°, Slider 50 = 0°, Slider 100 = +180°
  const actualRotation = (sliderValue - 50) * 3.6;
  rotationValueRef.value.textContent = Math.round(actualRotation) + '°';
  updateActiveImageSetting('rotation', actualRotation);
}

// ✨ NEU: Bildkontur-Handler
function onBorderColorChange(event) {
  const value = event.target.value;
  borderColorTextRef.value.value = value;
  updateActiveImageSetting('borderColor', value);
}

function onBorderColorTextChange(event) {
  const value = event.target.value;
  borderColorInputRef.value.value = value;
  updateActiveImageSetting('borderColor', value);
}

function onBorderWidthChange(event) {
  const value = parseInt(event.target.value);
  borderWidthValueRef.value.textContent = value + 'px';
  updateActiveImageSetting('borderWidth', value);
}

function onBorderOpacityChange(event) {
  const value = parseInt(event.target.value);
  borderOpacityValueRef.value.textContent = value + '%';
  updateActiveImageSetting('borderOpacity', value);
}

// ═══════════════════════════════════════════════════════════════════
// ✨ AUDIO-REAKTIV FUNKTIONEN (MEHRFACHAUSWAHL)
// ═══════════════════════════════════════════════════════════════════

/**
 * Master-Toggle für Audio-Reaktiv
 */
function onAudioReactiveToggle(event) {
  const enabled = event.target.checked;
  updateAudioReactiveSetting('enabled', enabled);

  if (enabled) {
    startAudioLevelIndicator();
  } else {
    stopAudioLevelIndicator();
  }
}

/**
 * Audio-Quelle ändern (global für alle Effekte)
 */
function onAudioReactiveSourceChange(event) {
  updateAudioReactiveSetting('source', event.target.value);
}

/**
 * Glättung ändern (global für alle Effekte)
 */
function onAudioReactiveSmoothingChange(event) {
  const value = parseInt(event.target.value);
  audioReactiveSmoothingValueRef.value.textContent = value + '%';
  updateAudioReactiveSetting('smoothing', value);
}

/**
 * Effekt ein-/ausschalten
 */
function onEffectToggle(effectName, enabled) {
  if (!currentActiveImage.value) return;

  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;

  // Initialisiere audioReactive falls nicht vorhanden
  fotoManager.initializeImageSettings(currentActiveImage.value);

  const audioReactive = currentActiveImage.value.fotoSettings.audioReactive;
  if (audioReactive.effects && audioReactive.effects[effectName]) {
    audioReactive.effects[effectName].enabled = enabled;
    console.log('🎵 Effekt:', effectName, '=', enabled);
  }
}

/**
 * Effekt-Intensität ändern
 */
function onEffectIntensityChange(effectName, value) {
  if (!currentActiveImage.value) return;

  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;

  // Initialisiere audioReactive falls nicht vorhanden
  fotoManager.initializeImageSettings(currentActiveImage.value);

  const audioReactive = currentActiveImage.value.fotoSettings.audioReactive;
  if (audioReactive.effects && audioReactive.effects[effectName]) {
    audioReactive.effects[effectName].intensity = parseInt(value);
  }

  // UI Update
  const valueRef = getEffectValueRef(effectName);
  if (valueRef && valueRef.value) {
    valueRef.value.textContent = value + '%';
  }
}

/**
 * Hilfsfunktion: Gibt die Value-Ref für einen Effekt zurück
 */
function getEffectValueRef(effectName) {
  switch (effectName) {
    case 'hue': return effectHueValueRef;
    case 'brightness': return effectBrightnessValueRef;
    case 'saturation': return effectSaturationValueRef;
    case 'scale': return effectScaleValueRef;
    case 'glow': return effectGlowValueRef;
    case 'border': return effectBorderValueRef;
    case 'blur': return effectBlurValueRef;
    case 'rotation': return effectRotationValueRef;
    case 'shake': return effectShakeValueRef;
    case 'bounce': return effectBounceValueRef;
    case 'swing': return effectSwingValueRef;
    case 'orbit': return effectOrbitValueRef;
    // ✨ NEUE EFFEKTE
    case 'contrast': return effectContrastValueRef;
    case 'grayscale': return effectGrayscaleValueRef;
    case 'sepia': return effectSepiaValueRef;
    case 'invert': return effectInvertValueRef;
    case 'skew': return effectSkewValueRef;
    case 'strobe': return effectStrobeValueRef;
    case 'chromatic': return effectChromaticValueRef;
    case 'perspective': return effectPerspectiveValueRef;
    default: return null;
  }
}

/**
 * Aktualisiert eine Audio-Reaktiv Master-Einstellung für das aktive Bild
 */
function updateAudioReactiveSetting(property, value) {
  if (!currentActiveImage.value) return;

  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;

  // Initialisiere audioReactive falls nicht vorhanden
  fotoManager.initializeImageSettings(currentActiveImage.value);

  currentActiveImage.value.fotoSettings.audioReactive[property] = value;
  console.log('🎵 Audio-Reaktiv:', property, '=', value);
}

/**
 * ✨ NEU: Speichert die aktuellen Audio-Reaktiv Einstellungen
 */
function saveAudioReactiveSettings() {
  if (!currentActiveImage.value) {
    console.warn('⚠️ Kein aktives Bild zum Speichern');
    return;
  }

  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;

  // Initialisiere falls nicht vorhanden
  fotoManager.initializeImageSettings(currentActiveImage.value);

  const audioReactive = currentActiveImage.value.fotoSettings.audioReactive;

  // Deep Copy der Einstellungen
  savedAudioReactiveSettings.value = JSON.parse(JSON.stringify(audioReactive));

  // In localStorage speichern für Persistenz
  try {
    localStorage.setItem('visualizer_audioReactivePreset', JSON.stringify(audioReactive));
    console.log('💾 Audio-Reaktiv Einstellungen gespeichert:', savedAudioReactiveSettings.value);
  } catch (e) {
    console.warn('⚠️ Konnte nicht in localStorage speichern:', e);
  }
}

/**
 * ✨ NEU: Wendet gespeicherte Audio-Reaktiv Einstellungen auf das aktuelle Bild an
 */
function applyAudioReactiveSettings() {
  if (!currentActiveImage.value) {
    console.warn('⚠️ Kein aktives Bild zum Anwenden');
    return;
  }

  if (!savedAudioReactiveSettings.value) {
    console.warn('⚠️ Keine gespeicherten Einstellungen vorhanden');
    return;
  }

  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;

  // Initialisiere falls nicht vorhanden
  fotoManager.initializeImageSettings(currentActiveImage.value);

  // Deep Copy der gespeicherten Einstellungen anwenden
  const settings = JSON.parse(JSON.stringify(savedAudioReactiveSettings.value));
  currentActiveImage.value.fotoSettings.audioReactive = settings;

  console.log('📋 Audio-Reaktiv Einstellungen angewendet:', settings);

  // UI aktualisieren
  loadAudioReactiveSettingsToUI();
}

/**
 * ✨ NEU: Lädt Audio-Reaktiv Einstellungen in die UI
 */
function loadAudioReactiveSettingsToUI() {
  if (!currentActiveImage.value) return;

  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;

  fotoManager.initializeImageSettings(currentActiveImage.value);
  const audioReactive = currentActiveImage.value.fotoSettings.audioReactive;

  // Master-Einstellungen
  if (audioReactiveEnabledRef.value) {
    audioReactiveEnabledRef.value.checked = audioReactive.enabled || false;
    if (audioReactive.enabled) {
      startAudioLevelIndicator();
    } else {
      stopAudioLevelIndicator();
    }
  }

  if (audioReactiveSourceRef.value) {
    audioReactiveSourceRef.value.value = audioReactive.source || 'bass';
  }

  if (audioReactiveSmoothingRef.value) {
    const smoothing = audioReactive.smoothing ?? 50;
    audioReactiveSmoothingRef.value.value = smoothing;
    if (audioReactiveSmoothingValueRef.value) {
      audioReactiveSmoothingValueRef.value.textContent = smoothing + '%';
    }
  }

  // Alle Effekte laden
  const effects = audioReactive.effects || {};
  const effectNames = ['hue', 'brightness', 'saturation', 'scale', 'glow', 'border', 'blur', 'rotation', 'shake', 'bounce', 'swing', 'orbit',
    // ✨ NEUE EFFEKTE
    'contrast', 'grayscale', 'sepia', 'invert', 'skew', 'strobe', 'chromatic', 'perspective'];

  effectNames.forEach(effectName => {
    const effect = effects[effectName] || { enabled: false, intensity: 80 };
    const enabledRef = getEffectEnabledRef(effectName);
    const intensityRef = getEffectIntensityRef(effectName);
    const valueRef = getEffectValueRef(effectName);

    if (enabledRef?.value) {
      enabledRef.value.checked = effect.enabled || false;
    }
    if (intensityRef?.value) {
      intensityRef.value.value = effect.intensity ?? 80;
    }
    if (valueRef?.value) {
      valueRef.value.textContent = (effect.intensity ?? 80) + '%';
    }
  });
}

/**
 * ✨ NEU: Hilfsfunktion für Effekt-Enabled-Refs
 */
function getEffectEnabledRef(effectName) {
  switch (effectName) {
    case 'hue': return effectHueEnabledRef;
    case 'brightness': return effectBrightnessEnabledRef;
    case 'saturation': return effectSaturationEnabledRef;
    case 'scale': return effectScaleEnabledRef;
    case 'glow': return effectGlowEnabledRef;
    case 'border': return effectBorderEnabledRef;
    case 'blur': return effectBlurEnabledRef;
    case 'rotation': return effectRotationEnabledRef;
    case 'shake': return effectShakeEnabledRef;
    case 'bounce': return effectBounceEnabledRef;
    case 'swing': return effectSwingEnabledRef;
    case 'orbit': return effectOrbitEnabledRef;
    // ✨ NEUE EFFEKTE
    case 'contrast': return effectContrastEnabledRef;
    case 'grayscale': return effectGrayscaleEnabledRef;
    case 'sepia': return effectSepiaEnabledRef;
    case 'invert': return effectInvertEnabledRef;
    case 'skew': return effectSkewEnabledRef;
    case 'strobe': return effectStrobeEnabledRef;
    case 'chromatic': return effectChromaticEnabledRef;
    case 'perspective': return effectPerspectiveEnabledRef;
    default: return null;
  }
}

/**
 * ✨ NEU: Hilfsfunktion für Effekt-Intensity-Refs
 */
function getEffectIntensityRef(effectName) {
  switch (effectName) {
    case 'hue': return effectHueIntensityRef;
    case 'brightness': return effectBrightnessIntensityRef;
    case 'saturation': return effectSaturationIntensityRef;
    case 'scale': return effectScaleIntensityRef;
    case 'glow': return effectGlowIntensityRef;
    case 'border': return effectBorderIntensityRef;
    case 'blur': return effectBlurIntensityRef;
    case 'rotation': return effectRotationIntensityRef;
    case 'shake': return effectShakeIntensityRef;
    case 'bounce': return effectBounceIntensityRef;
    case 'swing': return effectSwingIntensityRef;
    case 'orbit': return effectOrbitIntensityRef;
    // ✨ NEUE EFFEKTE
    case 'contrast': return effectContrastIntensityRef;
    case 'grayscale': return effectGrayscaleIntensityRef;
    case 'sepia': return effectSepiaIntensityRef;
    case 'invert': return effectInvertIntensityRef;
    case 'skew': return effectSkewIntensityRef;
    case 'strobe': return effectStrobeIntensityRef;
    case 'chromatic': return effectChromaticIntensityRef;
    case 'perspective': return effectPerspectiveIntensityRef;
    default: return null;
  }
}

/**
 * Startet die Audio-Level Anzeige Animation
 */
function startAudioLevelIndicator() {
  if (audioLevelAnimationId) return;

  function updateLevel() {
    if (!audioLevelBarRef.value) {
      audioLevelAnimationId = null;
      return;
    }

    const audioData = window.audioAnalysisData;
    if (!audioData) {
      audioLevelAnimationId = requestAnimationFrame(updateLevel);
      return;
    }

    // Hole die aktuelle Audio-Quelle
    const source = audioReactiveSourceRef.value?.value || 'bass';
    let level = 0;

    switch (source) {
      case 'bass': level = audioData.smoothBass; break;
      case 'mid': level = audioData.smoothMid; break;
      case 'treble': level = audioData.smoothTreble; break;
      case 'volume': level = audioData.smoothVolume; break;
    }

    // Level auf 0-100% normalisieren
    const percent = Math.min(100, (level / 255) * 100);
    audioLevelBarRef.value.style.width = percent + '%';

    // Farbe basierend auf Level
    if (percent > 70) {
      audioLevelBarRef.value.style.background = 'linear-gradient(90deg, #4ade80, #fbbf24, #ef4444)';
    } else if (percent > 40) {
      audioLevelBarRef.value.style.background = 'linear-gradient(90deg, #4ade80, #fbbf24)';
    } else {
      audioLevelBarRef.value.style.background = '#4ade80';
    }

    audioLevelAnimationId = requestAnimationFrame(updateLevel);
  }

  updateLevel();
}

/**
 * Stoppt die Audio-Level Anzeige Animation
 */
function stopAudioLevelIndicator() {
  if (audioLevelAnimationId) {
    cancelAnimationFrame(audioLevelAnimationId);
    audioLevelAnimationId = null;
  }
  if (audioLevelBarRef.value) {
    audioLevelBarRef.value.style.width = '0%';
  }
}

/**
 * Lädt Audio-Reaktiv Einstellungen in die UI
 */
function loadAudioReactiveSettings(imageData) {
  // Hilfsfunktion zum Laden eines Effekts
  const loadEffect = (effectName, checkboxRef, sliderRef, valueRef, defaultIntensity = 80) => {
    const effectData = imageData?.fotoSettings?.audioReactive?.effects?.[effectName];
    const enabled = effectData?.enabled || false;
    const intensity = effectData?.intensity ?? defaultIntensity;

    if (checkboxRef?.value) checkboxRef.value.checked = enabled;
    if (sliderRef?.value) sliderRef.value.value = intensity;
    if (valueRef?.value) valueRef.value.textContent = intensity + '%';
  };

  if (!imageData?.fotoSettings?.audioReactive) {
    // Standardwerte setzen
    if (audioReactiveEnabledRef.value) audioReactiveEnabledRef.value.checked = false;
    if (audioReactiveSourceRef.value) audioReactiveSourceRef.value.value = 'bass';
    if (audioReactiveSmoothingRef.value) audioReactiveSmoothingRef.value.value = 50;
    if (audioReactiveSmoothingValueRef.value) audioReactiveSmoothingValueRef.value.textContent = '50%';

    // Alle Effekte auf Standard
    loadEffect('hue', effectHueEnabledRef, effectHueIntensityRef, effectHueValueRef);
    loadEffect('brightness', effectBrightnessEnabledRef, effectBrightnessIntensityRef, effectBrightnessValueRef);
    loadEffect('saturation', effectSaturationEnabledRef, effectSaturationIntensityRef, effectSaturationValueRef);
    loadEffect('scale', effectScaleEnabledRef, effectScaleIntensityRef, effectScaleValueRef);
    loadEffect('glow', effectGlowEnabledRef, effectGlowIntensityRef, effectGlowValueRef);
    loadEffect('border', effectBorderEnabledRef, effectBorderIntensityRef, effectBorderValueRef);
    loadEffect('blur', effectBlurEnabledRef, effectBlurIntensityRef, effectBlurValueRef, 50);
    loadEffect('rotation', effectRotationEnabledRef, effectRotationIntensityRef, effectRotationValueRef, 50);
    loadEffect('shake', effectShakeEnabledRef, effectShakeIntensityRef, effectShakeValueRef, 50);
    loadEffect('bounce', effectBounceEnabledRef, effectBounceIntensityRef, effectBounceValueRef, 50);
    loadEffect('swing', effectSwingEnabledRef, effectSwingIntensityRef, effectSwingValueRef, 50);
    loadEffect('orbit', effectOrbitEnabledRef, effectOrbitIntensityRef, effectOrbitValueRef, 50);
    // ✨ NEUE EFFEKTE
    loadEffect('contrast', effectContrastEnabledRef, effectContrastIntensityRef, effectContrastValueRef, 60);
    loadEffect('grayscale', effectGrayscaleEnabledRef, effectGrayscaleIntensityRef, effectGrayscaleValueRef, 80);
    loadEffect('sepia', effectSepiaEnabledRef, effectSepiaIntensityRef, effectSepiaValueRef, 70);
    loadEffect('invert', effectInvertEnabledRef, effectInvertIntensityRef, effectInvertValueRef, 50);
    loadEffect('skew', effectSkewEnabledRef, effectSkewIntensityRef, effectSkewValueRef, 40);
    loadEffect('strobe', effectStrobeEnabledRef, effectStrobeIntensityRef, effectStrobeValueRef, 70);
    loadEffect('chromatic', effectChromaticEnabledRef, effectChromaticIntensityRef, effectChromaticValueRef, 60);
    loadEffect('perspective', effectPerspectiveEnabledRef, effectPerspectiveIntensityRef, effectPerspectiveValueRef, 50);

    stopAudioLevelIndicator();
    return;
  }

  const ar = imageData.fotoSettings.audioReactive;

  // Master-Einstellungen
  if (audioReactiveEnabledRef.value) audioReactiveEnabledRef.value.checked = ar.enabled || false;
  if (audioReactiveSourceRef.value) audioReactiveSourceRef.value.value = ar.source || 'bass';
  if (audioReactiveSmoothingRef.value) audioReactiveSmoothingRef.value.value = ar.smoothing || 50;
  if (audioReactiveSmoothingValueRef.value) audioReactiveSmoothingValueRef.value.textContent = (ar.smoothing || 50) + '%';

  // Individuelle Effekte laden
  loadEffect('hue', effectHueEnabledRef, effectHueIntensityRef, effectHueValueRef);
  loadEffect('brightness', effectBrightnessEnabledRef, effectBrightnessIntensityRef, effectBrightnessValueRef);
  loadEffect('saturation', effectSaturationEnabledRef, effectSaturationIntensityRef, effectSaturationValueRef);
  loadEffect('scale', effectScaleEnabledRef, effectScaleIntensityRef, effectScaleValueRef);
  loadEffect('glow', effectGlowEnabledRef, effectGlowIntensityRef, effectGlowValueRef);
  loadEffect('border', effectBorderEnabledRef, effectBorderIntensityRef, effectBorderValueRef);
  loadEffect('blur', effectBlurEnabledRef, effectBlurIntensityRef, effectBlurValueRef, 50);
  loadEffect('rotation', effectRotationEnabledRef, effectRotationIntensityRef, effectRotationValueRef, 50);
  loadEffect('shake', effectShakeEnabledRef, effectShakeIntensityRef, effectShakeValueRef, 50);
  loadEffect('bounce', effectBounceEnabledRef, effectBounceIntensityRef, effectBounceValueRef, 50);
  loadEffect('swing', effectSwingEnabledRef, effectSwingIntensityRef, effectSwingValueRef, 50);
  loadEffect('orbit', effectOrbitEnabledRef, effectOrbitIntensityRef, effectOrbitValueRef, 50);
  // ✨ NEUE EFFEKTE
  loadEffect('contrast', effectContrastEnabledRef, effectContrastIntensityRef, effectContrastValueRef, 60);
  loadEffect('grayscale', effectGrayscaleEnabledRef, effectGrayscaleIntensityRef, effectGrayscaleValueRef, 80);
  loadEffect('sepia', effectSepiaEnabledRef, effectSepiaIntensityRef, effectSepiaValueRef, 70);
  loadEffect('invert', effectInvertEnabledRef, effectInvertIntensityRef, effectInvertValueRef, 50);
  loadEffect('skew', effectSkewEnabledRef, effectSkewIntensityRef, effectSkewValueRef, 40);
  loadEffect('strobe', effectStrobeEnabledRef, effectStrobeIntensityRef, effectStrobeValueRef, 70);
  loadEffect('chromatic', effectChromaticEnabledRef, effectChromaticIntensityRef, effectChromaticValueRef, 60);
  loadEffect('perspective', effectPerspectiveEnabledRef, effectPerspectiveIntensityRef, effectPerspectiveValueRef, 50);

  if (ar.enabled) {
    startAudioLevelIndicator();
  } else {
    stopAudioLevelIndicator();
  }
}

function onPresetChange(event) {
  const presetId = event.target.value;

  if (!currentActiveImage.value) {
    console.warn('⚠️ Kein aktives Bild für Preset');
    return;
  }

  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) {
    console.warn('⚠️ FotoManager nicht verfügbar');
    return;
  }

  if (presetId === '') {
    // "Kein Filter" ausgewählt - Reset auf Standardwerte (aber Kontur beibehalten)
    fotoManager.applyPreset(currentActiveImage.value, 'normal');
  } else {
    // Preset anwenden (Kontur wird automatisch beibehalten)
    fotoManager.applyPreset(currentActiveImage.value, presetId);
  }

  // UI mit den neuen Werten aktualisieren
  loadImageSettings(currentActiveImage.value);

  console.log('🎨 Preset angewendet:', presetId || 'normal');
}

function resetFilters() {
  brightnessInputRef.value.value = 100;
  brightnessValueRef.value.textContent = '100%';
  contrastInputRef.value.value = 100;
  contrastValueRef.value.textContent = '100%';
  saturationInputRef.value.value = 100;
  saturationValueRef.value.textContent = '100%';
  opacityInputRef.value.value = 100;
  opacityValueRef.value.textContent = '100%';
  blurInputRef.value.value = 0;
  blurValueRef.value.textContent = '0px';

  // ✨ Farbton zurücksetzen
  hueRotateInputRef.value.value = 0;
  hueRotateValueRef.value.textContent = '0°';

  // ✨ Schatten zurücksetzen
  shadowColorInputRef.value.value = '#000000';
  shadowColorTextRef.value.value = '#000000';
  shadowBlurInputRef.value.value = 0;
  shadowBlurValueRef.value.textContent = '0px';
  shadowOffsetXInputRef.value.value = 0;
  shadowOffsetXValueRef.value.textContent = '0px';
  shadowOffsetYInputRef.value.value = 0;
  shadowOffsetYValueRef.value.textContent = '0px';
  
  // ✨ Rotation zurücksetzen (Slider auf Mitte = 50 = 0°)
  rotationInputRef.value.value = 50;
  rotationValueRef.value.textContent = '0°';

  // ✨ Flip zurücksetzen
  flipHRef.value = false;
  flipVRef.value = false;

  // ✨ Bildkontur zurücksetzen
  borderColorInputRef.value.value = '#ffffff';
  borderColorTextRef.value.value = '#ffffff';
  borderWidthInputRef.value.value = 0;
  borderWidthValueRef.value.textContent = '0px';
  borderOpacityInputRef.value.value = 100;
  borderOpacityValueRef.value.textContent = '100%';

  presetSelectRef.value.value = '';
  
  if (currentActiveImage.value) {
    // ✨ WICHTIG: Nutze fotoSettings statt settings (für FotoManager Kompatibilität)
    if (!currentActiveImage.value.fotoSettings) {
      currentActiveImage.value.fotoSettings = {};
    }
    
    currentActiveImage.value.fotoSettings.brightness = 100;
    currentActiveImage.value.fotoSettings.contrast = 100;
    currentActiveImage.value.fotoSettings.saturation = 100;
    currentActiveImage.value.fotoSettings.opacity = 100;
    currentActiveImage.value.fotoSettings.blur = 0;
    currentActiveImage.value.fotoSettings.hueRotate = 0;
    currentActiveImage.value.fotoSettings.grayscale = 0;
    currentActiveImage.value.fotoSettings.sepia = 0;
    currentActiveImage.value.fotoSettings.invert = 0;
    
    // ✨ Schatten und Rotation zurücksetzen
    currentActiveImage.value.fotoSettings.shadowColor = '#000000';
    currentActiveImage.value.fotoSettings.shadowBlur = 0;
    currentActiveImage.value.fotoSettings.shadowOffsetX = 0;
    currentActiveImage.value.fotoSettings.shadowOffsetY = 0;
    currentActiveImage.value.fotoSettings.rotation = 0;

    // ✨ Flip zurücksetzen
    currentActiveImage.value.fotoSettings.flipH = false;
    currentActiveImage.value.fotoSettings.flipV = false;

    // ✨ Bildkontur zurücksetzen
    currentActiveImage.value.fotoSettings.borderColor = '#ffffff';
    currentActiveImage.value.fotoSettings.borderWidth = 0;
    currentActiveImage.value.fotoSettings.borderOpacity = 100;

    triggerRedraw();
  }
}

// ✨ NEU: Aktualisiert die Einstellungen des aktiven Bildes
function updateActiveImageSetting(property, value) {
  if (!currentActiveImage.value) {
    console.warn('⚠️ Kein aktives Bild zum Anwenden der Filter');
    return;
  }
  
  const imgData = currentActiveImage.value;
  
  // ✨ WICHTIG: Nutze fotoSettings statt settings (für FotoManager Kompatibilität)
  if (!imgData.fotoSettings) {
    imgData.fotoSettings = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      opacity: 100,
      blur: 0,
      hueRotate: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
      // ✨ Schatten und Rotation
      shadowColor: '#000000',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      rotation: 0,
      // ✨ Spiegeln
      flipH: false,
      flipV: false,
      // ✨ Bildkontur
      borderColor: '#ffffff',
      borderWidth: 0,
      borderOpacity: 100
    };
  }
  
  imgData.fotoSettings[property] = value;
  
  console.log(`✏️ Filter aktualisiert: ${property} = ${value}`, imgData.fotoSettings);
  
  // Redraw triggern
  triggerRedraw();
}

// ✨ NEU: Lädt die Einstellungen eines Bildes in die UI
function loadImageSettings(imgData) {
  if (!imgData) {
    console.warn('⚠️ Keine Bilddaten zum Laden');
    return;
  }
  
  // ✨ WICHTIG: Nutze fotoSettings statt settings (für FotoManager Kompatibilität)
  const s = imgData.fotoSettings || imgData.settings || {};
  
  brightnessInputRef.value.value = s.brightness || 100;
  brightnessValueRef.value.textContent = (s.brightness || 100) + '%';
  
  contrastInputRef.value.value = s.contrast || 100;
  contrastValueRef.value.textContent = (s.contrast || 100) + '%';
  
  saturationInputRef.value.value = s.saturation || 100;
  saturationValueRef.value.textContent = (s.saturation || 100) + '%';
  
  opacityInputRef.value.value = s.opacity || 100;
  opacityValueRef.value.textContent = (s.opacity || 100) + '%';
  
  blurInputRef.value.value = s.blur || 0;
  blurValueRef.value.textContent = (s.blur || 0) + 'px';

  // ✨ Farbton laden
  hueRotateInputRef.value.value = s.hueRotate || 0;
  hueRotateValueRef.value.textContent = (s.hueRotate || 0) + '°';

  // ✨ Schatten und Rotation laden
  shadowColorInputRef.value.value = s.shadowColor || '#000000';
  shadowColorTextRef.value.value = s.shadowColor || '#000000';
  
  shadowBlurInputRef.value.value = s.shadowBlur || 0;
  shadowBlurValueRef.value.textContent = (s.shadowBlur || 0) + 'px';
  
  shadowOffsetXInputRef.value.value = s.shadowOffsetX || 0;
  shadowOffsetXValueRef.value.textContent = (s.shadowOffsetX || 0) + 'px';
  
  shadowOffsetYInputRef.value.value = s.shadowOffsetY || 0;
  shadowOffsetYValueRef.value.textContent = (s.shadowOffsetY || 0) + 'px';
  
  // ✨ Rotation: Umrechnung von tatsächlicher Rotation (-180° bis +180°) zu Slider-Wert (0-100)
  const rotation = s.rotation || 0;
  const sliderValue = Math.round((rotation / 3.6) + 50);
  rotationInputRef.value.value = sliderValue;
  rotationValueRef.value.textContent = Math.round(rotation) + '°';

  // ✨ Flip laden
  flipHRef.value = s.flipH || false;
  flipVRef.value = s.flipV || false;

  // ✨ Bildkontur laden
  borderColorInputRef.value.value = s.borderColor || '#ffffff';
  borderColorTextRef.value.value = s.borderColor || '#ffffff';
  borderWidthInputRef.value.value = s.borderWidth || 0;
  borderWidthValueRef.value.textContent = (s.borderWidth || 0) + 'px';
  borderOpacityInputRef.value.value = s.borderOpacity ?? 100;
  borderOpacityValueRef.value.textContent = (s.borderOpacity ?? 100) + '%';

  presetSelectRef.value.value = s.preset || '';

  // ✨ Audio-Reaktiv Einstellungen laden
  loadAudioReactiveSettings(imgData);

  console.log('📥 Filter-Einstellungen geladen:', s);
}

// ✨ NEU: Trigger einen Redraw
function triggerRedraw() {
  // Versuche über verschiedene Wege einen Redraw auszulösen
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(() => {
      // Die draw-Loop in App.vue läuft bereits
    });
  }
}

// Trigger File Input
function triggerFileInput() {
  fileInputRef.value?.click();
}

// ✨ ERWEITERT: Handle Image Upload (jetzt mit Multi-Upload)
function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // Jede Datei einzeln verarbeiten
  Array.from(files).forEach(file => {
    // Validierung
    if (!file.type.startsWith('image/')) {
      console.warn('Überspringe Nicht-Bild-Datei:', file.name);
      return;
    }

    // Bild laden
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Zur Galerie hinzufügen
        const imageData = {
          id: Date.now() + Math.random(), // Eindeutige ID
          img: img,
          name: file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name,
          dimensions: `${img.width}×${img.height}`,
          size: formatFileSize(file.size)
        };
        
        imageGallery.value.push(imageData);

        // Automatisch das erste Bild auswählen (wenn Galerie vorher leer war)
        if (imageGallery.value.length === 1) {
          selectedImageIndex.value = 0;
          selectedImageIndices.value = new Set([0]);
          lastSelectedImageIndex.value = 0;
        }

        console.log('✅ Bild zur Galerie hinzugefügt:', imageData.name, imageData.dimensions);
      };
      img.onerror = () => {
        alert(`Fehler beim Laden des Bildes: ${file.name}`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Input zurücksetzen für erneutes Hochladen
  event.target.value = '';
}

// ✨ NEU: Formatiere Dateigröße
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ✨ NEU: Bild aus Galerie auswählen (mit Mehrfachauswahl-Unterstützung)
function selectImage(index, event = null) {
  const shiftKey = event?.shiftKey || false;
  const ctrlKey = event?.ctrlKey || event?.metaKey || false;

  if (shiftKey && lastSelectedImageIndex.value !== null) {
    // Shift+Click: Range-Selection
    const start = Math.min(lastSelectedImageIndex.value, index);
    const end = Math.max(lastSelectedImageIndex.value, index);

    // Wenn Ctrl nicht gehalten, erst alles deselektieren
    if (!ctrlKey) {
      selectedImageIndices.value.clear();
    }

    // Alle in der Range auswählen
    for (let i = start; i <= end; i++) {
      selectedImageIndices.value.add(i);
    }
    // Set neu erstellen für Reaktivität
    selectedImageIndices.value = new Set(selectedImageIndices.value);
    console.log(`📌 ${end - start + 1} Bilder ausgewählt (Range)`);
  } else if (ctrlKey) {
    // Ctrl+Click: Toggle einzelnes Bild
    if (selectedImageIndices.value.has(index)) {
      selectedImageIndices.value.delete(index);
    } else {
      selectedImageIndices.value.add(index);
    }
    // Set neu erstellen für Reaktivität
    selectedImageIndices.value = new Set(selectedImageIndices.value);
    lastSelectedImageIndex.value = index;
    console.log('📌 Bild getoggelt:', imageGallery.value[index].name);
  } else {
    // Normaler Click: Nur dieses Bild auswählen
    selectedImageIndices.value = new Set([index]);
    lastSelectedImageIndex.value = index;
    console.log('📌 Bild ausgewählt:', imageGallery.value[index].name);
  }

  // Abwärtskompatibilität: selectedImageIndex auf das zuletzt angeklickte setzen
  selectedImageIndex.value = index;
}

// ✨ NEU: Alle hochgeladenen Bilder auswählen
function selectAllImages() {
  const indices = imageGallery.value.map((_, index) => index);
  selectedImageIndices.value = new Set(indices);
  if (indices.length > 0) {
    selectedImageIndex.value = indices[0];
    lastSelectedImageIndex.value = indices[0];
  }
  console.log(`📌 Alle ${indices.length} Bilder ausgewählt`);
}

// ✨ NEU: Auswahl aller hochgeladenen Bilder aufheben
function deselectAllImages() {
  selectedImageIndices.value = new Set();
  selectedImageIndex.value = null;
  lastSelectedImageIndex.value = null;
  console.log('📌 Bildauswahl aufgehoben');
}

// ✨ NEU: Einzelnes Bild aus Galerie löschen
function deleteImage(index) {
  const deletedImage = imageGallery.value[index];
  imageGallery.value.splice(index, 1);

  // Mehrfachauswahl anpassen: Entferne gelöschten Index, verschiebe höhere Indices
  const newSelectedIndices = new Set();
  selectedImageIndices.value.forEach(i => {
    if (i < index) {
      newSelectedIndices.add(i);
    } else if (i > index) {
      newSelectedIndices.add(i - 1);
    }
    // i === index wird übersprungen (gelöscht)
  });
  selectedImageIndices.value = newSelectedIndices;

  // Abwärtskompatibilität: selectedImageIndex anpassen
  if (selectedImageIndex.value === index) {
    selectedImageIndex.value = imageGallery.value.length > 0 ? 0 : null;
  } else if (selectedImageIndex.value > index) {
    selectedImageIndex.value--;
  }

  // lastSelectedImageIndex anpassen
  if (lastSelectedImageIndex.value === index) {
    lastSelectedImageIndex.value = null;
  } else if (lastSelectedImageIndex.value > index) {
    lastSelectedImageIndex.value--;
  }

  console.log('🗑️ Bild gelöscht:', deletedImage.name);
}

// ✨ NEU: Alle Bilder löschen
function clearAllImages() {
  if (!confirm(`Alle ${imageGallery.value.length} Bilder aus der Galerie löschen?`)) {
    return;
  }

  imageGallery.value = [];
  selectedImageIndex.value = null;
  selectedImageIndices.value = new Set();
  lastSelectedImageIndex.value = null;
  console.log('🗑️ Galerie geleert');
}

// GEÄNDERT: Bilder auf Canvas platzieren - unterstützt Mehrfachauswahl
function addImageToCanvas() {
  const imagesToAdd = selectedImages.value;
  if (imagesToAdd.length === 0) return;

  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) {
    console.error('❌ MultiImageManager nicht verfügbar');
    return;
  }

  // Alle ausgewählten Bilder hinzufügen
  imagesToAdd.forEach((imgData, i) => {
    multiImageManager.addImage(imgData.img);
  });

  console.log(`✅ ${imagesToAdd.length} Bild(er) auf Canvas platziert`);

  // Auswahl zurücksetzen nach dem Hinzufügen
  deselectAllImages();
}

// Bild als Hintergrund setzen (nur bei Einzelauswahl)
function setAsBackground() {
  if (selectedImageCount.value !== 1) return;

  const imgToSet = selectedImages.value[0];
  if (!imgToSet) return;

  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) {
    console.error('❌ CanvasManager nicht verfügbar');
    return;
  }

  canvasManager.setBackground(imgToSet.img);
  console.log('✅ Bild als Hintergrund gesetzt:', imgToSet.name);
  // Auswahl zurücksetzen
  deselectAllImages();
}

// Bild als Workspace-Hintergrund setzen (nur bei Einzelauswahl)
function setAsWorkspaceBackground() {
  if (selectedImageCount.value !== 1) return;

  const imgToSet = selectedImages.value[0];
  if (!imgToSet) return;

  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) {
    console.error('❌ CanvasManager nicht verfügbar');
    return;
  }

  const success = canvasManager.setWorkspaceBackground(imgToSet.img);
  if (success) {
    console.log('✅ Bild als Workspace-Hintergrund gesetzt:', imgToSet.name);
    // Auswahl zurücksetzen
    deselectAllImages();
  } else {
    alert('⚠️ Bitte wählen Sie zuerst einen Social Media Workspace aus (z.B. TikTok, Instagram Story, etc.)');
  }
}

// ═══════════════════════════════════════════════════════════════════
// ✨ STOCK-GALERIE FUNKTIONEN
// ═══════════════════════════════════════════════════════════════════

// Fallback-Kategorien falls JSON nicht lädt
const FALLBACK_CATEGORIES = [
  { id: 'backgrounds', name: 'Hintergründe', name_en: 'Backgrounds', icon: '🎨', description: 'Farbverläufe und Hintergrundbilder' },
  { id: 'elements', name: 'Elemente', name_en: 'Elements', icon: '✨', description: 'Grafische Formen und Objekte' },
  { id: 'patterns', name: 'Muster', name_en: 'Patterns', icon: '🔲', description: 'Wiederholende Muster und Texturen' }
];

// Stock-Galerie Index laden (Modulare Struktur v2.0)
async function loadStockGallery() {
  stockImagesLoading.value = true;
  try {
    // Relativer Pfad für Kompatibilität mit Subpfaden (z.B. /visualizer/)
    const paths = ['gallery/gallery.json', './gallery/gallery.json'];
    let response = null;
    let lastError = null;

    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) break;
      } catch (e) {
        lastError = e;
      }
    }

    if (!response || !response.ok) {
      throw new Error(lastError?.message || 'Galerie konnte nicht geladen werden');
    }

    const data = await response.json();

    // Prüfen ob es die neue modulare Struktur ist (v2.0)
    if (data._version === '2.0' && data.categories) {
      stockCategories.value = data.categories || FALLBACK_CATEGORIES;

      // Standard-Kategorie auswählen und laden
      if (stockCategories.value.length > 0) {
        const firstCategory = stockCategories.value[0].id;
        selectedStockCategory.value = firstCategory;
        await loadCategoryImages(firstCategory);
      }

      console.log('✅ Stock-Galerie Index geladen (v2.0):', data.totalImages, 'Bilder total');
    } else {
      // Fallback für alte Struktur (v1.0)
      stockCategories.value = data.categories || FALLBACK_CATEGORIES;
      stockImages.value = data.images || [];

      if (stockCategories.value.length > 0) {
        selectedStockCategory.value = stockCategories.value[0].id;
      }

      console.log('✅ Stock-Galerie geladen (v1.0):', stockImages.value.length, 'Bilder');
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden der Stock-Galerie:', error);
    // Fallback: Zeige wenigstens die Kategorien
    stockCategories.value = FALLBACK_CATEGORIES;
    stockImages.value = [];
  } finally {
    stockImagesLoading.value = false;
  }
}

// Lädt die Bilder einer Kategorie (aus category.json)
async function loadCategoryImages(categoryId) {
  // Prüfen ob bereits im Cache
  if (loadedCategoryData.value.has(categoryId)) {
    stockImages.value = loadedCategoryData.value.get(categoryId);
    console.log(`📁 Kategorie "${categoryId}" aus Cache geladen:`, stockImages.value.length, 'Bilder');
    return;
  }

  categoryLoading.value = true;
  try {
    const categoryInfo = stockCategories.value.find(c => c.id === categoryId);
    if (!categoryInfo || !categoryInfo.jsonFile) {
      console.warn(`⚠️ Keine JSON-Datei für Kategorie "${categoryId}" gefunden`);
      stockImages.value = [];
      return;
    }

    const response = await fetch(categoryInfo.jsonFile);
    if (!response.ok) {
      throw new Error(`Kategorie ${categoryId} konnte nicht geladen werden`);
    }

    const data = await response.json();
    const images = data.images || [];

    // Im Cache speichern
    loadedCategoryData.value.set(categoryId, images);
    stockImages.value = images;

    console.log(`✅ Kategorie "${categoryId}" geladen:`, images.length, 'Bilder');
  } catch (error) {
    console.error(`❌ Fehler beim Laden der Kategorie "${categoryId}":`, error);
    stockImages.value = [];
  } finally {
    categoryLoading.value = false;
  }
}

// Kategorie auswählen und laden
async function selectStockCategory(categoryId) {
  selectedStockCategory.value = categoryId;
  selectedStockImage.value = null; // Auswahl zurücksetzen bei Kategorie-Wechsel
  selectedStockImages.value = new Set(); // Mehrfachauswahl auch zurücksetzen
  lastSelectedStockId.value = null;

  // Kategorie-Bilder laden (nutzt Cache wenn vorhanden)
  await loadCategoryImages(categoryId);

  console.log('📁 Kategorie ausgewählt:', categoryId);
}

// Stock-Bild auswählen (mit Mehrfachauswahl-Unterstützung)
function selectStockImage(img, event = null) {
  const shiftKey = event?.shiftKey || false;
  const ctrlKey = event?.ctrlKey || event?.metaKey || false;

  if (shiftKey && lastSelectedStockId.value !== null) {
    // Shift+Click: Range-Selection
    const currentImages = stockImages.value;
    const lastIndex = currentImages.findIndex(i => i.id === lastSelectedStockId.value);
    const currentIndex = currentImages.findIndex(i => i.id === img.id);

    if (lastIndex !== -1 && currentIndex !== -1) {
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);

      // Wenn Ctrl nicht gehalten, erst alles deselektieren
      if (!ctrlKey) {
        selectedStockImages.value.clear();
      }

      // Alle in der Range auswählen
      for (let i = start; i <= end; i++) {
        selectedStockImages.value.add(currentImages[i].id);
      }
      // Set neu erstellen für Reaktivität
      selectedStockImages.value = new Set(selectedStockImages.value);
      console.log(`📌 ${end - start + 1} Stock-Bilder ausgewählt (Range)`);
    }
  } else if (ctrlKey) {
    // Ctrl+Click: Toggle einzelnes Bild
    if (selectedStockImages.value.has(img.id)) {
      selectedStockImages.value.delete(img.id);
    } else {
      selectedStockImages.value.add(img.id);
    }
    // Set neu erstellen für Reaktivität
    selectedStockImages.value = new Set(selectedStockImages.value);
    lastSelectedStockId.value = img.id;
    console.log('📌 Stock-Bild getoggelt:', img.name);
  } else {
    // Normaler Click: Nur dieses Bild auswählen
    selectedStockImages.value = new Set([img.id]);
    lastSelectedStockId.value = img.id;
    console.log('📌 Stock-Bild ausgewählt:', img.name);
  }

  // Abwärtskompatibilität: selectedStockImage auf das angeklickte setzen
  selectedStockImage.value = img;
}

// ✨ NEU: Alle Stock-Bilder in der aktuellen Kategorie auswählen
function selectAllStockImages() {
  const allIds = stockImages.value.map(img => img.id);
  selectedStockImages.value = new Set(allIds);
  if (stockImages.value.length > 0) {
    selectedStockImage.value = stockImages.value[0];
    lastSelectedStockId.value = stockImages.value[0].id;
  }
  console.log(`📌 Alle ${allIds.length} Stock-Bilder ausgewählt`);
}

// ✨ NEU: Auswahl aller Stock-Bilder aufheben
function deselectAllStockImages() {
  selectedStockImages.value = new Set();
  selectedStockImage.value = null;
  lastSelectedStockId.value = null;
  console.log('📌 Stock-Bildauswahl aufgehoben');
}

// Stock-Bild als Image-Objekt laden (mit Caching)
async function loadStockImageObject(stockImg) {
  // Prüfen ob bereits im Cache
  if (loadedStockImages.value.has(stockImg.id)) {
    return loadedStockImages.value.get(stockImg.id);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      loadedStockImages.value.set(stockImg.id, img);
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`Bild konnte nicht geladen werden: ${stockImg.file}`));
    };
    img.src = stockImg.file;
  });
}

// Stock-Bilder auf Canvas platzieren - unterstützt Mehrfachauswahl
async function addStockImageToCanvas() {
  const imagesToAdd = selectedStockImagesList.value;
  if (imagesToAdd.length === 0) return;

  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) {
    console.error('❌ MultiImageManager nicht verfügbar');
    return;
  }

  try {
    // Alle ausgewählten Bilder laden und hinzufügen
    for (const stockImg of imagesToAdd) {
      const img = await loadStockImageObject(stockImg);
      multiImageManager.addImage(img);
    }

    console.log(`✅ ${imagesToAdd.length} Stock-Bild(er) auf Canvas platziert`);

    // Auswahl zurücksetzen nach dem Hinzufügen
    deselectAllStockImages();
  } catch (error) {
    console.error('❌ Fehler beim Laden der Stock-Bilder:', error);
    alert('Ein oder mehrere Bilder konnten nicht geladen werden.');
  }
}

// Stock-Bild als Hintergrund setzen (nur bei Einzelauswahl)
async function setStockAsBackground() {
  if (selectedStockCount.value !== 1) return;

  const stockImg = selectedStockImagesList.value[0];
  if (!stockImg) return;

  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) {
    console.error('❌ CanvasManager nicht verfügbar');
    return;
  }

  try {
    const img = await loadStockImageObject(stockImg);
    canvasManager.setBackground(img);
    console.log('✅ Stock-Bild als Hintergrund gesetzt:', stockImg.name);
    // Auswahl zurücksetzen
    deselectAllStockImages();
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error);
    alert('Das Bild konnte nicht geladen werden.');
  }
}

// Stock-Bild als Workspace-Hintergrund setzen (nur bei Einzelauswahl)
async function setStockAsWorkspaceBackground() {
  if (selectedStockCount.value !== 1) return;

  const stockImg = selectedStockImagesList.value[0];
  if (!stockImg) return;

  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) {
    console.error('❌ CanvasManager nicht verfügbar');
    return;
  }

  try {
    const img = await loadStockImageObject(stockImg);
    const success = canvasManager.setWorkspaceBackground(img);
    if (success) {
      console.log('✅ Stock-Bild als Workspace-Hintergrund gesetzt:', stockImg.name);
      // Auswahl zurücksetzen
      deselectAllStockImages();
    } else {
      alert('⚠️ Bitte wählen Sie zuerst einen Social Media Workspace aus (z.B. TikTok, Instagram Story, etc.)');
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error);
    alert('Das Bild konnte nicht geladen werden.');
  }
}

// ═══════════════════════════════════════════════════════════════════
// ✨ BEREICHSAUSWAHL MIT ANIMATION FUNKTIONEN
// ═══════════════════════════════════════════════════════════════════

/**
 * ✨ Startet die Bereichsauswahl für ein Stock-Bild
 */
async function startStockImageRangeSelection() {
  if (selectedStockCount.value !== 1) return;

  const stockImg = selectedStockImagesList.value[0];
  if (!stockImg) return;

  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) {
    console.error('❌ CanvasManager nicht verfügbar');
    return;
  }

  try {
    // Lade das Bild
    const img = await loadStockImageObject(stockImg);
    pendingRangeSelectionImage.value = img;
    pendingRangeSelectionType.value = 'stock';
    isInRangeSelectionMode.value = true;

    // Starte den Bereichsauswahl-Modus im CanvasManager
    canvasManager.startImageSelectionMode((bounds) => {
      handleRangeSelectionComplete(bounds);
    }, selectedAnimation.value);

    console.log('📐 Bereichsauswahl-Modus gestartet für Stock-Bild:', stockImg.name);
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error);
    alert('Das Bild konnte nicht geladen werden.');
    isInRangeSelectionMode.value = false;
  }
}

/**
 * ✨ Startet die Bereichsauswahl für ein hochgeladenes Bild
 */
function startUploadedImageRangeSelection() {
  if (selectedImageCount.value !== 1) return;

  const imgData = selectedImages.value[0];
  if (!imgData || !imgData.img) return;

  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) {
    console.error('❌ CanvasManager nicht verfügbar');
    return;
  }

  pendingRangeSelectionImage.value = imgData.img;
  pendingRangeSelectionType.value = 'uploaded';
  isInRangeSelectionMode.value = true;

  // Starte den Bereichsauswahl-Modus im CanvasManager
  canvasManager.startImageSelectionMode((bounds) => {
    handleRangeSelectionComplete(bounds);
  }, selectedAnimation.value);

  console.log('📐 Bereichsauswahl-Modus gestartet für hochgeladenes Bild:', imgData.name);
}

/**
 * ✨ Wird aufgerufen wenn die Bereichsauswahl abgeschlossen ist
 */
function handleRangeSelectionComplete(bounds) {
  if (!bounds || !pendingRangeSelectionImage.value) {
    console.log('❌ Bereichsauswahl abgebrochen oder ungültig');
    isInRangeSelectionMode.value = false;
    pendingRangeSelectionImage.value = null;
    pendingRangeSelectionType.value = null;
    return;
  }

  const multiImageManager = multiImageManagerRef?.value;
  const canvasManager = canvasManagerRef?.value;
  if (!multiImageManager || !canvasManager) {
    console.error('❌ Manager nicht verfügbar');
    isInRangeSelectionMode.value = false;
    return;
  }

  const canvas = canvasManager.canvas;
  const scale = imageScale.value;

  // X/Y sind jetzt Pixel-Werte, konvertiere zu relativen Werten
  const offsetX = imageOffsetX.value / canvas.width;
  const offsetY = imageOffsetY.value / canvas.height;

  const scaledBounds = {
    ...bounds,
    relWidth: bounds.relWidth * scale,
    relHeight: bounds.relHeight * scale,
    relX: bounds.relX + (bounds.relWidth * (1 - scale)) / 2 + offsetX,
    relY: bounds.relY + (bounds.relHeight * (1 - scale)) / 2 + offsetY
  };

  multiImageManager.addImageWithBounds(
    pendingRangeSelectionImage.value,
    scaledBounds,
    bounds.animation || selectedAnimation.value,
    { duration: animationDuration.value }
  );

  console.log('✅ Bild platziert:', {
    bounds: scaledBounds,
    animation: bounds.animation || selectedAnimation.value,
    duration: animationDuration.value
  });

  // Auswahl zurücksetzen
  if (pendingRangeSelectionType.value === 'stock') {
    deselectAllStockImages();
  } else if (pendingRangeSelectionType.value === 'uploaded') {
    deselectAllImages();
  }

  // Modus beenden
  isInRangeSelectionMode.value = false;
  pendingRangeSelectionImage.value = null;
  pendingRangeSelectionType.value = null;
}

/**
 * ✨ Bricht die Bereichsauswahl ab
 */
function cancelRangeSelection() {
  const canvasManager = canvasManagerRef?.value;
  if (canvasManager) {
    canvasManager.cancelImageSelectionMode();
  }

  isInRangeSelectionMode.value = false;
  pendingRangeSelectionImage.value = null;
  pendingRangeSelectionType.value = null;
  console.log('❌ Bereichsauswahl abgebrochen');
}

/**
 * ✨ Platziert ein Stock-Bild direkt an der konfigurierten X/Y-Position (in Pixel)
 */
async function addStockImageDirectly() {
  if (selectedStockCount.value !== 1) return;

  const stockImg = selectedStockImagesList.value[0];
  if (!stockImg) return;

  const multiImageManager = multiImageManagerRef?.value;
  const canvasManager = canvasManagerRef?.value;
  if (!multiImageManager || !canvasManager) {
    console.error('❌ Manager nicht verfügbar');
    return;
  }

  try {
    const img = await loadStockImageObject(stockImg);
    const canvas = canvasManager.canvas;

    // X/Y sind Pixel-Werte (-500 bis +500), 0 = Mitte
    // Konvertiere zu relativen Canvas-Koordinaten
    const relX = 0.5 + (imageOffsetX.value / canvas.width);
    const relY = 0.5 + (imageOffsetY.value / canvas.height);

    // Bildgröße basierend auf Scale (relativ zum Canvas)
    const baseSize = 0.15;
    const relSize = baseSize * imageScale.value;

    const bounds = {
      relX: relX - relSize / 2,
      relY: relY - relSize / 2,
      relWidth: relSize,
      relHeight: relSize
    };

    multiImageManager.addImageWithBounds(
      img,
      bounds,
      selectedAnimation.value,
      { duration: animationDuration.value }
    );

    console.log('✅ Stock-Bild platziert:', {
      name: stockImg.name,
      position: { x: imageOffsetX.value, y: imageOffsetY.value },
      scale: imageScale.value + 'x',
      animation: selectedAnimation.value,
      duration: animationDuration.value
    });

    deselectAllStockImages();
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error);
  }
}

/**
 * ✨ Platziert ein hochgeladenes Bild direkt an der konfigurierten X/Y-Position (in Pixel)
 */
function addUploadedImageDirectly() {
  if (selectedImageCount.value !== 1) return;

  const imgData = selectedImages.value[0];
  if (!imgData || !imgData.img) return;

  const multiImageManager = multiImageManagerRef?.value;
  const canvasManager = canvasManagerRef?.value;
  if (!multiImageManager || !canvasManager) {
    console.error('❌ Manager nicht verfügbar');
    return;
  }

  const canvas = canvasManager.canvas;

  // X/Y sind Pixel-Werte (-500 bis +500), 0 = Mitte
  const relX = 0.5 + (imageOffsetX.value / canvas.width);
  const relY = 0.5 + (imageOffsetY.value / canvas.height);

  // Bildgröße basierend auf Scale
  const baseSize = 0.15;
  const relSize = baseSize * imageScale.value;

  const bounds = {
    relX: relX - relSize / 2,
    relY: relY - relSize / 2,
    relWidth: relSize,
    relHeight: relSize
  };

  multiImageManager.addImageWithBounds(
    imgData.img,
    bounds,
    selectedAnimation.value,
    { duration: animationDuration.value }
  );

  console.log('✅ Bild platziert:', {
    name: imgData.name,
    position: { x: imageOffsetX.value, y: imageOffsetY.value },
    scale: imageScale.value + 'x',
    animation: selectedAnimation.value,
    duration: animationDuration.value
  });

  deselectAllImages();
}

// ═══════════════════════════════════════════════════════════════════
// ✨ BILD-VORSCHAU FUNKTIONEN
// ═══════════════════════════════════════════════════════════════════

// Vorschau für Stock-Bild öffnen (Doppelklick)
async function openStockPreview(img) {
  try {
    const loadedImg = await loadStockImageObject(img);
    previewImage.value = {
      src: loadedImg.src,
      name: img.name,
      type: 'stock',
      data: img
    };
    console.log('🔍 Vorschau geöffnet:', img.name);
  } catch (error) {
    console.error('❌ Fehler beim Laden der Vorschau:', error);
  }
}

// Vorschau für hochgeladenes Bild öffnen (Doppelklick)
function openUploadedPreview(imgData) {
  previewImage.value = {
    src: imgData.img.src,
    name: imgData.name,
    type: 'uploaded',
    data: imgData
  };
  console.log('🔍 Vorschau geöffnet:', imgData.name);
}

// Vorschau schließen
function closePreview() {
  previewImage.value = null;
}

// Bild aus Vorschau auf Canvas platzieren
async function addPreviewToCanvas() {
  if (!previewImage.value) return;

  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) {
    console.error('❌ MultiImageManager nicht verfügbar');
    return;
  }

  if (previewImage.value.type === 'stock') {
    const img = await loadStockImageObject(previewImage.value.data);
    multiImageManager.addImage(img);
  } else {
    multiImageManager.addImage(previewImage.value.data.img);
  }

  console.log('✅ Bild aus Vorschau auf Canvas platziert:', previewImage.value.name);
  closePreview();
}

// Bild aus Vorschau als Hintergrund setzen
async function setPreviewAsBackground() {
  if (!previewImage.value) return;

  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) {
    console.error('❌ CanvasManager nicht verfügbar');
    return;
  }

  if (previewImage.value.type === 'stock') {
    const img = await loadStockImageObject(previewImage.value.data);
    canvasManager.setBackground(img);
  } else {
    canvasManager.setBackground(previewImage.value.data.img);
  }

  console.log('✅ Bild aus Vorschau als Hintergrund gesetzt:', previewImage.value.name);
  closePreview();
}

onMounted(() => {
  // Stock-Galerie laden
  loadStockGallery();

  // Warte kurz falls Manager noch nicht initialisiert sind
  const initializePanel = () => {
    const fotoManager = fotoManagerRef?.value;

    if (!fotoManager) {
      console.warn('⏳ FotoManager noch nicht verfügbar, versuche erneut...');
      setTimeout(initializePanel, 100);
      return;
    }

    // Presets für das Dropdown-Menü laden
    presets.value = fotoManager.getAvailablePresets();

    // Ein Objekt mit allen DOM-Referenzen erstellen
    const controls = {
      container: containerRef.value,
      presetSelect: presetSelectRef.value,
      brightnessInput: brightnessInputRef.value,
      brightnessValue: brightnessValueRef.value,
      contrastInput: contrastInputRef.value,
      contrastValue: contrastValueRef.value,
      saturationInput: saturationInputRef.value,
      saturationValue: saturationValueRef.value,
      opacityInput: opacityInputRef.value,
      opacityValue: opacityValueRef.value,
      blurInput: blurInputRef.value,
      blurValue: blurValueRef.value,
      // ✨ NEU: Eigene Handler-Funktionen
      loadImageSettings: loadImageSettings,
      currentActiveImage: currentActiveImage
    };

    // Die UI-Handler im FotoManager mit den DOM-Elementen verbinden (für Hintergrund-Bilder)
    fotoManager.setupUIHandlers(controls);

    // Die Controls global verfügbar machen, damit App.vue sie finden kann
    window.fotoPanelControls = controls;

    // ✨ NEU: Gespeicherte Audio-Reaktiv Einstellungen aus localStorage laden
    try {
      const savedPreset = localStorage.getItem('visualizer_audioReactivePreset');
      if (savedPreset) {
        savedAudioReactiveSettings.value = JSON.parse(savedPreset);
        console.log('📂 Audio-Reaktiv Preset aus localStorage geladen');
      }
    } catch (e) {
      console.warn('⚠️ Konnte Audio-Reaktiv Preset nicht laden:', e);
    }

    console.log('✅ FotoPanel initialisiert');
  };

  initializePanel();
});

// ✨ NEU: Watcher für Änderungen am aktiven Bild
// Dieser wird von App.vue über window.fotoPanelControls.currentActiveImage gesetzt
watch(currentActiveImage, (newImage) => {
  if (newImage) {
    console.log('🖼️ Aktives Bild geändert:', newImage);
    
    // Panel anzeigen
    if (containerRef.value) {
      containerRef.value.style.display = 'block';
    }
    
    // Lade die Einstellungen des Bildes
    loadImageSettings(newImage);
  } else {
    // Panel verstecken
    if (containerRef.value) {
      containerRef.value.style.display = 'none';
    }
  }
}, { immediate: true });
</script>

<style scoped>
.foto-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ═══════════════════════════════════════════════════════════════════
   ✨ FARBEINSTELLUNGEN FÜR BILDABSCHNITTE
   ═══════════════════════════════════════════════════════════════════ */

.color-settings-section {
  background-color: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #333;
  overflow: hidden;
}

.color-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}

.color-settings-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.color-settings-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.color-preview-dot {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.color-toggle-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.color-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.color-toggle-btn svg {
  width: 14px;
  height: 14px;
  transition: transform 0.3s ease;
}

.color-toggle-btn.rotated svg {
  transform: rotate(-180deg);
}

.color-picker-content {
  padding: 12px 16px 16px;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-preset-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.color-preset-btn:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.color-preset-btn.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4);
}

.custom-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.custom-color-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #ccc;
  cursor: pointer;
}

.custom-color-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--image-section-accent, #6ea8fe);
  cursor: pointer;
}

.custom-color-input {
  width: 40px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.custom-color-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.custom-color-input::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.custom-color-input::-webkit-color-swatch {
  border-radius: 4px;
  border: 1px solid #555;
}

/* Collapse Animation */
.collapse-color-enter-active,
.collapse-color-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-color-enter-from,
.collapse-color-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-color-enter-to,
.collapse-color-leave-from {
  opacity: 1;
  max-height: 200px;
}

/* ═══════════════════════════════════════════════════════════════════
   ✨ BILD-VORSCHAU OVERLAY STYLES
   ═══════════════════════════════════════════════════════════════════ */

.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.preview-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.preview-close {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-close:hover {
  background-color: #ff6b6b;
  border-color: #ff6b6b;
  transform: scale(1.1);
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  object-fit: contain;
}

.preview-info {
  text-align: center;
}

.preview-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.preview-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.preview-actions .btn-primary,
.preview-actions .btn-secondary {
  padding: 12px 24px;
  font-size: 13px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-actions .btn-primary {
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%));
  color: #121212;
  font-weight: 600;
  border: none;
}

.preview-actions .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(110, 168, 254, 0.4);
}

.preview-actions .btn-secondary {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.preview-actions .btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* ═══════════════════════════════════════════════════════════════════
   ✨ STOCK-GALERIE STYLES
   ═══════════════════════════════════════════════════════════════════ */

.stock-gallery-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #333;
}

.stock-gallery-section h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Kategorie-Tabs */
.category-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #555;
  background-color: #333;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.category-tab:hover {
  border-color: var(--image-section-accent, #6ea8fe);
  color: #fff;
  background-color: #444;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(110, 168, 254, 0.2);
}

.category-tab.active {
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%));
  border-color: var(--image-section-accent, #6ea8fe);
  color: #121212;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.4);
}

.category-icon {
  font-size: 14px;
}

.category-name {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.category-count {
  font-size: 10px;
  background-color: rgba(255, 255, 255, 0.15);
  color: #ccc;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.category-tab.active .category-count {
  background-color: rgba(0, 0, 0, 0.2);
  color: #121212;
}

/* Stock-Galerie Scroll-Container */
.stock-gallery-scroll {
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.stock-gallery-scroll::-webkit-scrollbar {
  width: 6px;
}

.stock-gallery-scroll::-webkit-scrollbar-track {
  background: #1e1e1e;
  border-radius: 3px;
}

.stock-gallery-scroll::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.stock-gallery-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--image-section-accent, #6ea8fe);
}

/* Stock-Galerie Grid */
.stock-gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stock-thumbnail-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background-color: #1e1e1e;
}

.stock-thumbnail-item:hover {
  border-color: var(--image-section-accent, #6ea8fe);
  transform: scale(1.03);
}

.stock-thumbnail-item.selected {
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 0 0 2px rgba(110, 168, 254, 0.3);
}

.stock-thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.stock-thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
  padding: 6px 6px 4px 6px;
}

.stock-thumbnail-name {
  font-size: 9px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* Stock Action-Buttons */
.stock-actions {
  margin-top: 8px;
}

/* Ladeanzeige */
.loading-state {
  text-align: center;
  padding: 20px;
  color: #999;
}

.loading-state p {
  margin: 0;
  font-size: 13px;
}

/* Fehleranzeige */
.error-state {
  text-align: center;
  padding: 20px;
  color: #ff6b6b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.error-state p {
  margin: 0;
  font-size: 13px;
}

.btn-retry {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--image-section-accent, #6ea8fe);
  background-color: #2a2a2a;
  color: var(--image-section-accent, #6ea8fe);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  background-color: var(--image-section-accent, #6ea8fe);
  color: #121212;
}

/* Upload-Bereich Styles */
.upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #333;
}

.upload-section h4 {
  margin: 0 0 14px 0;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.upload-area {
  border: 2px dashed #555;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #1e1e1e;
}

.upload-area:hover {
  border-color: var(--image-section-accent, #6ea8fe);
  background-color: #252525;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-placeholder p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
}

.upload-placeholder small {
  font-size: 11px;
  color: #999;
}

/* ✨ NEU: Galerie-Container */
.gallery-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 12px;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.gallery-title {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
}

.btn-clear-all {
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid #555;
  background-color: #ff6b6b;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-all:hover {
  background-color: #ff5252;
}

/* ✨ NEU: Scrollbarer Galerie-Bereich */
.gallery-scroll {
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

/* Custom Scrollbar */
.gallery-scroll::-webkit-scrollbar {
  width: 6px;
}

.gallery-scroll::-webkit-scrollbar-track {
  background: #1e1e1e;
  border-radius: 3px;
}

.gallery-scroll::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.gallery-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--image-section-accent, #6ea8fe);
}

/* ✨ NEU: Thumbnail-Grid */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background-color: #1e1e1e;
}

.thumbnail-item:hover {
  border-color: var(--image-section-accent, #6ea8fe);
  transform: scale(1.02);
}

.thumbnail-item.selected {
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 0 0 2px rgba(110, 168, 254, 0.3);
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.thumbnail-item:hover .thumbnail-overlay {
  opacity: 1;
}

.btn-delete-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: rgba(255, 69, 58, 0.95);
  color: white;
  border: 1.5px solid white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-delete-thumb:hover {
  background-color: rgba(255, 69, 58, 1);
  transform: scale(1.1);
}

.thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: 6px 6px 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.thumbnail-name {
  font-size: 10px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-size {
  font-size: 9px;
  color: #ccc;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

/* Action-Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-buttons button {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #555;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%));
  color: #121212;
  font-weight: 600;
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 2px 4px rgba(110, 168, 254, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #5a8fe6 0%, #4a7fd6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(110, 168, 254, 0.3);
}

.btn-secondary {
  background-color: #2a2a2a;
  color: #e0e0e0;
  border: 1px solid #3a3a3a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
  font-weight: 600;
}

.btn-secondary:hover {
  background-color: #333;
  border-color: #4a4a4a;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-workspace {
  background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);
  color: #121212;
  font-weight: 600;
  border-color: #ffa726;
  box-shadow: 0 2px 4px rgba(255, 167, 38, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
}

.btn-workspace:hover {
  background: linear-gradient(135deg, #fb8c00 0%, #f57c00 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(255, 167, 38, 0.3);
}

/* Filter-Bereich Styles (unverändert) */
.foto-panel-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid #333;
  padding-top: 16px;
}

.foto-panel-container h4 {
  margin: 0 0 14px 0;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.control-group.slider {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.control-group.slider label {
  grid-column: 1 / 3;
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.control-group.slider input {
  width: 100%;
}

.control-group.slider span {
  font-size: 11px;
  color: var(--image-section-accent, #6ea8fe);
  font-weight: 600;
  font-family: 'Courier New', monospace;
  min-width: 50px;
  text-align: right;
}

.control-group select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #555;
  background-color: #3a3a3a;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.control-group select:hover,
.control-group select:focus {
  border-color: var(--image-section-accent, #6ea8fe);
  z-index: 100;
}

.foto-panel-container .btn-secondary {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #555;
  background-color: #555;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.foto-panel-container .btn-secondary:hover {
  background-color: #666;
}

/* Range Slider Styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 5px;
  border-radius: 10px;
  background: linear-gradient(90deg, #2a2a2a 0%, #3a3a3a 100%);
  outline: none;
  cursor: pointer;
  border: 1px solid #333;
  transition: all 0.3s ease;
}

input[type="range"]:hover {
  border-color: #444;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%));
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 0 rgba(110, 168, 254, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: linear-gradient(135deg, #5a8fe6 0%, #4a7fd6 100%);
  transform: scale(1.15);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.5),
    0 0 0 4px rgba(110, 168, 254, 0.2),
    0 0 20px rgba(110, 168, 254, 0.4);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%));
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

input[type="range"]::-moz-range-thumb:hover {
  background: linear-gradient(135deg, #5a8fe6 0%, #4a7fd6 100%);
  transform: scale(1.15);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.5),
    0 0 0 4px rgba(110, 168, 254, 0.2);
}

/* ✨ Color Picker Styling */
.color-picker-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input {
  width: 50px;
  height: 38px;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  background-color: #2a2a2a;
}

.color-input:hover {
  border-color: var(--image-section-accent, #6ea8fe);
}

.color-text-input {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #555;
  background-color: #3a3a3a;
  color: #e0e0e0;
  font-size: 13px;
}

.color-text-input:focus {
  outline: none;
  border-color: var(--image-section-accent, #6ea8fe);
}

/* ✨ Divider */
.divider {
  height: 1px;
  background-color: #444;
  margin: 16px 0;
}

/* ✨ MODERNE SCHATTEN & ROTATIONS SEKTION */
.modern-divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--image-section-accent, #6ea8fe), transparent);
  margin: 24px 0 20px 0;
  border-radius: 2px;
}

.modern-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.modern-section-header h4 {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.modern-controls-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.modern-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modern-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.label-text {
  color: rgba(255, 255, 255, 0.6);
}

.label-value {
  color: var(--image-section-accent, #6ea8fe);
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  min-width: 35px;
  text-align: right;
}

/* ✨ MODERNE SLIDER */
.modern-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

/* Shadow Slider - Lila/Blau Gradient */
.shadow-slider {
  background: linear-gradient(90deg, #1a1a2e 0%, #6ea8fe 50%, #a78bfa 100%);
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.2);
}

.shadow-slider:hover {
  box-shadow: 0 3px 12px rgba(110, 168, 254, 0.4);
  transform: scaleY(1.2);
}

/* Rotation Slider - Orange/Blau Gradient */
.rotation-slider {
  background: linear-gradient(90deg, #f97316 0%, #6ea8fe 50%, #3b82f6 100%);
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.2);
}

.rotation-slider:hover {
  box-shadow: 0 3px 12px rgba(59, 130, 246, 0.4);
  transform: scaleY(1.2);
}

/* Border Slider - Weiß/Blau Gradient */
.border-slider {
  background: linear-gradient(90deg, #1a1a2e 0%, #ffffff 50%, #6ea8fe 100%);
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
}

.border-slider:hover {
  box-shadow: 0 3px 12px rgba(255, 255, 255, 0.4);
  transform: scaleY(1.2);
}

/* Border Opacity Slider - Transparent zu Weiß Gradient */
.border-opacity-slider {
  background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.5) 50%, #ffffff 100%);
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
}

.border-opacity-slider:hover {
  box-shadow: 0 3px 12px rgba(255, 255, 255, 0.4);
  transform: scaleY(1.2);
}

/* ✨ AUDIO-REAKTIV STYLES - Modern & Subtle */
.audio-reactive-group {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 8px;
  padding: 10px;
}

.audio-slider {
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.4) 0%, rgba(236, 72, 153, 0.4) 100%);
  -webkit-appearance: none;
  appearance: none;
}

.audio-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: none;
}

.audio-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: none;
}

/* ✨ EFFEKTE-GRID (Mehrfachauswahl) - Kompakt */
.effects-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.effects-grid .modern-label {
  margin-bottom: 4px;
}

.effects-grid .modern-label .label-text {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: rgba(255, 255, 255, 0.4);
}

.effect-item {
  display: grid;
  grid-template-columns: 1fr 60px 28px;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 4px;
  transition: all 0.15s ease;
}

.effect-item:hover {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.2);
}

.effect-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.effect-checkbox {
  width: 12px;
  height: 12px;
  accent-color: #8b5cf6;
  cursor: pointer;
}

.effect-name {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

.effect-slider {
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: rgba(139, 92, 246, 0.2);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.effect-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: none;
}

.effect-slider::-moz-range-thumb {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: none;
}

.effect-value {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

/* ✨ AUDIO-PRESET AKTIONEN - Kompakt */
.audio-preset-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(139, 92, 246, 0.1);
}

.btn-preset-action {
  flex: 1;
  padding: 5px 8px;
  font-size: 0.65rem;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.btn-preset-action:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-save {
  background: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
}

.btn-save:not(:disabled):hover {
  background: rgba(139, 92, 246, 0.25);
}

.btn-apply {
  background: rgba(236, 72, 153, 0.15);
  color: #f472b6;
}

.btn-apply:not(:disabled):hover {
  background: rgba(236, 72, 153, 0.25);
}

.checkbox-control {
  display: flex;
  align-items: center;
}

.modern-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 5px 8px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 4px;
  transition: all 0.15s ease;
  width: 100%;
}

.modern-checkbox-label:hover {
  background: rgba(139, 92, 246, 0.15);
}

.modern-checkbox {
  width: 12px;
  height: 12px;
  accent-color: #8b5cf6;
  cursor: pointer;
}

.checkbox-text {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.modern-select {
  width: 100%;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modern-select:hover {
  border-color: rgba(139, 92, 246, 0.3);
}

.modern-select:focus {
  outline: none;
  border-color: rgba(139, 92, 246, 0.5);
}

.modern-select option {
  background: #1a1a2e;
  color: #fff;
}

.audio-level-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.level-label {
  font-size: 12px;
  color: #94a3b8;
  min-width: 80px;
}

.level-bar-container {
  flex: 1;
  height: 8px;
  background: rgba(30, 30, 50, 0.8);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.level-bar {
  height: 100%;
  width: 0%;
  background: #4ade80;
  border-radius: 4px;
  transition: width 0.05s ease-out;
}

/* Slider Thumb - Webkit (Chrome, Safari, Edge) */
.modern-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe, #5a96e5));
  cursor: pointer;
  border: 3px solid #1a1a2e;
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.5), 0 0 0 0 rgba(110, 168, 254, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modern-slider::-webkit-slider-thumb:hover {
  transform: scale(1.3);
  box-shadow: 0 4px 16px rgba(110, 168, 254, 0.8), 0 0 0 8px rgba(110, 168, 254, 0.2);
}

.modern-slider::-webkit-slider-thumb:active {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.9), 0 0 0 12px rgba(110, 168, 254, 0.3);
}

/* Slider Thumb - Firefox */
.modern-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe, #5a96e5));
  cursor: pointer;
  border: 3px solid #1a1a2e;
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modern-slider::-moz-range-thumb:hover {
  transform: scale(1.3);
  box-shadow: 0 4px 16px rgba(110, 168, 254, 0.8);
}

.modern-slider::-moz-range-thumb:active {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.9);
}

/* ✨ MODERNER COLOR PICKER */
.modern-color-picker {
  display: flex;
  gap: 10px;
  align-items: center;
}

.modern-color-input {
  width: 45px;
  height: 45px;
  border: 2px solid #444;
  border-radius: 10px;
  cursor: pointer;
  background-color: #2a2a2a;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.modern-color-input:hover {
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 4px 16px rgba(110, 168, 254, 0.3);
  transform: scale(1.05);
}

.modern-color-text {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #444;
  background-color: #2a2a2a;
  color: #e0e0e0;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
}

.modern-color-text:focus {
  outline: none;
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 0 0 3px rgba(110, 168, 254, 0.2);
}

/* ✨ ROTATION HINT */
.rotation-hint {
  font-size: 10px;
  color: #666;
  text-align: center;
  margin-top: 4px;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

/* ✨ FLIP BUTTONS */
.flip-controls {
  margin-top: 12px;
}

.flip-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.flip-button {
  flex: 1;
  padding: 10px 12px;
  background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
  border: 1px solid #555;
  border-radius: 8px;
  color: #ccc;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.flip-button:hover {
  background: linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%);
  border-color: var(--image-section-accent, #6ea8fe);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.15);
}

.flip-button.active {
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe 0%, #5090e0 100%));
  border-color: var(--image-section-accent, #6ea8fe);
  color: #fff;
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.3);
}

.flip-button.active:hover {
  background: linear-gradient(135deg, #7eb8ff 0%, #60a0f0 100%);
}

/* ✨ MODERNER RESET BUTTON */
.modern-reset-btn {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #555 0%, #3a3a3a 100%);
  border: 1px solid #666;
  transition: all 0.3s ease;
  font-weight: 500;
}

.modern-reset-btn:hover {
  background: linear-gradient(135deg, #666 0%, #4a4a4a 100%);
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.2);
  transform: translateY(-2px);
}

/* ═══════════════════════════════════════════════════════════════════
   ✨ EBENEN-STEUERUNG STYLES
   ═══════════════════════════════════════════════════════════════════ */

.layer-controls-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(42, 42, 42, 0.5);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(110, 168, 254, 0.1);
  margin-bottom: 8px;
}

.layer-controls-section .modern-section-header {
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layer-info {
  font-size: 12px;
  font-weight: 600;
  color: var(--image-section-accent, #6ea8fe);
  font-family: 'Courier New', monospace;
  background: rgba(110, 168, 254, 0.15);
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(110, 168, 254, 0.3);
}

.layer-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.layer-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 8px;
  background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
  border: 1px solid #555;
  border-radius: 10px;
  color: #ccc;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.layer-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%);
  border-color: var(--image-section-accent, #6ea8fe);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.2);
}

.layer-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(110, 168, 254, 0.3);
}

.layer-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #2a2a2a;
  border-color: #444;
}

.layer-icon {
  font-size: 16px;
  line-height: 1;
}

.layer-text {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
}

/* Spezielle Styles für die "Nach vorne/hinten" Buttons */
.layer-btn:first-child,
.layer-btn:last-child {
  background: linear-gradient(135deg, #3d4a5a 0%, #2a3340 100%);
}

.layer-btn:first-child:hover:not(:disabled),
.layer-btn:last-child:hover:not(:disabled) {
  background: linear-gradient(135deg, #4a5a6a 0%, #3a4a5a 100%);
}

/* ═══════════════════════════════════════════════════════════════════
   ✨ MEHRFACHAUSWAHL STYLES
   ═══════════════════════════════════════════════════════════════════ */

/* Auswahl-Steuerung Container */
.selection-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

/* Alle auswählen / Auswahl aufheben Buttons */
.btn-select-all,
.btn-deselect-all {
  padding: 5px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid #444;
  background-color: #2a2a2a;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}

.btn-select-all:hover:not(:disabled),
.btn-deselect-all:hover:not(:disabled) {
  background-color: #3a3a3a;
  border-color: var(--image-section-accent, #6ea8fe);
  color: var(--image-section-accent, #6ea8fe);
}

.btn-select-all:disabled,
.btn-deselect-all:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Auswahl-Zähler */
.selection-count {
  font-size: 11px;
  color: var(--image-section-accent, #6ea8fe);
  font-weight: 600;
  padding: 4px 8px;
  background-color: rgba(110, 168, 254, 0.15);
  border-radius: 4px;
  margin-left: auto;
}

/* Tipp-Text für Mehrfachauswahl */
.multiselect-hint {
  font-size: 10px;
  color: #888;
  margin: 0 0 8px 0;
  font-style: italic;
}

/* Checkbox für Thumbnails */
.selection-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;
  font-size: 12px;
  color: white;
  font-weight: bold;
}

.selection-checkbox.checked {
  background-color: var(--image-section-accent, #6ea8fe);
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 2px 6px rgba(110, 168, 254, 0.4);
}

.thumbnail-item:hover .selection-checkbox:not(.checked),
.stock-thumbnail-item:hover .selection-checkbox:not(.checked) {
  border-color: var(--image-section-accent, #6ea8fe);
  background-color: rgba(110, 168, 254, 0.3);
}

/* Anpassung für Thumbnails mit Checkbox */
.thumbnail-item,
.stock-thumbnail-item {
  position: relative;
}

/* Hervorhebung für ausgewählte Bilder */
.thumbnail-item.selected,
.stock-thumbnail-item.selected {
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 0 0 2px rgba(110, 168, 254, 0.3), 0 4px 12px rgba(110, 168, 254, 0.2);
}

/* ═══════════════════════════════════════════════════════════════════ */
/* ✨ BEREICHSAUSWAHL STYLES */
/* ═══════════════════════════════════════════════════════════════════ */

.range-selection-section {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
  padding: 12px;
  margin-top: 12px;
}

.range-selection-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #22c55e;
  font-size: 0.9rem;
}

.range-icon {
  font-size: 1.1rem;
}

.animation-select-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.animation-select-row label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.animation-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.animation-select:hover {
  border-color: rgba(34, 197, 94, 0.5);
}

.animation-select:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

.animation-select option {
  background: #1a1a2e;
  color: #fff;
  padding: 8px;
}

.range-buttons-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-range-select {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(34, 197, 94, 0.5);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%);
  color: #22c55e;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-range-select:hover {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 100%);
  border-color: #22c55e;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
}

.btn-range-select:active {
  transform: translateY(0);
}

.btn-direct-place {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.5);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%);
  color: #3b82f6;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-direct-place:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 100%);
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.btn-direct-place:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 1rem;
}

.range-hint {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 6px;
  font-size: 0.8rem;
  color: #22c55e;
  text-align: center;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Slider-Zeile für Geschwindigkeit und Größe */
.range-slider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.range-slider-row label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
}

.slider-icon {
  font-size: 0.9rem;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #22c55e;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.4);
  transition: all 0.2s ease;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 3px 10px rgba(34, 197, 94, 0.5);
}

.range-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #22c55e;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.4);
}

.range-slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.1) 100%);
}

.range-slider::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.1) 100%);
}

.slider-value {
  min-width: 55px;
  text-align: right;
  font-size: 0.8rem;
  font-weight: 500;
  color: #22c55e;
  font-family: 'JetBrains Mono', monospace;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* ═══════════════════════════════════════════════════════════════════
   ✨ MODERNE PLATZIERUNGS-SEKTION
   ═══════════════════════════════════════════════════════════════════ */

.placement-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px;
  margin-top: 10px;
}

.placement-header {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.placement-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.placement-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.placement-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  min-width: 40px;
}

.placement-select {
  flex: 1;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 0.7rem;
  cursor: pointer;
}

.placement-select:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
}

.placement-select option {
  background: #1a1a2e;
  color: #fff;
}

.placement-slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.placement-slider {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.placement-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

.placement-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

.placement-value {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.6);
  min-width: 28px;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

.placement-xy {
  gap: 6px;
}

.placement-input {
  width: 50px;
  padding: 3px 6px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 0.65rem;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
}

.placement-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
}

.placement-input::-webkit-inner-spin-button,
.placement-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.placement-buttons {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.btn-placement {
  flex: 1;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.btn-draw {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.btn-draw:hover {
  background: rgba(34, 197, 94, 0.25);
}

.btn-place {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.btn-place:hover {
  background: rgba(59, 130, 246, 0.25);
}

.placement-hint {
  margin-top: 6px;
  padding: 4px 8px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 4px;
  font-size: 0.65rem;
  color: #22c55e;
  text-align: center;
  animation: pulse 1.5s ease-in-out infinite;
}
</style>
