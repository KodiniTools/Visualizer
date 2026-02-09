<template>
  <div class="panel">
    <div class="panel-header" @click="isExpanded = !isExpanded">
      <h3>{{ t('canvasControl.title') }}</h3>
      <span class="chevron" :class="{ open: isExpanded }">▼</span>
    </div>

    <div class="panel-content" v-show="isExpanded">
      <!-- Hintergrundfarbe -->
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

        <!-- NEU: Hintergrund Deckkraft Slider -->
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

        <!-- ✨ NEU: Gradient-Einstellungen -->
        <div class="gradient-section">
          <h5>🌈 {{ t('canvasControl.gradient') }}</h5>

          <div class="control-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="gradientEnabled"
                @change="updateGradientSettings"
              />
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

        <!-- ✨ NEU: Audio-Reaktiv für Hintergrundfarbe -->
        <div class="audio-reactive-section">
          <h5>🎵 {{ t('canvasControl.audioReactive') }}</h5>

          <div class="control-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="bgAudioEnabled"
                @change="updateBgAudioReactive"
              />
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
                <input type="range" v-model.number="bgEffectHueIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectHueIntensity }}%</span>
              </label>

              <label class="effect-item">
                <input type="checkbox" v-model="bgEffectBrightness" @change="updateBgAudioReactive" />
                <span>☀️ {{ t('canvasControl.brightness') }}</span>
                <input type="range" v-model.number="bgEffectBrightnessIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectBrightnessIntensity }}%</span>
              </label>

              <label class="effect-item">
                <input type="checkbox" v-model="bgEffectSaturation" @change="updateBgAudioReactive" />
                <span>🌈 {{ t('canvasControl.saturation') }}</span>
                <input type="range" v-model.number="bgEffectSaturationIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectSaturationIntensity }}%</span>
              </label>

              <label class="effect-item">
                <input type="checkbox" v-model="bgEffectGlow" @change="updateBgAudioReactive" />
                <span>✨ {{ t('canvasControl.glow') }}</span>
                <input type="range" v-model.number="bgEffectGlowIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectGlowIntensity }}%</span>
              </label>

              <label class="effect-item">
                <input type="checkbox" v-model="bgEffectStrobe" @change="updateBgAudioReactive" />
                <span>⚡ {{ t('canvasControl.strobe') }}</span>
                <input type="range" v-model.number="bgEffectStrobeIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectStrobeIntensity }}%</span>
              </label>

              <label class="effect-item">
                <input type="checkbox" v-model="bgEffectContrast" @change="updateBgAudioReactive" />
                <span>🔲 {{ t('canvasControl.contrastEffect') }}</span>
                <input type="range" v-model.number="bgEffectContrastIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectContrastIntensity }}%</span>
              </label>

              <!-- Gradient-Effekte (nur wenn Gradient aktiviert) -->
              <template v-if="gradientEnabled">
                <label class="effect-item">
                  <input type="checkbox" v-model="bgEffectGradientPulse" @change="updateBgAudioReactive" />
                  <span>💫 {{ t('canvasControl.gradientPulse') }}</span>
                  <input type="range" v-model.number="bgEffectGradientPulseIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                  <span class="effect-value">{{ bgEffectGradientPulseIntensity }}%</span>
                </label>

                <label class="effect-item">
                  <input type="checkbox" v-model="bgEffectGradientRotation" @change="updateBgAudioReactive" />
                  <span>🔄 {{ t('canvasControl.gradientRotation') }}</span>
                  <input type="range" v-model.number="bgEffectGradientRotationIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                  <span class="effect-value">{{ bgEffectGradientRotationIntensity }}%</span>
                </label>
              </template>
            </div>
          </div>
        </div>

        <!-- Kachel-Hintergrund Panel -->
        <BackgroundTilesPanel />

        <!-- ✨ NEU: Bild-Hintergrund Spiegeln -->
        <div v-if="hasImageBackground" class="flip-section">
          <h5>🔄 {{ t('canvasControl.flipBackground') }}</h5>
          <div class="flip-buttons">
            <button
              type="button"
              class="flip-button"
              :class="{ 'active': bgFlipH }"
              @click="toggleBgFlipH"
              :title="t('canvasControl.flipHorizontal')"
            >
              ↔ {{ t('canvasControl.horizontal') }}
            </button>
            <button
              type="button"
              class="flip-button"
              :class="{ 'active': bgFlipV }"
              @click="toggleBgFlipV"
              :title="t('canvasControl.flipVertical')"
            >
              ↕ {{ t('canvasControl.vertical') }}
            </button>
          </div>
        </div>

        <!-- ✨ NEU: Workspace-Hintergrund Spiegeln -->
        <div v-if="hasWorkspaceBackground" class="flip-section">
          <h5>🔄 {{ t('canvasControl.flipWorkspaceBackground') }}</h5>
          <div class="flip-buttons">
            <button
              type="button"
              class="flip-button"
              :class="{ 'active': wsBgFlipH }"
              @click="toggleWsBgFlipH"
              :title="t('canvasControl.flipHorizontal')"
            >
              ↔ {{ t('canvasControl.horizontal') }}
            </button>
            <button
              type="button"
              class="flip-button"
              :class="{ 'active': wsBgFlipV }"
              @click="toggleWsBgFlipV"
              :title="t('canvasControl.flipVertical')"
            >
              ↕ {{ t('canvasControl.vertical') }}
            </button>
          </div>
        </div>

        <!-- ✨ NEU: Hintergrund-Thumbnail mit Doppelklick zum Ersetzen -->
        <div v-if="hasImageBackground" class="background-thumb-section">
          <h5>🖼️ {{ t('canvasControl.backgroundImage') || 'Hintergrundbild' }}</h5>
          <div
            class="background-thumb"
            @dblclick="openBackgroundReplaceModal('background')"
            :title="t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen'"
          >
            <img
              v-if="backgroundImageSrc"
              :src="backgroundImageSrc"
              alt="Background"
            />
            <span class="thumb-hint">{{ t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen' }}</span>
          </div>
        </div>

        <!-- ✨ NEU: Workspace-Hintergrund-Thumbnail mit Doppelklick zum Ersetzen -->
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
            <span class="thumb-hint">{{ t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen' }}</span>
          </div>
        </div>
      </div>

      <!-- Undo/Redo Sektion -->
      <div v-if="canUndo" class="panel-section undo-section">
        <button @click="undoLastChange" class="btn-undo full-width">
          {{ t('canvasControl.undo') }}
        </button>
        <div class="hint-text" style="text-align: center; margin-top: 6px;">
          {{ undoHistory.length }} {{ t('canvasControl.inHistory') }}
        </div>
      </div>

      <div class="divider"></div>

      <!-- ✨ NEU: Presets speichern/laden -->
      <div class="panel-section">
        <h4>🎨 {{ t('canvasControl.presets') }}</h4>

        <div class="control-group">
          <button @click="saveCurrentAsPreset" class="btn-primary full-width">
            {{ t('canvasControl.saveAsPreset') }}
          </button>
        </div>

        <div v-if="savedPresets.length > 0" class="presets-list">
          <label>{{ t('canvasControl.savedPresets') }}:</label>
          <div
            v-for="preset in savedPresets"
            :key="preset.id"
            class="preset-item"
          >
            <div class="preset-info">
              <span class="preset-name">{{ preset.name }}</span>
              <span class="preset-preview" :style="{ backgroundColor: preset.backgroundColor }"></span>
            </div>
            <div class="preset-actions">
              <button @click="loadPreset(preset)" class="btn-small btn-load" :title="t('canvasControl.load')">
                📥
              </button>
              <button @click="deletePreset(preset.id)" class="btn-small btn-delete" :title="t('common.delete')">
                🗑️
              </button>
            </div>
          </div>
        </div>
        <div v-else class="hint-text" style="text-align: center; margin-top: 8px;">
          {{ t('canvasControl.noPresets') }}
        </div>
      </div>

      <div class="divider"></div>

      <!-- Hintergrund zurücksetzen -->
      <div class="panel-section">
        <h4>{{ t('canvasControl.resetBackground') }}</h4>
        <p class="info-text">
          {{ t('canvasControl.selectWhatToReset') || 'Wählen Sie, was zurückgesetzt werden soll' }}
        </p>
        <div class="reset-options">
          <button
            @click="resetNormalBackground"
            class="btn-reset-option"
            :disabled="!hasImageBackground && !hasVideoBackground"
            :title="t('canvasControl.resetNormalBg') || 'Normaler Hintergrund zurücksetzen'"
          >
            🖼️ {{ t('canvasControl.normalBackground') || 'Hintergrund' }}
          </button>
          <button
            @click="resetWorkspaceBackgroundOnly"
            class="btn-reset-option"
            :disabled="!hasWorkspaceBackground && !hasWorkspaceVideoBackground"
            :title="t('canvasControl.resetWorkspaceBg') || 'Workspace-Hintergrund zurücksetzen'"
          >
            📐 {{ t('canvasControl.workspaceBackground') || 'Workspace' }}
          </button>
        </div>
        <button @click="resetAllBackgrounds" class="btn-secondary full-width" style="margin-top: 8px;">
          🔄 {{ t('canvasControl.resetAll') || 'Alle zurücksetzen' }}
        </button>
      </div>

      <div class="divider"></div>

      <!-- Canvas komplett zurücksetzen -->
      <div class="panel-section">
        <h4>{{ t('canvasControl.clearCanvas') }}</h4>
        <p class="info-text warning">
          ⚠️ {{ t('canvasControl.removesAll') }}
        </p>
        <button
          @click="showResetConfirm = true"
          class="btn-danger full-width"
          :disabled="isCanvasEmpty"
        >
          {{ t('canvasControl.deleteAll') }}
        </button>
        <div v-if="isCanvasEmpty" class="hint-text" style="margin-top: 8px; text-align: center;">
          {{ t('canvasControl.canvasEmpty') }}
        </div>
      </div>
    </div>

    <!-- Bestätigungs-Dialog für Canvas-Reset -->
    <div v-if="showResetConfirm" class="confirm-overlay" @click="showResetConfirm = false">
      <div class="confirm-dialog" @click.stop>
        <h4>{{ t('canvasControl.confirmClear') }}</h4>
        <p>
          {{ t('canvasControl.confirmClearText') }}
        </p>
        <div class="confirm-actions">
          <button @click="confirmReset" class="btn-danger">
            {{ t('common.delete') }}
          </button>
          <button @click="showResetConfirm = false" class="btn-secondary">
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ✨ NEU: Modal zum Ersetzen des Hintergrundbildes -->
    <Teleport to="body">
      <div v-if="showBackgroundReplaceModal" class="bg-replace-modal-overlay" @click="closeBackgroundReplaceModal">
        <div class="bg-replace-modal" @click.stop>
          <button class="bg-replace-modal-close" @click="closeBackgroundReplaceModal">×</button>
          <div class="bg-replace-modal-content">
            <div class="bg-replace-modal-image-container">
              <img v-if="currentBackgroundForReplace" :src="currentBackgroundForReplace" alt="Current Background">
            </div>
            <div class="bg-replace-modal-info">
              <h3>{{ replaceType === 'workspace' ? (t('canvasControl.replaceWorkspaceBackground') || 'Workspace-Hintergrund ersetzen') : (t('canvasControl.replaceBackground') || 'Hintergrund ersetzen') }}</h3>
              <p class="bg-replace-hint">{{ t('canvasControl.audioReactiveKept') || 'Audio-Reactive Einstellungen werden übernommen' }}</p>

              <!-- Ersetzen-Buttons -->
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
                <!-- Kategorie-Tabs -->
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

                <!-- Bilder-Grid -->
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
                      <img :src="image.thumb || image.file" :alt="image.name || 'Gallery image'" loading="lazy" />
                    </div>
                  </div>
                </div>

                <!-- Galerie-Bestätigung -->
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
                  <span class="pending-bg-replace-label">{{ t('app.newImagePreview') || 'Vorschau:' }}</span>
                </div>
                <div class="pending-bg-replace-image-container">
                  <img :src="pendingBackgroundReplaceSrc" alt="Preview" class="pending-bg-replace-image" />
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
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted, watch, nextTick } from 'vue';
import { useI18n } from '../lib/i18n.js';
import BackgroundTilesPanel from './BackgroundTilesPanel.vue';

const { t } = useI18n();
const canvasManager = inject('canvasManager');
const backgroundColor = ref('#ffffff'); // Hex-Farbe ohne Alpha (Standard: Weiß)
const backgroundOpacity = ref(1.0); // Deckkraft State (0.0 bis 1.0)
const colorDisplay = ref('rgba(255, 255, 255, 1)'); // Angezeigter Farbwert im Textfeld
const showResetConfirm = ref(false);

// ✨ Panel Ein-/Ausklappen
const isExpanded = ref(true);

// ✨ Undo-System
const undoHistory = ref([]);
const MAX_HISTORY = 10;

// ✨ NEU: Audio-Reaktiv für Hintergrundfarbe
const bgAudioEnabled = ref(false);
const bgAudioSource = ref('bass');
const bgAudioSmoothing = ref(50);
const bgEffectHue = ref(false);
const bgEffectHueIntensity = ref(80);
const bgEffectBrightness = ref(false);
const bgEffectBrightnessIntensity = ref(80);
const bgEffectSaturation = ref(false);
const bgEffectSaturationIntensity = ref(80);
const bgEffectGlow = ref(false);
const bgEffectGlowIntensity = ref(80);
const bgEffectStrobe = ref(false);
const bgEffectStrobeIntensity = ref(80);
const bgEffectContrast = ref(false);
const bgEffectContrastIntensity = ref(70);
const bgEffectGradientPulse = ref(false);
const bgEffectGradientPulseIntensity = ref(80);
const bgEffectGradientRotation = ref(false);
const bgEffectGradientRotationIntensity = ref(80);

// ✨ NEU: Gradient-Einstellungen
const gradientEnabled = ref(false);
const gradientColor2 = ref('#0066ff');
const gradientType = ref('radial');
const gradientAngle = ref(45);

// ✨ NEU: Flip-Einstellungen für Bild-Hintergründe
const bgFlipH = ref(false);
const bgFlipV = ref(false);
const wsBgFlipH = ref(false);
const wsBgFlipV = ref(false);

// Computed: Prüft ob ein Bild-Hintergrund vorhanden ist
const hasImageBackground = computed(() => {
  if (!canvasManager.value) return false;
  return canvasManager.value.background && typeof canvasManager.value.background === 'object';
});

// Computed: Prüft ob ein Workspace-Hintergrund vorhanden ist
const hasWorkspaceBackground = computed(() => {
  if (!canvasManager.value) return false;
  return !!canvasManager.value.workspaceBackground;
});

// Computed: Prüft ob ein Video-Hintergrund vorhanden ist
const hasVideoBackground = computed(() => {
  if (!canvasManager.value) return false;
  return !!canvasManager.value.videoBackground;
});

// Computed: Prüft ob ein Workspace-Video-Hintergrund vorhanden ist
const hasWorkspaceVideoBackground = computed(() => {
  if (!canvasManager.value) return false;
  return !!canvasManager.value.workspaceVideoBackground;
});

// ✨ NEU: Hintergrund-Ersetzung
const showBackgroundReplaceModal = ref(false);
const replaceType = ref('background'); // 'background' oder 'workspace'
const pendingBackgroundReplaceImage = ref(null);
const pendingBackgroundReplaceSrc = ref(null);
const bgReplaceFileInput = ref(null);

// ✨ NEU: Galerie für Hintergrund-Ersetzung
const showBgReplaceGallery = ref(false);
const bgGalleryCategories = ref([]);
const bgGalleryImages = ref([]);
const selectedBgCategory = ref(null);
const selectedBgGalleryImage = ref(null);
const bgGalleryLoading = ref(false);
const bgGalleryCategoryCache = ref(new Map());

// Computed: Aktuelles Hintergrundbild-Src für Thumbnail
const backgroundImageSrc = computed(() => {
  if (!canvasManager.value) return null;
  const bg = canvasManager.value.background;
  if (bg && typeof bg === 'object' && bg.imageObject) {
    return bg.imageObject.src;
  }
  return null;
});

// Computed: Aktuelles Workspace-Hintergrundbild-Src für Thumbnail
const workspaceBackgroundImageSrc = computed(() => {
  if (!canvasManager.value) return null;
  const wsBg = canvasManager.value.workspaceBackground;
  if (wsBg && wsBg.imageObject) {
    return wsBg.imageObject.src;
  }
  return null;
});

// Computed: Aktuelles Bild für das Ersetzen-Modal
const currentBackgroundForReplace = computed(() => {
  if (replaceType.value === 'workspace') {
    return workspaceBackgroundImageSrc.value;
  }
  return backgroundImageSrc.value;
});

// ✨ NEU: Öffnet das Modal zum Ersetzen des Hintergrundbildes
function openBackgroundReplaceModal(type) {
  replaceType.value = type;
  pendingBackgroundReplaceImage.value = null;
  pendingBackgroundReplaceSrc.value = null;
  showBackgroundReplaceModal.value = true;
  console.log(`🖼️ Hintergrund-Ersetzung Modal geöffnet für: ${type}`);
}

// ✨ NEU: Schließt das Modal
function closeBackgroundReplaceModal() {
  showBackgroundReplaceModal.value = false;
  pendingBackgroundReplaceImage.value = null;
  pendingBackgroundReplaceSrc.value = null;
  // Galerie-State zurücksetzen
  showBgReplaceGallery.value = false;
  selectedBgGalleryImage.value = null;
}

// ✨ NEU: Handler für Datei-Upload
function handleBackgroundReplaceFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      pendingBackgroundReplaceImage.value = img;
      pendingBackgroundReplaceSrc.value = e.target.result;
      console.log('🔍 Neues Hintergrundbild in Vorschau geladen:', img.naturalWidth, 'x', img.naturalHeight);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);

  // Input zurücksetzen für erneute Auswahl derselben Datei
  event.target.value = '';
}

// ✨ NEU: Vorschau bestätigen und Hintergrund ersetzen
function confirmBackgroundReplace() {
  if (!pendingBackgroundReplaceImage.value || !canvasManager.value) return;

  let result;
  if (replaceType.value === 'workspace') {
    result = canvasManager.value.replaceWorkspaceBackground(pendingBackgroundReplaceImage.value);
  } else {
    result = canvasManager.value.replaceBackground(pendingBackgroundReplaceImage.value);
  }

  if (result) {
    console.log(`✅ ${replaceType.value === 'workspace' ? 'Workspace-' : ''}Hintergrund erfolgreich ersetzt`);
  }

  closeBackgroundReplaceModal();
}

// ✨ NEU: Ersetzung abbrechen
function cancelBackgroundReplace() {
  pendingBackgroundReplaceImage.value = null;
  pendingBackgroundReplaceSrc.value = null;
  console.log('❌ Hintergrund-Ersetzen abgebrochen');
}

// ✨ NEU: Galerie-Funktionen für Hintergrund-Ersetzung
async function openBgReplaceGallery() {
  showBgReplaceGallery.value = true;
  selectedBgGalleryImage.value = null;

  // Galerie-Index laden wenn noch nicht geladen
  if (bgGalleryCategories.value.length === 0) {
    await loadBgGalleryIndex();
  }
}

function closeBgReplaceGallery() {
  showBgReplaceGallery.value = false;
  selectedBgGalleryImage.value = null;
}

async function loadBgGalleryIndex() {
  bgGalleryLoading.value = true;
  try {
    const paths = ['gallery/gallery.json', './gallery/gallery.json'];
    let response = null;

    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) break;
      } catch (e) {
        // Try next path
      }
    }

    if (!response || !response.ok) {
      throw new Error('Galerie konnte nicht geladen werden');
    }

    const data = await response.json();

    if (data._version === '2.0' && data.categories) {
      bgGalleryCategories.value = data.categories;

      // Erste Kategorie auswählen und laden
      if (bgGalleryCategories.value.length > 0) {
        await selectBgGalleryCategory(bgGalleryCategories.value[0].id);
      }
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden der Galerie:', error);
  } finally {
    bgGalleryLoading.value = false;
  }
}

