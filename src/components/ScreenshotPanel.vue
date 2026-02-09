<template>
  <div class="screenshot-panel">
    <div class="panel-header">
      <h3>{{ t('screenshot.title') }}</h3>
      <HelpTooltip
        :title="t('screenshot.helpTitle')"
        icon="📷"
        :text="t('screenshot.helpText')"
        :tip="t('screenshot.helpTip')"
        position="left"
        :large="true"
      />
    </div>

    <!-- Format Selection -->
    <div class="control-section">
      <span class="section-label">{{ t('screenshot.format') }}</span>
      <div class="format-buttons">
        <button
          v-for="fmt in formats"
          :key="fmt.value"
          class="format-btn"
          :class="{ active: selectedFormat === fmt.value }"
          @click="selectedFormat = fmt.value"
        >
          {{ fmt.label }}
        </button>
      </div>
    </div>

    <!-- Quality Slider (for JPG and WebP) -->
    <div class="control-section" v-if="selectedFormat !== 'png'">
      <div class="section-header">
        <span class="section-label">{{ t('screenshot.quality') }}</span>
        <span class="quality-value">{{ quality }}%</span>
      </div>
      <input
        type="range"
        v-model="quality"
        min="10"
        max="100"
        step="5"
        class="quality-slider"
      />
      <div class="quality-hints">
        <span>{{ t('screenshot.lowQuality') }}</span>
        <span>{{ t('screenshot.highQuality') }}</span>
      </div>
    </div>

    <!-- PNG Info -->
    <div class="control-section info-section" v-if="selectedFormat === 'png'">
      <p class="format-info">
        <span class="info-icon">ℹ️</span>
        {{ t('screenshot.pngInfo') }}
      </p>
    </div>

    <!-- Screenshot Button -->
    <button
      class="btn btn-screenshot"
      @click="takeScreenshot"
      :disabled="isProcessing"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      {{ isProcessing ? t('screenshot.processing') : t('screenshot.capture') }}
    </button>

    <!-- Preview & Download (after screenshot taken) -->
    <div class="preview-section" v-if="previewUrl">
      <div class="preview-header">
        <span class="section-label">{{ t('screenshot.preview') }}</span>
        <button class="btn-close-preview" @click="clearPreview" :title="t('common.close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div
        class="preview-container"
        @dblclick="openFullscreenPreview"
        :title="t('screenshot.doubleClickHint')"
      >
        <img :src="previewUrl" alt="Screenshot Preview" class="preview-image" />
        <div class="preview-zoom-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>
      </div>
      <div class="preview-info">
        <span class="file-size">{{ fileSize }}</span>
        <span class="file-dimensions">{{ fileDimensions }}</span>
      </div>
      <a
        :href="previewUrl"
        :download="fileName"
        class="btn btn-download"
        @click="handleDownload"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {{ t('screenshot.download') }}
      </a>
    </div>

    <!-- Fullscreen Preview Modal -->
    <Teleport to="body">
      <div
        v-if="showFullscreenPreview"
        class="fullscreen-modal-overlay"
        @click="closeFullscreenPreview"
        @keydown.esc="closeFullscreenPreview"
      >
        <div class="fullscreen-modal" @click.stop>
          <!-- Close Button (floating) -->
          <button class="btn-close-floating" @click="closeFullscreenPreview" :title="t('common.close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- Modal Image -->
          <div class="modal-image-container">
            <img :src="previewUrl" alt="Screenshot" class="modal-image" />
          </div>

          <!-- Compact Footer with Metadata + Download -->
          <div class="modal-footer">
            <div class="metadata-inline">
              <span class="metadata-tag">{{ formatLabel }}</span>
              <span class="metadata-text">{{ fileDimensions }}</span>
              <span class="metadata-divider">•</span>
              <span class="metadata-text">{{ fileSize }}</span>
            </div>
            <a
              :href="previewUrl"
              :download="fileName"
              class="btn-download-icon"
              @click="handleDownload"
              :title="t('screenshot.download')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { useToastStore } from '../stores/toastStore.js';
import HelpTooltip from './HelpTooltip.vue';

const { t } = useI18n();
const toastStore = useToastStore();

// State
const selectedFormat = ref('png');
const quality = ref(90);
const isProcessing = ref(false);
const previewUrl = ref(null);
const fileName = ref('');
const fileSize = ref('');
const fileDimensions = ref('');
const showFullscreenPreview = ref(false);

// Computed
const formatLabel = computed(() => {
  const format = formats.find(f => f.value === selectedFormat.value);
  return format ? format.label : selectedFormat.value.toUpperCase();
});

// Format options
const formats = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'webp', label: 'WebP' }
];

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}

/**
 * Take a screenshot of the canvas (pure content without UI elements)
 * Uses the global takeCanvasScreenshot function from VisualizerApp.vue
 */
