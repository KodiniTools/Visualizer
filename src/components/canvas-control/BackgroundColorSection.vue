<template>
  <div class="panel-section">
    <h4>{{ t('canvasControl.backgroundColor') }}</h4>

    <div class="control-group">
      <label>{{ t('canvasControl.selectColor') }}:</label>
      <div class="color-picker-group">
        <input
          type="color"
          v-model="backgroundColor"
          @input="updateFromColorPicker"
          class="color-input"
        />
        <input
          type="text"
          v-model="colorDisplay"
          @input="updateFromTextInput"
          @blur="formatColorDisplay"
          class="color-text-input"
          placeholder="rgba(0, 0, 0, 1)"
        />
      </div>
    </div>

    <div class="control-group">
      <label>
        {{ t('canvasControl.backgroundOpacity') }}: {{ Math.round(backgroundOpacity * 100) }}%
      </label>
      <input
        type="range"
        v-model.number="backgroundOpacity"
        @input="updateFromOpacitySlider"
        min="0"
        max="1"
        step="0.01"
        class="opacity-slider"
      />
    </div>

    <div class="gradient-section">
      <h5>🌈 {{ t('canvasControl.gradient') }}</h5>

      <div class="control-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="gradientEnabled" @change="updateGradientSettings" />
          <span>{{ t('canvasControl.enableGradient') }}</span>
        </label>
      </div>

      <div v-if="gradientEnabled" class="gradient-controls">
        <div class="control-group">
          <label>{{ t('canvasControl.secondColor') }}:</label>
          <div class="color-picker-group">
            <input
              type="color"
              v-model="gradientColor2"
              @input="updateGradientSettings"
              class="color-input"
            />
            <span class="color-hex">{{ gradientColor2 }}</span>
          </div>
        </div>

        <div class="control-group">
          <label>{{ t('canvasControl.type') }}:</label>
          <select v-model="gradientType" @change="updateGradientSettings" class="gradient-select">
            <option value="radial">🔵 {{ t('canvasControl.radial') }}</option>
            <option value="linear">📐 {{ t('canvasControl.linear') }}</option>
          </select>
        </div>

        <div v-if="gradientType === 'linear'" class="control-group">
          <label>{{ t('canvasControl.angle') }}: {{ gradientAngle }}°</label>
          <input
            type="range"
            v-model.number="gradientAngle"
            @input="updateGradientSettings"
            min="0"
            max="360"
            step="5"
            class="angle-slider"
          />
        </div>
      </div>
    </div>

    <div class="audio-reactive-section">
      <h5>🎵 {{ t('canvasControl.audioReactive') }}</h5>

      <div class="control-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="bgAudioEnabled" @change="updateBgAudioReactive" />
          <span>{{ t('common.enabled') }}</span>
        </label>
      </div>

      <div v-if="bgAudioEnabled" class="audio-controls">
        <div class="control-group">
          <label>{{ t('canvasControl.reactsTo') }}:</label>
          <select v-model="bgAudioSource" @change="updateBgAudioReactive" class="audio-select">
            <option value="bass">{{ t('canvasControl.bass') }}</option>
            <option value="mid">{{ t('canvasControl.mid') }}</option>
            <option value="treble">{{ t('canvasControl.trebleHiHats') }}</option>
            <option value="volume">{{ t('canvasControl.volumeTotal') }}</option>
            <option value="dynamic">✨ {{ t('canvasControl.dynamic') }}</option>
          </select>
        </div>

        <div class="control-group">
          <label>{{ t('canvasControl.smoothing') }}: {{ bgAudioSmoothing }}%</label>
          <input
            type="range"
            v-model.number="bgAudioSmoothing"
            @input="updateBgAudioReactive"
            min="0"
            max="100"
            step="5"
            class="audio-slider"
          />
        </div>

        <div class="effects-list">
          <label class="effect-item">
            <input type="checkbox" v-model="bgEffectHue" @change="updateBgAudioReactive" />
            <span>🎨 {{ t('canvasControl.hue') }}</span>
            <input
              type="range"
              v-model.number="bgEffectHueIntensity"
              @input="updateBgAudioReactive"
              min="0"
              max="100"
              step="5"
              class="effect-slider"
            />
            <span class="effect-value">{{ bgEffectHueIntensity }}%</span>
          </label>

          <label class="effect-item">
            <input type="checkbox" v-model="bgEffectBrightness" @change="updateBgAudioReactive" />
            <span>☀️ {{ t('canvasControl.brightness') }}</span>
            <input
              type="range"
              v-model.number="bgEffectBrightnessIntensity"
              @input="updateBgAudioReactive"
              min="0"
              max="100"
              step="5"
              class="effect-slider"
            />
            <span class="effect-value">{{ bgEffectBrightnessIntensity }}%</span>
          </label>

          <label class="effect-item">
            <input type="checkbox" v-model="bgEffectSaturation" @change="updateBgAudioReactive" />
            <span>🌈 {{ t('canvasControl.saturation') }}</span>
            <input
              type="range"
              v-model.number="bgEffectSaturationIntensity"
              @input="updateBgAudioReactive"
              min="0"
              max="100"
              step="5"
              class="effect-slider"
            />
            <span class="effect-value">{{ bgEffectSaturationIntensity }}%</span>
          </label>

          <label class="effect-item">
            <input type="checkbox" v-model="bgEffectGlow" @change="updateBgAudioReactive" />
            <span>✨ {{ t('canvasControl.glow') }}</span>
            <input
              type="range"
              v-model.number="bgEffectGlowIntensity"
              @input="updateBgAudioReactive"
              min="0"
              max="100"
              step="5"
              class="effect-slider"
            />
            <span class="effect-value">{{ bgEffectGlowIntensity }}%</span>
          </label>

          <label class="effect-item">
            <input type="checkbox" v-model="bgEffectStrobe" @change="updateBgAudioReactive" />
            <span>⚡ {{ t('canvasControl.strobe') }}</span>
            <input
              type="range"
              v-model.number="bgEffectStrobeIntensity"
              @input="updateBgAudioReactive"
              min="0"
              max="100"
              step="5"
              class="effect-slider"
            />
            <span class="effect-value">{{ bgEffectStrobeIntensity }}%</span>
          </label>

          <label class="effect-item">
            <input type="checkbox" v-model="bgEffectContrast" @change="updateBgAudioReactive" />
            <span>🔲 {{ t('canvasControl.contrastEffect') }}</span>
            <input
              type="range"
              v-model.number="bgEffectContrastIntensity"
              @input="updateBgAudioReactive"
              min="0"
              max="100"
              step="5"
              class="effect-slider"
            />
            <span class="effect-value">{{ bgEffectContrastIntensity }}%</span>
          </label>

          <template v-if="gradientEnabled">
            <label class="effect-item">
              <input
                type="checkbox"
                v-model="bgEffectGradientPulse"
                @change="updateBgAudioReactive"
              />
              <span>💫 {{ t('canvasControl.gradientPulse') }}</span>
              <input
                type="range"
                v-model.number="bgEffectGradientPulseIntensity"
                @input="updateBgAudioReactive"
                min="0"
                max="100"
                step="5"
                class="effect-slider"
              />
              <span class="effect-value">{{ bgEffectGradientPulseIntensity }}%</span>
            </label>

            <label class="effect-item">
              <input
                type="checkbox"
                v-model="bgEffectGradientRotation"
                @change="updateBgAudioReactive"
              />
              <span>🔄 {{ t('canvasControl.gradientRotation') }}</span>
              <input
                type="range"
                v-model.number="bgEffectGradientRotationIntensity"
                @input="updateBgAudioReactive"
                min="0"
                max="100"
                step="5"
                class="effect-slider"
              />
              <span class="effect-value">{{ bgEffectGradientRotationIntensity }}%</span>
            </label>
          </template>
        </div>
      </div>
    </div>

    <!-- Kachel-Hintergrund Panel -->
    <BackgroundTilesPanel />

    <!-- Bild-Hintergrund Spiegeln -->
    <div v-if="hasImageBackground" class="flip-section">
      <h5>🔄 {{ t('canvasControl.flipBackground') }}</h5>
      <div class="flip-buttons">
        <button
          type="button"
          class="flip-button"
          :class="{ active: bgFlipH }"
          @click="toggleBgFlipH"
          :title="t('canvasControl.flipHorizontal')"
        >
          ↔ {{ t('canvasControl.horizontal') }}
        </button>
        <button
          type="button"
          class="flip-button"
          :class="{ active: bgFlipV }"
          @click="toggleBgFlipV"
          :title="t('canvasControl.flipVertical')"
        >
          ↕ {{ t('canvasControl.vertical') }}
        </button>
      </div>
    </div>

    <!-- Workspace-Hintergrund Spiegeln -->
    <div v-if="hasWorkspaceBackground" class="flip-section">
      <h5>🔄 {{ t('canvasControl.flipWorkspaceBackground') }}</h5>
      <div class="flip-buttons">
        <button
          type="button"
          class="flip-button"
          :class="{ active: wsBgFlipH }"
          @click="toggleWsBgFlipH"
          :title="t('canvasControl.flipHorizontal')"
        >
          ↔ {{ t('canvasControl.horizontal') }}
        </button>
        <button
          type="button"
          class="flip-button"
          :class="{ active: wsBgFlipV }"
          @click="toggleWsBgFlipV"
          :title="t('canvasControl.flipVertical')"
        >
          ↕ {{ t('canvasControl.vertical') }}
        </button>
      </div>
    </div>

    <!-- Hintergrund-Thumbnail -->
    <div v-if="hasImageBackground" class="background-thumb-section">
      <h5>🖼️ {{ t('canvasControl.backgroundImage') || 'Hintergrundbild' }}</h5>
      <div
        class="background-thumb"
        @dblclick="openBackgroundReplaceModal('background')"
        :title="t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen'"
      >
        <img v-if="backgroundImageSrc" :src="backgroundImageSrc" alt="Background" />
        <span class="thumb-hint">{{
          t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen'
        }}</span>
      </div>
    </div>

    <!-- Workspace-Hintergrund-Thumbnail -->
    <div v-if="hasWorkspaceBackground" class="background-thumb-section">
      <h5>🖼️ {{ t('canvasControl.workspaceBackgroundImage') || 'Workspace-Hintergrundbild' }}</h5>
      <div
        class="background-thumb"
        @dblclick="openBackgroundReplaceModal('workspace')"
        :title="t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen'"
      >
        <img
          v-if="workspaceBackgroundImageSrc"
          :src="workspaceBackgroundImageSrc"
          alt="Workspace Background"
        />
        <span class="thumb-hint">{{
          t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen'
        }}</span>
      </div>
    </div>
  </div>

  <!-- Modal zum Ersetzen des Hintergrundbildes -->
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
                📁 {{ t('app.uploadImage') || 'Bild hochladen' }}
              </button>
              <button class="btn-replace btn-gallery" @click="openBgReplaceGallery">
                🖼️ {{ t('app.fromGallery') || 'Aus Galerie' }}
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
                  ⏳ {{ t('common.loading') || 'Laden...' }}
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
                  ✓ {{ t('app.selectImage') || 'Bild auswählen' }}
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
                  ✕ {{ t('common.cancel') || 'Abbrechen' }}
                </button>
                <button class="btn-confirm-replace" @click="confirmBackgroundReplace">
                  ✓ {{ t('app.confirmReplace') || 'Ersetzen bestätigen' }}
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
import { useI18n } from '../../lib/i18n.js'
import BackgroundTilesPanel from '../BackgroundTilesPanel.vue'

