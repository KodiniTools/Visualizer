<template>
  <!-- Video Quality -->
  <div class="control-section">
    <span class="section-label">{{ t('recorder.videoQuality') }}</span>
    <div class="quality-buttons">
      <button
        v-for="quality in qualityPresets"
        :key="quality.value"
        class="quality-btn"
        :class="{ active: selectedQuality === quality.value }"
        @click="selectQuality(quality.value)"
      >
        {{ quality.label }}
      </button>
    </div>
  </div>

  <!-- Recording Frame Rate -->
  <div class="control-section">
    <span class="section-label">{{ t('recorder.recordingFps') }}</span>
    <div class="fps-buttons">
      <button
        v-for="preset in frameRatePresets"
        :key="preset.value"
        class="quality-btn"
        :class="{ active: recordingFps === preset.value }"
        @click="selectFrameRate(preset.value)"
      >
        {{ preset.label }} fps
      </button>
    </div>
    <p class="extra-info">
      {{
        recordingFps === 60 ? t('recorder.recordingFps60Info') : t('recorder.recordingFps30Info')
      }}
    </p>
  </div>

  <!-- Upload Mode -->
  <div class="control-section">
    <span class="section-label">{{ t('recorder.uploadMode') }}</span>
    <div class="upload-buttons">
      <button
        v-for="mode in UPLOAD_MODES"
        :key="mode"
        class="upload-btn"
        :class="{ active: uploadMode === mode }"
        @click="selectUploadMode(mode)"
      >
        {{ mode }}
      </button>
    </div>
  </div>

  <!-- MP4 Conversion -->
  <div class="control-section">
    <div class="section-header">
      <span class="section-label">{{ t('recorder.mp4Conversion') }}</span>
      <span
        class="server-status"
        :class="{ available: serverAvailable, unavailable: serverAvailable === false }"
        :title="serverAvailable ? t('recorder.serverAvailable') : t('recorder.serverUnavailable')"
      >
        {{ serverAvailable ? '●' : '○' }}
      </span>
    </div>
    <label class="toggle-row">
      <input type="checkbox" v-model="enableServerConversion" :disabled="!serverAvailable" />
      <span class="toggle-label">{{ t('recorder.autoConvert') }}</span>
    </label>
    <div
      class="quality-buttons conversion-quality"
      v-if="enableServerConversion && serverAvailable"
    >
      <button
        v-for="preset in conversionPresets"
        :key="preset.value"
        class="quality-btn"
        :class="{ active: conversionQuality === preset.value }"
        @click="conversionQuality = preset.value"
        :title="preset.desc"
      >
        {{ preset.label }}
      </button>
    </div>
  </div>

  <!-- GIF Export -->
  <div class="control-section">
    <div class="section-header">
      <span class="section-label">{{ t('recorder.gifExport') }}</span>
      <span
        class="server-status"
        :class="{ available: serverAvailable, unavailable: serverAvailable === false }"
        :title="serverAvailable ? t('recorder.serverAvailable') : t('recorder.serverUnavailable')"
      >
        {{ serverAvailable ? '●' : '○' }}
      </span>
    </div>
    <label class="toggle-row">
      <input type="checkbox" v-model="enableGifExport" :disabled="!serverAvailable" />
      <span class="toggle-label">{{ t('recorder.gifAutoCreate') }}</span>
    </label>
    <div class="gif-options" v-if="enableGifExport && serverAvailable">
      <div class="gif-option-row">
        <span class="gif-option-label">{{ t('recorder.gifFps') }}:</span>
        <div class="quality-buttons">
          <button
            v-for="fps in [10, 15, 20]"
            :key="fps"
            class="quality-btn"
            :class="{ active: gifFps === fps }"
            @click="gifFps = fps"
          >
            {{ fps }}
          </button>
        </div>
      </div>
      <div class="gif-option-row">
        <span class="gif-option-label">{{ t('recorder.gifWidth') }}:</span>
        <div class="quality-buttons">
          <button
            v-for="w in [
              { v: 320, l: '320' },
              { v: 480, l: '480' },
              { v: 640, l: '640' },
            ]"
            :key="w.v"
            class="quality-btn"
            :class="{ active: gifWidth === w.v }"
            @click="gifWidth = w.v"
          >
            {{ w.l }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- HQ Frame Export -->
  <div class="control-section">
    <div class="section-header">
      <span class="section-label">{{ t('recorder.hqExport') }}</span>
      <span
        class="server-status"
        :class="{ available: serverAvailable, unavailable: serverAvailable === false }"
        :title="serverAvailable ? t('recorder.serverAvailable') : t('recorder.serverUnavailable')"
      >
        {{ serverAvailable ? '●' : '○' }}
      </span>
    </div>
    <label class="toggle-row">
      <input type="checkbox" v-model="enableHqExport" :disabled="!serverAvailable" />
      <span class="toggle-label">{{ t('recorder.hqAutoCreate') }}</span>
    </label>
    <div class="gif-options" v-if="enableHqExport && serverAvailable">
      <div class="gif-option-row">
        <span class="gif-option-label">{{ t('recorder.hqFps') }}:</span>
        <div class="quality-buttons">
          <button
            v-for="fps in [24, 30, 60]"
            :key="fps"
            class="quality-btn"
            :class="{ active: hqFps === fps }"
            @click="hqFps = fps"
          >
            {{ fps }}
          </button>
        </div>
      </div>
      <p class="extra-info">{{ t('recorder.hqInfo') }}</p>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()

const {
  selectedQuality,
  qualityPresets,
  selectQuality,
  recordingFps,
  frameRatePresets,
  selectFrameRate,
  uploadMode,
  selectUploadMode,
  serverAvailable,
  enableServerConversion,
  conversionQuality,
  conversionPresets,
  enableGifExport,
  gifFps,
  gifWidth,
  enableHqExport,
  hqFps,
} = inject('recorderSettings')

const UPLOAD_MODES = ['auto', 'server', 'direct']
</script>

<style scoped>
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
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.server-status {
  font-size: 12px;
  transition: color 0.3s ease;
}

.server-status.available {
  color: #4caf50;
}
.server-status.unavailable {
  color: var(--text-muted);
}

/* Quality / Upload buttons */
.quality-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.quality-btn,
.upload-btn {
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.quality-btn:hover,
.upload-btn:hover {
  background-color: var(--btn-hover);
  transform: translateY(-1px);
}

.quality-btn.active,
.upload-btn.active {
  background-color: #6ea8fe;
  color: #fff;
  border-color: #6ea8fe;
  font-weight: 600;
}

.quality-btn.active:hover,
.upload-btn.active:hover {
  background-color: #5a96e8;
}

.quality-btn:disabled,
.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.fps-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.conversion-quality {
  grid-template-columns: repeat(5, 1fr);
}

/* Toggle */
.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
}

.toggle-row input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #6ea8fe;
  cursor: pointer;
}