async function selectBgGalleryCategory(categoryId) {
  if (selectedBgCategory.value === categoryId) return;

  selectedBgCategory.value = categoryId;
  selectedBgGalleryImage.value = null;

  // Prüfen ob bereits im Cache
  if (bgGalleryCategoryCache.value.has(categoryId)) {
    bgGalleryImages.value = bgGalleryCategoryCache.value.get(categoryId);
    return;
  }

  bgGalleryLoading.value = true;
  try {
    const categoryInfo = bgGalleryCategories.value.find(c => c.id === categoryId);
    if (!categoryInfo || !categoryInfo.jsonFile) {
      bgGalleryImages.value = [];
      return;
    }

    const response = await fetch(categoryInfo.jsonFile);
    if (!response.ok) {
      throw new Error(`Kategorie ${categoryId} konnte nicht geladen werden`);
    }

    const data = await response.json();
    const images = data.images || [];

    // Im Cache speichern
    bgGalleryCategoryCache.value.set(categoryId, images);
    bgGalleryImages.value = images;
  } catch (error) {
    console.error('❌ Fehler beim Laden der Kategorie:', error);
    bgGalleryImages.value = [];
  } finally {
    bgGalleryLoading.value = false;
  }
}

function selectBgGalleryImage(image) {
  selectedBgGalleryImage.value = image;
}

