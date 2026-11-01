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
    <div v-if="selectedFormat !== 'png'" class="control-section">
      <div class="section-header">
        <span class="section-label">{{ t('screenshot.quality') }}</span>
        <span class="quality-value">{{ quality }}%</span>
      </div>
      <SliderField
        v-model="quality"
        :min="10"
        :max="100"
        :step="5"
        :default-value="90"
        class="quality-slider"
      />
      <div class="quality-hints">
        <span>{{ t('screenshot.lowQuality') }}</span>
        <span>{{ t('screenshot.highQuality') }}</span>
      </div>
    </div>

    <!-- PNG Info -->
    <div v-if="selectedFormat === 'png'" class="control-section info-section">
      <p class="format-info">
        <span class="info-icon">ℹ️</span>
        {{ t('screenshot.pngInfo') }}
      </p>
    </div>

    <!-- Screenshot Button -->
    <button class="btn btn-screenshot" :disabled="isProcessing" @click="takeScreenshot">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      {{ isProcessing ? t('screenshot.processing') : t('screenshot.capture') }}
    </button>

    <!-- Preview & Download (after screenshot taken) -->
    <div v-if="previewUrl" class="preview-section">
      <div class="preview-header">
        <span class="section-label">{{ t('screenshot.preview') }}</span>
        <button class="btn-close-preview" :title="t('common.close')" @click="clearPreview">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div
        class="preview-container"
        :title="t('screenshot.doubleClickHint')"
        @dblclick="openFullscreenPreview"
      >
        <img :src="previewUrl" alt="Screenshot Preview" class="preview-image" />
        <div class="preview-zoom-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>
      </div>
      <div class="preview-info">
        <span class="file-size">{{ fileSize }}</span>
        <span class="file-dimensions">{{ fileDimensions }}</span>
      </div>
      <a :href="previewUrl" :download="fileName" class="btn btn-download" @click="handleDownload">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {{ t('screenshot.download') }}
      </a>
    </div>

    <!-- Fullscreen Preview Modal -->
    <ScreenshotFullscreenModal
      v-if="showFullscreenPreview && previewUrl"
      :url="previewUrl"
      :file-name="fileName"
      :format-label="formatLabel"
      :dimensions="fileDimensions"
      :size="fileSize"
      @close="closeFullscreenPreview"
      @download="handleDownload"
    />
  </div>
</template>

<script setup>
import HelpTooltip from './HelpTooltip.vue'
import SliderField from './ui/SliderField.vue'
import ScreenshotFullscreenModal from './screenshot/ScreenshotFullscreenModal.vue'
import { useI18n } from '../lib/i18n.js'
import { useCanvasScreenshot } from '../composables/screenshot/useCanvasScreenshot.js'

const { t } = useI18n()
const {
  formats,
  selectedFormat,
  quality,
  isProcessing,
  previewUrl,
  fileName,
  fileSize,
  fileDimensions,
  formatLabel,
  showFullscreenPreview,
  takeScreenshot,
  handleDownload,
  clearPreview,
  openFullscreenPreview,
  closeFullscreenPreview,
} = useCanvasScreenshot()
</script>

<style scoped>
.screenshot-panel {
  background-color: var(--card-bg);
  border-radius: var(--ds-radius-md);
  padding: 10px;
  border: 1px solid var(--border-color);
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
  color: var(--text-primary);
  font-weight: var(--ds-weight-semibold);
  font-size: var(--ds-text-xs);
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
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  font-weight: var(--ds-weight-medium);
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
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  padding: 8px 10px;
  font-size: var(--ds-text-xs);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.format-btn:hover:not(:disabled) {
  background-color: var(--btn-hover);
  border-color: var(--border-color);
}

.format-btn.active {
  background-color: var(--ds-link);
  color: #fff;
  border-color: var(--ds-link);
  font-weight: var(--ds-weight-semibold);
}

.format-btn.active:hover {
  background-color: var(--ds-link);
}

/* Quality Slider */
.quality-value {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-link);
}

.quality-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--panel-highlight);
  border-radius: var(--ds-radius-sm);
  outline: none;
  cursor: pointer;
}

.quality-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-link);
  cursor: pointer;
  transition: background var(--ds-duration) var(--ds-ease);
}

.quality-slider::-webkit-slider-thumb:hover {
  background: var(--ds-link);
}

.quality-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-link);
  cursor: pointer;
  border: none;
}

.quality-hints {
  display: flex;
  justify-content: space-between;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}

/* Info Section */
.info-section {
  background: color-mix(in srgb, var(--ds-link) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
  border-radius: var(--ds-radius-sm);
  padding: 8px;
}

.format-info {
  margin: 0;
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
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
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
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
  background: var(--ds-link);
  color: white;
  border: 1px solid color-mix(in srgb, var(--ds-link) 30%, transparent);
}

.btn-screenshot:hover:not(:disabled) {
  background: var(--ds-link);
}

/* Preview Section */
.preview-section {
  background: var(--gradient-color);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-md);
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
  background: var(--panel-highlight);
  color: var(--text-muted);
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-close-preview svg {
  width: 14px;
  height: 14px;
}

.btn-close-preview:hover {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  color: var(--ds-danger);
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: var(--ds-radius-sm);
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
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}

.btn-download {
  background: var(--ds-success);
  color: white;
  text-decoration: none;
}

.btn-download:hover {
  background: var(--ds-success);
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
  border-radius: var(--ds-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--ds-duration) var(--ds-ease);
  pointer-events: none;
}

.preview-zoom-hint svg {
  width: 14px;
  height: 14px;
  color: var(--ds-text);
}

.preview-container:hover .preview-zoom-hint {
  opacity: 1;
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] h3::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E");
  filter: none;
}

[data-theme='light'] .format-btn {
  background-color: var(--primary-bg);
  border-color: var(--border-color);
}

[data-theme='light'] .format-btn:hover:not(:disabled) {
  background-color: var(--secondary-bg);
}

[data-theme='light'] .format-btn.active {
  background-color: var(--accent-primary);
  color: var(--accent-text);
  border-color: var(--accent-primary);
}

[data-theme='light'] .format-btn.active:hover {
  background-color: var(--accent-primary);
}

[data-theme='light'] .quality-value {
  color: var(--accent-ink);
}

[data-theme='light'] .quality-slider {
  background: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .quality-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
}

[data-theme='light'] .quality-slider::-webkit-slider-thumb:hover {
  background: var(--accent-primary);
}

[data-theme='light'] .quality-slider::-moz-range-thumb {
  background: var(--accent-primary);
}

[data-theme='light'] .info-section {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .btn-screenshot {
  background: var(--accent-primary);
  color: var(--accent-text);
  border-color: var(--border-color);
}

[data-theme='light'] .btn-screenshot:hover:not(:disabled) {
  background: var(--accent-primary);
}

[data-theme='light'] .preview-section {
  background: color-mix(in srgb, var(--text-primary) 3%, transparent);
  border-color: var(--ds-border);
}

[data-theme='light'] .btn-close-preview {
  background: rgba(0, 0, 0, 0.06);
  color: var(--ds-text-2);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .btn-close-preview {
    width: 32px;
    height: 32px;
  }

  .preview-container {
    max-height: 200px;
  }
}

@media (max-width: 480px) {
  .btn-close-preview {
    width: 36px;
    height: 36px;
  }
}
</style>