.toggle-row input[type='checkbox']:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.toggle-label {
  font-size: 11px;
  color: var(--text-primary);
}

/* GIF / HQ options */
.gif-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 8px;
  background: var(--secondary-bg, #0e1c32);
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
}

.gif-option-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gif-option-label {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  min-width: 38px;
}

.extra-info {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin: 4px 0 0 0;
  text-align: center;
}

/* Light Theme */
[data-theme='light'] .section-label {
  color: #4d6d8e;
}

[data-theme='light'] .quality-btn,
[data-theme='light'] .upload-btn {
  background-color: #f0f0f0;
  color: #003971;
  border-color: #d0d0d0;
}

[data-theme='light'] .quality-btn:hover,
[data-theme='light'] .upload-btn:hover {
  background-color: #e4e4e4;
  border-color: #bbb;
}

[data-theme='light'] .quality-btn.active,
[data-theme='light'] .upload-btn.active {
  background-color: #014f99;
  color: #f5f4d6;
  border-color: #014f99;
}

[data-theme='light'] .quality-btn.active:hover,
[data-theme='light'] .upload-btn.active:hover {
  background-color: #003971;
}

[data-theme='light'] .toggle-row input[type='checkbox'] {
  accent-color: #014f99;
}
[data-theme='light'] .toggle-label {
  color: #003971;
}
[data-theme='light'] .extra-info {
  color: rgba(0, 0, 0, 0.4);
}
</style>