async function confirmBgReplaceFromGallery() {
  if (!selectedBgGalleryImage.value) {
    closeBgReplaceGallery();
    return;
  }

  const imagePath = selectedBgGalleryImage.value.file;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imagePath;
    });

    // Speichere in Vorschau-Zustand
    pendingBackgroundReplaceImage.value = img;
    pendingBackgroundReplaceSrc.value = imagePath;
    console.log('🔍 Galeriebild in Vorschau geladen:', imagePath);

    closeBgReplaceGallery();
  } catch (error) {
    console.error('❌ Fehler beim Laden des Galeriebildes:', error);
  }
}

// Toggle Flip Horizontal für Bild-Hintergrund
function toggleBgFlipH() {
  if (!canvasManager.value || !hasImageBackground.value) return;
  bgFlipH.value = !bgFlipH.value;
  canvasManager.value.updateBackgroundFlip(bgFlipH.value, bgFlipV.value);
  console.log('🔄 Hintergrund Flip H:', bgFlipH.value);
}

// Toggle Flip Vertical für Bild-Hintergrund
function toggleBgFlipV() {
  if (!canvasManager.value || !hasImageBackground.value) return;
  bgFlipV.value = !bgFlipV.value;
  canvasManager.value.updateBackgroundFlip(bgFlipH.value, bgFlipV.value);
  console.log('🔄 Hintergrund Flip V:', bgFlipV.value);
}