const { t } = useI18n()
const bg = inject('bgSettings')
const bgReplaceFileInput = ref(null)

const {
  backgroundColor,
  backgroundOpacity,
  colorDisplay,
  gradientEnabled,
  gradientColor2,
  gradientType,
  gradientAngle,
  bgAudioEnabled,
  bgAudioSource,
  bgAudioSmoothing,
  bgEffectHue,
  bgEffectHueIntensity,
  bgEffectBrightness,
  bgEffectBrightnessIntensity,
  bgEffectSaturation,
  bgEffectSaturationIntensity,
  bgEffectGlow,
  bgEffectGlowIntensity,
  bgEffectStrobe,
  bgEffectStrobeIntensity,
  bgEffectContrast,
  bgEffectContrastIntensity,
  bgEffectGradientPulse,
  bgEffectGradientPulseIntensity,
  bgEffectGradientRotation,
  bgEffectGradientRotationIntensity,
  bgFlipH,
  bgFlipV,
  wsBgFlipH,
  wsBgFlipV,
  showBackgroundReplaceModal,
  replaceType,
  pendingBackgroundReplaceSrc,
  showBgReplaceGallery,
  bgGalleryCategories,
  bgGalleryImages,
  selectedBgCategory,
  selectedBgGalleryImage,
  bgGalleryLoading,
  hasImageBackground,
  hasWorkspaceBackground,
  backgroundImageSrc,
  workspaceBackgroundImageSrc,
  currentBackgroundForReplace,
  updateFromColorPicker,
  updateFromOpacitySlider,
  updateFromTextInput,
  formatColorDisplay,
  updateGradientSettings,
  updateBgAudioReactive,
  toggleBgFlipH,
  toggleBgFlipV,
  toggleWsBgFlipH,
  toggleWsBgFlipV,
  openBackgroundReplaceModal,
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
.control-group {
  margin-bottom: 6px;
}

.control-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  font-weight: 500;
}