async function takeScreenshot() {
  // Check if the screenshot function is available
  if (typeof window.takeCanvasScreenshot !== 'function') {
    console.error('[ScreenshotPanel] takeCanvasScreenshot function not available');
    toastStore.error(t('screenshot.canvasNotFound'));
    return;
  }

  isProcessing.value = true;

  try {
    // Clear previous preview
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }

    // Determine MIME type and quality
    const mimeType = `image/${selectedFormat.value}`;
    const qualityValue = quality.value / 100;

    // Create screenshot using the global function (renders without UI elements)
    const blob = await window.takeCanvasScreenshot(mimeType, qualityValue);

    if (!blob) {
      throw new Error('Failed to create screenshot');
    }

    // Create preview URL
    previewUrl.value = URL.createObjectURL(blob);

    // Get dimensions from the blob by loading it as an image
    const img = new Image();
    img.src = previewUrl.value;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const extension = selectedFormat.value === 'jpeg' ? 'jpg' : selectedFormat.value;
    fileName.value = `screenshot_${img.width}x${img.height}_${timestamp}.${extension}`;

    // Set file info
    fileSize.value = formatFileSize(blob.size);
    fileDimensions.value = `${img.width} x ${img.height}`;

    toastStore.success(t('screenshot.captureSuccess'));

  } catch (error) {
    console.error('[ScreenshotPanel] Error taking screenshot:', error);
    toastStore.error(t('screenshot.captureError'));
  } finally {
    isProcessing.value = false;
  }
}

/**
 * Handle download click
 */
function handleDownload() {
  toastStore.success(t('screenshot.downloadStarted'));
}

/**
 * Clear the preview
 */
function clearPreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
  fileName.value = '';
  fileSize.value = '';
  fileDimensions.value = '';
  showFullscreenPreview.value = false;
}

/**
 * Open fullscreen preview modal
 */
function openFullscreenPreview() {
  showFullscreenPreview.value = true;
  // Add ESC key listener
  document.addEventListener('keydown', handleEscKey);
}

/**
 * Close fullscreen preview modal
 */
function closeFullscreenPreview() {
  showFullscreenPreview.value = false;
  // Remove ESC key listener
  document.removeEventListener('keydown', handleEscKey);
}

/**
 * Handle ESC key to close modal
 */
function handleEscKey(e) {
  if (e.key === 'Escape') {
    closeFullscreenPreview();
  }
}
</script>

<style scoped>
.screenshot-panel {
  background-color: var(--card-bg, #142640);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  color: var(--text-primary, #E9E9EB);
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

h3::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.8));
}

/* Control Section */
.control-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-label {
  font-size: 11px;
  color: #888;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Format Buttons */
.format-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.format-btn {
  background-color: #3a3a3a;
  color: #c0c0c0;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.format-btn:hover:not(:disabled) {
  background-color: #454545;
  border-color: #666;
  transform: translateY(-1px);
}

.format-btn.active {
  background-color: #6ea8fe;
  color: #fff;
  border-color: #6ea8fe;
  font-weight: 600;
}

.format-btn.active:hover {
  background-color: #5a96e8;
}

/* Quality Slider */
.quality-value {
  font-size: 11px;
  font-weight: 600;
  color: #6ea8fe;
}

.quality-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.quality-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6ea8fe;
  cursor: pointer;
  transition: background 0.2s ease;
}

.quality-slider::-webkit-slider-thumb:hover {
  background: #5a96e8;
}

.quality-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6ea8fe;
  cursor: pointer;
  border: none;
}

.quality-hints {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: #666;
}

/* Info Section */
.info-section {
  background: rgba(110, 168, 254, 0.1);
  border: 1px solid rgba(110, 168, 254, 0.2);
  border-radius: 6px;
  padding: 8px;
}

.format-info {
  margin: 0;
  font-size: 11px;
  color: #c0c0c0;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.info-icon {
  flex-shrink: 0;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn .icon {
  width: 16px;
  height: 16px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-screenshot {
  background: linear-gradient(135deg, #6ea8fe 0%, #4FC3F7 100%);
  color: white;
  border: 1px solid rgba(110, 168, 254, 0.3);
}

.btn-screenshot:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a96e8 0%, #40b0e0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.3);
}

/* Preview Section */
.preview-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-close-preview {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
}

.btn-close-preview svg {
  width: 14px;
  height: 14px;
}

.btn-close-preview:hover {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  max-height: 150px;
}

.preview-image {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
}

.preview-info {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #888;
}

.btn-download {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  text-decoration: none;
}

.btn-download:hover {
  background: linear-gradient(135deg, #45a049 0%, #4CAF50 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-download svg {
  width: 16px;
  height: 16px;
}

/* Preview zoom hint */
.preview-container {
  position: relative;
  cursor: zoom-in;
}

.preview-zoom-hint {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.preview-zoom-hint svg {
  width: 14px;
  height: 14px;
  color: #fff;
}

.preview-container:hover .preview-zoom-hint {
  opacity: 1;
}

/* Fullscreen Modal Overlay */
.fullscreen-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Fullscreen Modal */
.fullscreen-modal {
  position: relative;
  background: #1a1a1a;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  animation: scaleIn 0.2s ease;
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif);
  font-size: 12px;
  color: var(--text-primary, #E9E9EB);
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Floating Close Button */
.btn-close-floating {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
}

.btn-close-floating svg {
  width: 16px;
  height: 16px;
}

.btn-close-floating:hover {
  background: rgba(244, 67, 54, 0.8);
  color: #fff;
}

/* Modal Image Container */
.modal-image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: #000;
  overflow: hidden;
  max-height: calc(85vh - 48px);
}

.modal-image {
  max-width: 100%;
  max-height: calc(85vh - 72px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 4px;
}

/* Compact Modal Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.metadata-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metadata-tag {
  display: inline-block;
  background: linear-gradient(135deg, #6ea8fe 0%, #4FC3F7 100%);
  color: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}

.metadata-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.metadata-divider {
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
}

.btn-download-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  text-decoration: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-download-icon:hover {
  background: linear-gradient(135deg, #45a049 0%, #4CAF50 100%);
  transform: scale(1.05);
}

.btn-download-icon svg {
  width: 16px;
  height: 16px;
}
</style>