// Toggle Flip Horizontal für Workspace-Hintergrund
function toggleWsBgFlipH() {
  if (!canvasManager.value || !hasWorkspaceBackground.value) return;
  wsBgFlipH.value = !wsBgFlipH.value;
  canvasManager.value.updateWorkspaceBackgroundFlip(wsBgFlipH.value, wsBgFlipV.value);
  console.log('🔄 Workspace-Hintergrund Flip H:', wsBgFlipH.value);
}

// Toggle Flip Vertical für Workspace-Hintergrund
function toggleWsBgFlipV() {
  if (!canvasManager.value || !hasWorkspaceBackground.value) return;
  wsBgFlipV.value = !wsBgFlipV.value;
  canvasManager.value.updateWorkspaceBackgroundFlip(wsBgFlipH.value, wsBgFlipV.value);
  console.log('🔄 Workspace-Hintergrund Flip V:', wsBgFlipV.value);
}

// ✨ NEU: Presets für Hintergrund-Einstellungen
const PRESETS_STORAGE_KEY = 'visualizer-canvas-presets';
const savedPresets = ref([]);

// Presets aus localStorage laden
function loadPresets() {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (stored) {
      savedPresets.value = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Fehler beim Laden der Presets:', e);
  }
}

// Presets in localStorage speichern
function persistPresets() {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(savedPresets.value));
  } catch (e) {
    console.warn('Fehler beim Speichern der Presets:', e);
  }
}

// Aktuellen Zustand als Preset speichern
function saveCurrentAsPreset() {
  // Debug: Aktuelle Werte anzeigen
  console.log('🔍 Aktuelle Werte vor dem Speichern:');
  console.log('  - gradientEnabled:', gradientEnabled.value);
  console.log('  - backgroundColor:', backgroundColor.value);
  console.log('  - bgAudioEnabled:', bgAudioEnabled.value);

  const presetNumber = savedPresets.value.length + 1;
  const newPreset = {
    id: Date.now(),
    name: `Preset ${presetNumber}`,
    backgroundColor: backgroundColor.value,
    backgroundOpacity: backgroundOpacity.value,
    // ✅ Explizit Boolean verwenden
    gradientEnabled: Boolean(gradientEnabled.value),
    gradientColor2: gradientColor2.value,
    gradientType: gradientType.value,
    gradientAngle: gradientAngle.value,
    // Audio-reaktive Einstellungen
    bgAudioEnabled: Boolean(bgAudioEnabled.value),
    bgAudioSource: bgAudioSource.value,
    bgAudioSmoothing: bgAudioSmoothing.value,
    bgEffects: {
      hue: { enabled: Boolean(bgEffectHue.value), intensity: bgEffectHueIntensity.value },
      brightness: { enabled: Boolean(bgEffectBrightness.value), intensity: bgEffectBrightnessIntensity.value },
      saturation: { enabled: Boolean(bgEffectSaturation.value), intensity: bgEffectSaturationIntensity.value },
      glow: { enabled: Boolean(bgEffectGlow.value), intensity: bgEffectGlowIntensity.value },
      gradientPulse: { enabled: Boolean(bgEffectGradientPulse.value), intensity: bgEffectGradientPulseIntensity.value },
      gradientRotation: { enabled: Boolean(bgEffectGradientRotation.value), intensity: bgEffectGradientRotationIntensity.value }
    }
  };

  savedPresets.value.push(newPreset);
  persistPresets();
  console.log('✅ Canvas-Preset gespeichert:', newPreset);
}