.color-picker-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.color-input {
  width: 40px;
  height: 28px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--secondary-bg, #0e1c32);
}

.color-text-input {
  flex: 1;
  padding: 5px 7px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  font-family: 'Courier New', monospace;
}

.color-text-input:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

.opacity-slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(
    to right,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background-color: var(--accent-tertiary, #f8e1a9);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.opacity-slider::-webkit-slider-thumb:hover {
  background-color: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.opacity-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background-color: var(--accent-tertiary, #f8e1a9);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.opacity-slider::-moz-range-thumb:hover {
  background-color: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.gradient-section {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(201, 152, 77, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid var(--accent-primary, #c9984d);
  border-radius: 6px;
}

.gradient-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary, #f8e1a9);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.gradient-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.gradient-select {
  width: 100%;
  padding: 5px 8px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  cursor: pointer;
}

.gradient-select:hover {
  border-color: var(--accent-primary, #c9984d);
}

.gradient-select:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

.angle-slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(
    to right,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.angle-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.color-hex {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  font-family: monospace;
}

.audio-reactive-section {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid #8b5cf6;
  border-radius: 6px;
}

.audio-reactive-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.6rem;
  color: var(--text-primary, #e9e9eb);
}

.checkbox-label input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: #8b5cf6;
}

.audio-controls {
  margin-top: 8px;
}

.audio-select {
  width: 100%;
  padding: 5px 8px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  cursor: pointer;
}

.audio-select:hover {
  border-color: #8b5cf6;
}

.audio-select:focus {
  outline: none;
  border-color: #8b5cf6;
}

.audio-slider {
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--text-muted, #7a8da0) 0%, #8b5cf6 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.audio-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #a78bfa;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.effects-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.effect-item {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
  border-radius: 5px;
  font-size: 0.55rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.effect-item:hover {
  border-color: var(--border-color, rgba(201, 152, 77, 0.3));
}

.effect-item input[type='checkbox'] {
  width: 12px;
  height: 12px;
  accent-color: #8b5cf6;
}

.effect-slider {
  width: 50px;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--text-muted, #7a8da0) 0%, #8b5cf6 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.effect-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #a78bfa;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.effect-value {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  min-width: 28px;
  text-align: right;
}

.flip-section {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(201, 152, 77, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid var(--accent-primary, #c9984d);
  border-radius: 6px;
}

.flip-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary, #f8e1a9);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.flip-buttons {
  display: flex;
  gap: 6px;
}

.flip-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.flip-button:hover {
  background: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
}

.flip-button.active {
  background: rgba(201, 152, 77, 0.3);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
}

.background-thumb-section {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(201, 152, 77, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid var(--accent-primary, #c9984d);
  border-radius: 6px;
}

.background-thumb-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary, #f8e1a9);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.background-thumb {
  position: relative;
  width: 100%;
  height: 60px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.background-thumb:hover {
  border-color: var(--accent-primary, #c9984d);
  box-shadow: 0 0 8px rgba(201, 152, 77, 0.3);
}

.background-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.background-thumb .thumb-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.7);
  color: var(--text-primary, #e9e9eb);
  font-size: 0.5rem;
  text-align: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.background-thumb:hover .thumb-hint {
  opacity: 1;
}

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

.btn-replace.btn-gallery {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  color: #a78bfa;
}

.btn-replace.btn-gallery:hover {
  background: rgba(139, 92, 246, 0.3);
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

/* Light theme overrides */
[data-theme='light'] .gradient-section h5 {
  color: #014f99;
}

[data-theme='light'] .flip-section h5 {
  color: #014f99;
}

[data-theme='light'] .background-thumb-section h5 {
  color: #014f99;
}

[data-theme='light'] .audio-reactive-section h5 {
  color: #014f99;
}

[data-theme='light'] .gradient-section {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.06) 100%);
  border-left-color: #014f99;
}

[data-theme='light'] .flip-section {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.06) 100%);
  border-left-color: #014f99;
}

[data-theme='light'] .background-thumb-section {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.06) 100%);
  border-left-color: #014f99;
}

[data-theme='light'] .audio-reactive-section {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.06) 100%);
  border-left-color: #014f99;
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

[data-theme='light'] .flip-button {
  background: #fdfbf2;
  border-color: var(--border-color);
  color: #003971;
}

[data-theme='light'] .flip-button:hover {
  background: var(--btn-hover);
  border-color: #014f99;
}

[data-theme='light'] .flip-button.active {
  background: rgba(1, 79, 153, 0.15);
  border-color: #014f99;
  color: #014f99;
}

[data-theme='light'] .effect-item {
  background: #fdfbf2;
}

[data-theme='light'] .bg-category-tab.active {
  background: rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .checkbox-label input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .effect-item input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .audio-select:hover {
  border-color: #014f99;
}

[data-theme='light'] .audio-select:focus {
  border-color: #014f99;
}

[data-theme='light'] .opacity-slider {
  background: linear-gradient(to right, rgba(7, 63, 116, 0.2) 0%, rgba(1, 79, 153, 0.5) 100%);
}

[data-theme='light'] .opacity-slider::-webkit-slider-thumb {
  background: #073f74;
  border-color: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .opacity-slider::-moz-range-thumb {
  background: #073f74;
  border-color: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .angle-slider {
  background: linear-gradient(to right, rgba(7, 63, 116, 0.2) 0%, rgba(1, 79, 153, 0.5) 100%);
}

[data-theme='light'] .angle-slider::-webkit-slider-thumb {
  background: #073f74;
  border-color: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .audio-slider {
  background: linear-gradient(90deg, rgba(7, 63, 116, 0.25) 0%, rgba(1, 79, 153, 0.45) 100%);
}

[data-theme='light'] .audio-slider::-webkit-slider-thumb {
  background: #073f74;
  border-color: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .effect-slider {
  background: linear-gradient(90deg, rgba(7, 63, 116, 0.2) 0%, rgba(1, 79, 153, 0.4) 100%);
}

[data-theme='light'] .effect-slider::-webkit-slider-thumb {
  background: #073f74;
  border-color: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .background-thumb:hover {
  box-shadow: 0 0 8px rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .background-thumb .thumb-hint {
  background: rgba(255, 255, 255, 0.85);
  color: #003971;
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
  .gradient-select,
  .audio-select {
    min-height: 36px;
    font-size: 0.65rem;
  }

  .bg-replace-modal {
    max-width: 95vw;
    width: 95%;
  }

  .bg-replace-modal-content {
    padding: 10px;
    gap: 10px;
  }

  .opacity-slider::-webkit-slider-thumb,
  .angle-slider::-webkit-slider-thumb,
  .audio-slider::-webkit-slider-thumb,
  .effect-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }

  .opacity-slider::-moz-range-thumb,
  .audio-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
  }
}

@media (max-width: 480px) {
  .flip-buttons {
    flex-direction: column;
  }
}
</style>