// Preset laden
function loadPreset(preset) {
  console.log('📥 Lade Canvas-Preset:', preset);

  try {
    // Grundfarbe
    backgroundColor.value = preset.backgroundColor;
    backgroundOpacity.value = preset.backgroundOpacity;
    console.log('  → Farbe:', preset.backgroundColor, 'Deckkraft:', preset.backgroundOpacity);

    // Gradient
    gradientEnabled.value = preset.gradientEnabled || false;
    gradientColor2.value = preset.gradientColor2 || '#0066ff';
    gradientType.value = preset.gradientType || 'radial';
    gradientAngle.value = preset.gradientAngle || 45;

    // Audio-reaktiv
    bgAudioEnabled.value = preset.bgAudioEnabled || false;
    bgAudioSource.value = preset.bgAudioSource || 'bass';
    bgAudioSmoothing.value = preset.bgAudioSmoothing || 50;

    if (preset.bgEffects) {
      bgEffectHue.value = preset.bgEffects.hue?.enabled || false;
      bgEffectHueIntensity.value = preset.bgEffects.hue?.intensity || 80;
      bgEffectBrightness.value = preset.bgEffects.brightness?.enabled || false;
      bgEffectBrightnessIntensity.value = preset.bgEffects.brightness?.intensity || 80;
      bgEffectSaturation.value = preset.bgEffects.saturation?.enabled || false;
      bgEffectSaturationIntensity.value = preset.bgEffects.saturation?.intensity || 80;
      bgEffectGlow.value = preset.bgEffects.glow?.enabled || false;
      bgEffectGlowIntensity.value = preset.bgEffects.glow?.intensity || 80;
      bgEffectGradientPulse.value = preset.bgEffects.gradientPulse?.enabled || false;
      bgEffectGradientPulseIntensity.value = preset.bgEffects.gradientPulse?.intensity || 80;
      bgEffectGradientRotation.value = preset.bgEffects.gradientRotation?.enabled || false;
      bgEffectGradientRotationIntensity.value = preset.bgEffects.gradientRotation?.intensity || 80;
    }

    // Canvas aktualisieren
    updateFromColorPicker();
    // ✅ FIX: Gradient-Einstellungen IMMER aktualisieren (auch zum Deaktivieren!)
    updateGradientSettings();
    // ✅ FIX: Audio-Einstellungen IMMER aktualisieren (auch zum Deaktivieren!)
    updateBgAudioReactive();

    console.log('✅ Canvas-Preset erfolgreich geladen:', preset.name);
  } catch (error) {
    console.error('❌ Fehler beim Laden des Canvas-Presets:', error);
  }
}

// Preset löschen
function deletePreset(presetId) {
  savedPresets.value = savedPresets.value.filter(p => p.id !== presetId);
  persistPresets();
  console.log('🗑️ Preset gelöscht');
}

// Computed: Kann Undo ausgeführt werden?
const canUndo = computed(() => undoHistory.value.length > 0);

// ===== HILFSFUNKTIONEN FÜR FARBKONVERTIERUNG =====

// Konvertiere Hex zu RGBA
function hexToRGBA(hex, alpha) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Konvertiere RGB-Werte zu Hex
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Parse RGBA String zu Komponenten
function parseRGBA(rgbaString) {
  // Unterstützt: rgba(255, 0, 0, 0.5) oder rgb(255, 0, 0)
  const match = rgbaString.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1.0
    };
  }
  return null;
}

// ===== UPDATE-FUNKTIONEN =====

// Aktualisiere colorDisplay basierend auf aktuellen Werten
function updateColorDisplay() {
  colorDisplay.value = hexToRGBA(backgroundColor.value, backgroundOpacity.value);
}

// Update vom Color Picker (nur Farbe, keine Transparenz)
function updateFromColorPicker() {
  updateColorDisplay();
  applyBackgroundColor();
}

// Update vom Opacity Slider
function updateFromOpacitySlider() {
  updateColorDisplay();
  applyBackgroundColor();
}

// Update vom Text Input
function updateFromTextInput() {
  const input = colorDisplay.value.trim();
  
  // Versuche RGBA zu parsen
  const rgba = parseRGBA(input);
  if (rgba) {
    backgroundColor.value = rgbToHex(rgba.r, rgba.g, rgba.b);
    backgroundOpacity.value = rgba.a;
    applyBackgroundColor();
    return;
  }
  
  // Versuche Hex zu parsen
  if (input.match(/^#[0-9A-Fa-f]{6}$/)) {
    backgroundColor.value = input;
    // Behalte die aktuelle Opacity bei
    applyBackgroundColor();
    return;
  }
  
  // Ungültiges Format - keine Aktion
}

// Formatiere die Anzeige beim Verlassen des Feldes
function formatColorDisplay() {
  updateColorDisplay();
}

// Wende die Hintergrundfarbe an
function applyBackgroundColor() {
  if (!canvasManager.value) {
    console.warn('⚠️ CanvasManager nicht verfügbar');
    return;
  }

  // Speichere Zustand VOR der Änderung
  saveCanvasState();

  // Konvertiere zu RGBA mit aktueller Deckkraft
  const rgbaColor = hexToRGBA(backgroundColor.value, backgroundOpacity.value);

  console.log('🎨 Setze Hintergrundfarbe:', rgbaColor);
  canvasManager.value.setBackground(rgbaColor);
}

// ✨ NEU: Aktualisiere Audio-Reaktiv Einstellungen für Hintergrundfarbe
function updateBgAudioReactive() {
  if (!canvasManager.value) return;

  const settings = {
    enabled: bgAudioEnabled.value,
    source: bgAudioSource.value,
    smoothing: bgAudioSmoothing.value,
    effects: {
      hue: { enabled: bgEffectHue.value, intensity: bgEffectHueIntensity.value },
      brightness: { enabled: bgEffectBrightness.value, intensity: bgEffectBrightnessIntensity.value },
      saturation: { enabled: bgEffectSaturation.value, intensity: bgEffectSaturationIntensity.value },
      glow: { enabled: bgEffectGlow.value, intensity: bgEffectGlowIntensity.value },
      strobe: { enabled: bgEffectStrobe.value, intensity: bgEffectStrobeIntensity.value },
      contrast: { enabled: bgEffectContrast.value, intensity: bgEffectContrastIntensity.value },
      gradientPulse: { enabled: bgEffectGradientPulse.value, intensity: bgEffectGradientPulseIntensity.value },
      gradientRotation: { enabled: bgEffectGradientRotation.value, intensity: bgEffectGradientRotationIntensity.value }
    }
  };

  canvasManager.value.setBackgroundColorAudioReactive(settings);
  console.log('🎵 Hintergrund Audio-Reaktiv:', settings);
}

// ✨ NEU: Aktualisiere Gradient-Einstellungen
function updateGradientSettings() {
  if (!canvasManager.value) return;

  canvasManager.value.setGradientSettings({
    enabled: gradientEnabled.value,
    color2: gradientColor2.value,
    type: gradientType.value,
    angle: gradientAngle.value
  });

  console.log('🌈 Gradient:', {
    enabled: gradientEnabled.value,
    color2: gradientColor2.value,
    type: gradientType.value,
    angle: gradientAngle.value
  });
}

// ===== UNDO-SYSTEM =====

// Speichere den aktuellen Canvas-Zustand
function saveCanvasState() {
  if (!canvasManager.value) return;
  
  const state = {
    background: canvasManager.value.background,
    workspaceBackground: canvasManager.value.workspaceBackground,
    backgroundColor: backgroundColor.value,
    backgroundOpacity: backgroundOpacity.value,
    images: canvasManager.value.multiImageManager ? 
      canvasManager.value.multiImageManager.getAllImages().map(img => ({
        id: img.id,
        type: img.type,
        relX: img.relX,
        relY: img.relY,
        relWidth: img.relWidth,
        relHeight: img.relHeight,
        rotation: img.rotation,
        imageObject: img.imageObject
      })) : [],
    texts: canvasManager.value.textManager && canvasManager.value.textManager.textObjects ? 
      JSON.parse(JSON.stringify(canvasManager.value.textManager.textObjects)) : [],
    timestamp: Date.now()
  };
  
  undoHistory.value.push(state);
  
  if (undoHistory.value.length > MAX_HISTORY) {
    undoHistory.value.shift();
  }
  
  console.log('💾 Canvas-Zustand gespeichert');
}

// Stelle den letzten Zustand wieder her
function undoLastChange() {
  if (undoHistory.value.length === 0 || !canvasManager.value) {
    console.warn('⚠️ Kein Verlauf vorhanden');
    return;
  }
  
  const lastState = undoHistory.value.pop();
  
  // Stelle Hintergrund wieder her
  if (lastState.background !== undefined) {
    canvasManager.value.background = lastState.background;
  }
  
  // Stelle Farbe und Opacity wieder her
  if (lastState.backgroundColor !== undefined) {
    backgroundColor.value = lastState.backgroundColor;
  }
  if (lastState.backgroundOpacity !== undefined) {
    backgroundOpacity.value = lastState.backgroundOpacity;
  }
  updateColorDisplay();
  
  // Stelle Workspace-Hintergrund wieder her
  if (lastState.workspaceBackground !== undefined) {
    canvasManager.value.workspaceBackground = lastState.workspaceBackground;
  }
  
  // Stelle Bilder wieder her
  if (canvasManager.value.multiImageManager && lastState.images) {
    canvasManager.value.multiImageManager.images = [...lastState.images];
  }
  
  // Stelle Texte wieder her
  if (canvasManager.value.textManager && lastState.texts) {
    canvasManager.value.textManager.textObjects = JSON.parse(JSON.stringify(lastState.texts));
  }
  
  // Redraw
  if (canvasManager.value.redrawCallback) {
    canvasManager.value.redrawCallback();
  }
  
  // Update UI
  if (canvasManager.value.updateUICallback) {
    canvasManager.value.updateUICallback();
  }
  
  console.log('✅ Zustand wiederhergestellt');
}

// ===== RESET-FUNKTIONEN =====

// Prüfe ob Canvas leer ist
const isCanvasEmpty = computed(() => {
  if (!canvasManager.value) return true;
  return canvasManager.value.isCanvasEmpty();
});

// ✨ NEU: Nur normalen Hintergrund zurücksetzen
function resetNormalBackground() {
  if (!canvasManager.value) {
    console.warn('⚠️ CanvasManager nicht verfügbar');
    return;
  }

  saveCanvasState();

  console.log('🔄 Setze normalen Hintergrund zurück');
  canvasManager.value.setBackground('#ffffff');
  backgroundColor.value = '#ffffff';
  backgroundOpacity.value = 1.0;

  // Flip-Zustände für normalen Hintergrund zurücksetzen
  bgFlipH.value = false;
  bgFlipV.value = false;

  // Video-Hintergrund zurücksetzen
  if (canvasManager.value.videoBackground) {
    const video = canvasManager.value.videoBackground.videoElement;
    if (video) {
      video.pause();
      video.src = '';
    }
    canvasManager.value.videoBackground = null;
    console.log('🗑️ Video-Hintergrund entfernt');
  }

  canvasManager.value.redrawCallback();
  updateColorDisplay();
  console.log('✅ Normaler Hintergrund zurückgesetzt');
}

// ✨ NEU: Nur Workspace-Hintergrund zurücksetzen
function resetWorkspaceBackgroundOnly() {
  if (!canvasManager.value) {
    console.warn('⚠️ CanvasManager nicht verfügbar');
    return;
  }

  saveCanvasState();

  console.log('🔄 Setze Workspace-Hintergrund zurück');
  canvasManager.value.workspaceBackground = null;

  // Flip-Zustände für Workspace-Hintergrund zurücksetzen
  wsBgFlipH.value = false;
  wsBgFlipV.value = false;

  // Workspace-Video-Hintergrund zurücksetzen
  if (canvasManager.value.workspaceVideoBackground) {
    const wsVideo = canvasManager.value.workspaceVideoBackground.videoElement;
    if (wsVideo) {
      wsVideo.pause();
      wsVideo.src = '';
    }
    canvasManager.value.workspaceVideoBackground = null;
    console.log('🗑️ Workspace-Video-Hintergrund entfernt');
  }

  canvasManager.value.redrawCallback();
  console.log('✅ Workspace-Hintergrund zurückgesetzt');
}

// ✨ NEU: Alle Hintergründe zurücksetzen
function resetAllBackgrounds() {
  if (!canvasManager.value) {
    console.warn('⚠️ CanvasManager nicht verfügbar');
    return;
  }

  saveCanvasState();

  console.log('🔄 Setze alle Hintergründe zurück');

  // Normaler Hintergrund
  canvasManager.value.setBackground('#ffffff');
  backgroundColor.value = '#ffffff';
  backgroundOpacity.value = 1.0;

  // Workspace-Hintergrund
  canvasManager.value.workspaceBackground = null;

  // Alle Flip-Zustände zurücksetzen
  bgFlipH.value = false;
  bgFlipV.value = false;
  wsBgFlipH.value = false;
  wsBgFlipV.value = false;

  // Video-Hintergrund zurücksetzen
  if (canvasManager.value.videoBackground) {
    const video = canvasManager.value.videoBackground.videoElement;
    if (video) {
      video.pause();
      video.src = '';
    }
    canvasManager.value.videoBackground = null;
    console.log('🗑️ Video-Hintergrund entfernt');
  }

  // Workspace-Video-Hintergrund zurücksetzen
  if (canvasManager.value.workspaceVideoBackground) {
    const wsVideo = canvasManager.value.workspaceVideoBackground.videoElement;
    if (wsVideo) {
      wsVideo.pause();
      wsVideo.src = '';
    }
    canvasManager.value.workspaceVideoBackground = null;
    console.log('🗑️ Workspace-Video-Hintergrund entfernt');
  }

  canvasManager.value.redrawCallback();
  updateColorDisplay();
  console.log('✅ Alle Hintergründe zurückgesetzt');
}

// Bestätige Canvas-Reset
function confirmReset() {
  if (!canvasManager.value) {
    console.warn('⚠️ CanvasManager nicht verfügbar');
    return;
  }
  
  saveCanvasState();
  
  console.log('🗑️ Setze Canvas komplett zurück');
  canvasManager.value.reset();
  backgroundColor.value = '#ffffff';
  backgroundOpacity.value = 1.0;
  updateColorDisplay();
  showResetConfirm.value = false;
  console.log('✅ Canvas zurückgesetzt');
}

// ===== LIFECYCLE =====

// Watcher: Synchronisiere colorDisplay mit backgroundColor und backgroundOpacity
watch([backgroundColor, backgroundOpacity], () => {
  updateColorDisplay();
});

// ✨ NEU: Watcher für Hintergrund-Flip-Synchronisation
watch(
  () => canvasManager.value?.background,
  (newBg) => {
    if (newBg && typeof newBg === 'object' && newBg.fotoSettings) {
      bgFlipH.value = newBg.fotoSettings.flipH || false;
      bgFlipV.value = newBg.fotoSettings.flipV || false;
    } else {
      bgFlipH.value = false;
      bgFlipV.value = false;
    }
  },
  { deep: true }
);

// ✨ NEU: Watcher für Workspace-Hintergrund-Flip-Synchronisation
watch(
  () => canvasManager.value?.workspaceBackground,
  (newWsBg) => {
    if (newWsBg && newWsBg.fotoSettings) {
      wsBgFlipH.value = newWsBg.fotoSettings.flipH || false;
      wsBgFlipV.value = newWsBg.fotoSettings.flipV || false;
    } else {
      wsBgFlipH.value = false;
      wsBgFlipV.value = false;
    }
  },
  { deep: true }
);

// ✅ FIX: Initialisierungsfunktion für Canvas-Einstellungen
function initializeCanvasSettings() {
  if (!canvasManager.value) return false;

  // ✅ Canvas startet IMMER mit weißem Hintergrund (Grundeinstellung)
  canvasManager.value.setBackground('#ffffff');
  backgroundColor.value = '#ffffff';
  backgroundOpacity.value = 1.0;
  updateColorDisplay();
  console.log('✅ CanvasControlPanel initialisiert - Hintergrund auf Weiß gesetzt');
  return true;
}

// ✅ KRITISCHER FIX: Watcher auf canvasManager
// Vue Lifecycle: Kinder werden VOR dem Eltern-onMounted gemountet.
// Daher ist canvasManager.value in Kind-onMounted() noch NULL.
// Dieser Watcher reagiert, sobald der Eltern-onMounted den CanvasManager setzt.
watch(
  () => canvasManager.value,
  (newValue) => {
    if (newValue) {
      console.log('✅ CanvasManager verfügbar - initialisiere Einstellungen');
      nextTick(() => {
        initializeCanvasSettings();
      });
    }
  },
  { immediate: true }
);

// Initialisiere beim Mounting
onMounted(() => {
  // ✅ Gespeicherte Presets laden
  loadPresets();

  // ✅ Versuche Initialisierung (falls canvasManager bereits verfügbar)
  if (!initializeCanvasSettings()) {
    console.log('⏳ CanvasControlPanel mounted - warte auf CanvasManager...');
  }
});
</script>

<style scoped>
.panel {
  background-color: var(--card-bg, #151b1d);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 8px;
  padding: 10px;
  color: var(--text-primary, #E9E9EB);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0;
  user-select: none;
  transition: all 0.2s;
}

.panel-header:hover h3 {
  color: var(--accent-tertiary, #BCE5E5);
}

.chevron {
  font-size: 8px;
  color: var(--accent-primary, #609198);
  transition: transform 0.2s;
  display: inline-block;
  margin-left: 6px;
}

.chevron.open {
  transform: rotate(180deg);
}

.panel-content {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h3 {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary, #E9E9EB);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

h3::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M9 3v18M15 3v18M3 9h18M3 15h18'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.8));
}

h4 {
  margin: 0 0 5px 0;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--text-muted, #A8A992);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.panel-section {
  margin-bottom: 8px;
}

.undo-section {
  background-color: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 5px;
  padding: 8px;
}

.control-group {
  margin-bottom: 6px;
}

.control-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.6rem;
  color: var(--text-muted, #A8A992);
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
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--secondary-bg, #1c2426);
}

.color-text-input {
  flex: 1;
  padding: 5px 7px;
  background-color: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 4px;
  color: var(--text-primary, #E9E9EB);
  font-size: 0.6rem;
  font-family: 'Courier New', monospace;
}

.color-text-input:focus {
  outline: none;
  border-color: var(--accent-primary, #609198);
}

/* Styles für den Deckkraft-Slider */
.opacity-slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(to right, var(--text-muted, #A8A992) 0%, var(--accent-primary, #609198) 100%);
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
  background-color: var(--accent-tertiary, #BCE5E5);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.opacity-slider::-webkit-slider-thumb:hover {
  background-color: var(--accent-primary, #609198);
  transform: scale(1.1);
}

.opacity-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background-color: var(--accent-tertiary, #BCE5E5);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.opacity-slider::-moz-range-thumb:hover {
  background-color: var(--accent-primary, #609198);
  transform: scale(1.1);
}

.info-text {
  font-size: 0.55rem;
  color: var(--text-muted, #A8A992);
  line-height: 1.3;
  margin: 0 0 6px 0;
}

.info-text.warning {
  color: #FF9800;
  font-weight: 500;
}

.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #A8A992);
  font-style: italic;
}

.btn-primary,
.btn-secondary,
.btn-danger,
.btn-undo {
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-undo {
  background: rgba(255, 152, 0, 0.2);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.btn-undo:hover {
  background: rgba(255, 152, 0, 0.3);
  transform: translateY(-1px);
}

.btn-primary {
  background: rgba(96, 145, 152, 0.2);
  color: var(--accent-tertiary, #BCE5E5);
  border: 1px solid rgba(96, 145, 152, 0.3);
}

.btn-primary:hover {
  background: rgba(96, 145, 152, 0.3);
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: var(--secondary-bg, #1c2426);
  color: var(--text-primary, #E9E9EB);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
}

.btn-secondary:hover {
  background-color: var(--btn-hover, #2a3335);
  border-color: var(--accent-primary, #609198);
  transform: translateY(-1px);
}

.btn-danger {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.3);
  transform: translateY(-1px);
}

.btn-danger:disabled {
  background-color: var(--secondary-bg, #1c2426);
  color: var(--text-muted, #A8A992);
  cursor: not-allowed;
  opacity: 0.5;
}

.full-width {
  width: 100%;
}

.divider {
  height: 1px;
  background-color: var(--border-color, rgba(158, 190, 193, 0.2));
  margin: 8px 0;
}

/* Bestätigungs-Dialog */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-dialog {
  background-color: var(--card-bg, #151b1d);
  border: 1px solid rgba(244, 67, 54, 0.5);
  border-radius: 8px;
  padding: 12px;
  max-width: 300px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.confirm-dialog h4 {
  margin: 0 0 8px 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: #F44336;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.confirm-dialog p {
  margin: 0 0 12px 0;
  font-size: 0.6rem;
  line-height: 1.5;
  color: var(--text-primary, #E9E9EB);
}

.confirm-actions {
  display: flex;
  gap: 8px;
}

.confirm-actions button {
  flex: 1;
}

/* ✨ Gradient Styles */
.gradient-section {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #151b1d) 0%, rgba(96, 145, 152, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-left: 2px solid var(--accent-primary, #609198);
  border-radius: 6px;
}

.gradient-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary, #BCE5E5);
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
  background: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #E9E9EB);
  font-size: 0.6rem;
  cursor: pointer;
}

.gradient-select:hover {
  border-color: var(--accent-primary, #609198);
}

.gradient-select:focus {
  outline: none;
  border-color: var(--accent-primary, #609198);
}

.angle-slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(to right, var(--text-muted, #A8A992) 0%, var(--accent-primary, #609198) 100%);
  border-radius: 2px;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.angle-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #BCE5E5);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.color-hex {
  font-size: 0.55rem;
  color: var(--text-muted, #A8A992);
  font-family: monospace;
}

/* ✨ Audio-Reaktiv Styles */
.audio-reactive-section {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #151b1d) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
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
  color: var(--text-primary, #E9E9EB);
}

.checkbox-label input[type="checkbox"] {
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
  background: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #E9E9EB);
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
  background: linear-gradient(90deg, var(--text-muted, #A8A992) 0%, #8b5cf6 100%);
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
  background: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.15));
  border-radius: 5px;
  font-size: 0.55rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.effect-item:hover {
  border-color: var(--border-color, rgba(158, 190, 193, 0.3));
}

.effect-item input[type="checkbox"] {
  width: 12px;
  height: 12px;
  accent-color: #8b5cf6;
}

.effect-slider {
  width: 50px;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--text-muted, #A8A992) 0%, #8b5cf6 100%);
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
  color: var(--text-muted, #A8A992);
  min-width: 28px;
  text-align: right;
}

/* ✨ Preset Styles */
.presets-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.presets-list > label {
  font-size: 0.55rem;
  color: var(--text-muted, #A8A992);
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 7px;
  background: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 5px;
  transition: all 0.2s ease;
}

.preset-item:hover {
  border-color: var(--accent-primary, #609198);
  background: var(--btn-hover, #2a3335);
}

.preset-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-name {
  font-size: 0.6rem;
  color: var(--text-primary, #E9E9EB);
  font-weight: 500;
}

.preset-preview {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
}

.preset-actions {
  display: flex;
  gap: 4px;
}

.btn-small {
  padding: 3px 6px;
  font-size: 0.65rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-load {
  background: rgba(96, 145, 152, 0.2);
}

.btn-load:hover {
  background: rgba(96, 145, 152, 0.4);
}

.btn-delete {
  background: rgba(244, 67, 54, 0.2);
}

.btn-delete:hover {
  background: rgba(244, 67, 54, 0.4);
}

/* ✨ NEU: Flip-Section Styles */
.flip-section {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #151b1d) 0%, rgba(96, 145, 152, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-left: 2px solid var(--accent-primary, #609198);
  border-radius: 6px;
}

.flip-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary, #BCE5E5);
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
  background: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #E9E9EB);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.flip-button:hover {
  background: var(--btn-hover, #2a3335);
  border-color: var(--accent-primary, #609198);
}

.flip-button.active {
  background: rgba(96, 145, 152, 0.3);
  border-color: var(--accent-primary, #609198);
  color: var(--accent-tertiary, #BCE5E5);
}

/* ✨ NEU: Background Thumbnail Styles */
.background-thumb-section {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #151b1d) 0%, rgba(96, 145, 152, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-left: 2px solid var(--accent-primary, #609198);
  border-radius: 6px;
}

.background-thumb-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary, #BCE5E5);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.background-thumb {
  position: relative;
  width: 100%;
  height: 60px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.background-thumb:hover {
  border-color: var(--accent-primary, #609198);
  box-shadow: 0 0 8px rgba(96, 145, 152, 0.3);
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
  color: var(--text-primary, #E9E9EB);
  font-size: 0.5rem;
  text-align: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.background-thumb:hover .thumb-hint {
  opacity: 1;
}

/* ✨ NEU: Background Replace Modal Styles */
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
  background: var(--card-bg, #151b1d);
  border: 1px solid var(--accent-primary, #609198);
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
  color: #F44336;
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
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 8px;
  overflow: hidden;
  background: var(--secondary-bg, #1c2426);
}

.bg-replace-modal-image-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bg-replace-modal-info h3 {
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  color: var(--text-primary, #E9E9EB);
}

.bg-replace-hint {
  font-size: 0.55rem;
  color: var(--accent-primary, #609198);
  margin: 0 0 12px 0;
  padding: 6px 8px;
  background: rgba(96, 145, 152, 0.1);
  border-radius: 4px;
  border-left: 2px solid var(--accent-primary, #609198);
}

.bg-replace-modal-actions {
  display: flex;
  gap: 8px;
}

.btn-replace {
  flex: 1;
  padding: 8px 12px;
  background: rgba(96, 145, 152, 0.2);
  border: 1px solid var(--accent-primary, #609198);
  border-radius: 6px;
  color: var(--accent-tertiary, #BCE5E5);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-replace:hover {
  background: rgba(96, 145, 152, 0.3);
  transform: translateY(-1px);
}

.pending-bg-replace-preview {
  margin-top: 12px;
  padding: 10px;
  background: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 8px;
}

.pending-bg-replace-header {
  margin-bottom: 8px;
}

.pending-bg-replace-label {
  font-size: 0.6rem;
  color: var(--accent-tertiary, #BCE5E5);
  font-weight: 600;
}

.pending-bg-replace-image-container {
  width: 100%;
  height: 100px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
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
  color: #F44336;
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
  color: #4CAF50;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm-replace:hover {
  background: rgba(76, 175, 80, 0.3);
}

/* ✨ NEU: Galerie-Styles für Hintergrund-Ersetzung */
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
  background: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
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
  background: var(--card-bg, #151b1d);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 5px;
  color: var(--text-primary, #E9E9EB);
  font-size: 0.55rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.bg-category-tab:hover {
  border-color: var(--accent-primary, #609198);
}

.bg-category-tab.active {
  background: rgba(96, 145, 152, 0.2);
  border-color: var(--accent-primary, #609198);
  color: var(--accent-tertiary, #BCE5E5);
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
  color: var(--text-muted, #A8A992);
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
  border-color: var(--accent-primary, #609198);
  transform: scale(1.05);
}

.bg-gallery-item.selected {
  border-color: #4CAF50;
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
  color: #F44336;
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
  color: #4CAF50;
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

/* ✨ NEU: Reset-Optionen Styles */
.reset-options {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.btn-reset-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  background: var(--secondary-bg, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #E9E9EB);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset-option:hover:not(:disabled) {
  background: var(--btn-hover, #2a3335);
  border-color: var(--accent-primary, #609198);
  color: var(--accent-tertiary, #BCE5E5);
}

.btn-reset-option:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
