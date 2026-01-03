<template>
  <div ref="containerRef" class="foto-panel-container">
    <!-- Ebenen-Steuerung -->
    <div v-if="currentActiveImage" class="layer-controls-section">
      <div class="modern-section-header">
        <h4>{{ t('foto.layers') }}</h4>
        <span v-if="currentLayerInfo" class="layer-info">{{ currentLayerInfo }}</span>
      </div>
      <div class="layer-buttons">
        <button @click="$emit('bring-to-front')" :disabled="!canMoveUp" class="layer-btn">
          <span class="layer-icon">⬆</span>
          <span class="layer-text">{{ t('foto.bringToFront') }}</span>
        </button>
        <button @click="$emit('move-up')" :disabled="!canMoveUp" class="layer-btn">
          <span class="layer-icon">↑</span>
          <span class="layer-text">{{ t('foto.moveUp') }}</span>
        </button>
        <button @click="$emit('move-down')" :disabled="!canMoveDown" class="layer-btn">
          <span class="layer-icon">↓</span>
          <span class="layer-text">{{ t('foto.moveDown') }}</span>
        </button>
        <button @click="$emit('send-to-back')" :disabled="!canMoveDown" class="layer-btn">
          <span class="layer-icon">⬇</span>
          <span class="layer-text">{{ t('foto.sendToBack') }}</span>
        </button>
      </div>
    </div>

    <!-- Preset Auswahl -->
    <div class="control-group">
      <select ref="presetSelectRef" @change="onPresetChange">
        <option value="">{{ t('foto.noFilter') }}</option>
        <option v-for="preset in presets" :key="preset.id" :value="preset.id">
          {{ preset.name }}
        </option>
      </select>
    </div>

    <!-- Helligkeit -->
    <div class="control-group slider">
      <label>{{ t('foto.brightness') }}</label>
      <input type="range" ref="brightnessInputRef" min="0" max="200" value="100" @input="onBrightnessChange" />
      <span ref="brightnessValueRef">100%</span>
    </div>

    <!-- Kontrast -->
    <div class="control-group slider">
      <label>{{ t('foto.contrast') }}</label>
      <input type="range" ref="contrastInputRef" min="0" max="200" value="100" @input="onContrastChange" />
      <span ref="contrastValueRef">100%</span>
    </div>

    <!-- Sättigung -->
    <div class="control-group slider">
      <label>{{ t('foto.saturation') }}</label>
      <input type="range" ref="saturationInputRef" min="0" max="200" value="100" @input="onSaturationChange" />
      <span ref="saturationValueRef">100%</span>
    </div>

    <!-- Deckkraft -->
    <div class="control-group slider">
      <label>{{ t('foto.opacity') }}</label>
      <input type="range" ref="opacityInputRef" min="0" max="100" value="100" @input="onOpacityChange" />
      <span ref="opacityValueRef">100%</span>
    </div>

    <!-- Unschärfe -->
    <div class="control-group slider">
      <label>{{ t('foto.blur') }}</label>
      <input type="range" ref="blurInputRef" min="0" max="20" value="0" @input="onBlurChange" />
      <span ref="blurValueRef">0px</span>
    </div>

    <!-- Farbton -->
    <div class="control-group slider">
      <label>{{ t('foto.hue') }}</label>
      <input type="range" ref="hueRotateInputRef" min="-180" max="180" value="0" @input="onHueRotateChange" />
      <span ref="hueRotateValueRef">0°</span>
    </div>

    <!-- Divider -->
    <div class="modern-divider"></div>

    <!-- Schatten-Sektion -->
    <div class="modern-section-header">
      <h4>{{ t('foto.shadow') }}</h4>
    </div>

    <div class="modern-controls-group">
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowColor') }}</span>
        </div>
        <div class="modern-color-picker">
          <input type="color" ref="shadowColorInputRef" value="#000000" class="modern-color-input" @input="onShadowColorChange" />
          <input type="text" ref="shadowColorTextRef" value="#000000" class="modern-color-text" @change="onShadowColorTextChange" />
        </div>
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowBlur') }}</span>
          <span class="label-value" ref="shadowBlurValueRef">0px</span>
        </div>
        <input type="range" ref="shadowBlurInputRef" min="0" max="50" value="0" class="modern-slider shadow-slider" @input="onShadowBlurChange" />
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowOffsetX') }}</span>
          <span class="label-value" ref="shadowOffsetXValueRef">0px</span>
        </div>
        <input type="range" ref="shadowOffsetXInputRef" min="-50" max="50" value="0" class="modern-slider shadow-slider" @input="onShadowOffsetXChange" />
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowOffsetY') }}</span>
          <span class="label-value" ref="shadowOffsetYValueRef">0px</span>
        </div>
        <input type="range" ref="shadowOffsetYInputRef" min="-50" max="50" value="0" class="modern-slider shadow-slider" @input="onShadowOffsetYChange" />
      </div>
    </div>

    <!-- Divider -->
    <div class="modern-divider"></div>

    <!-- Rotation-Sektion -->
    <div class="modern-section-header">
      <h4>{{ t('foto.rotation') }}</h4>
    </div>

    <div class="modern-controls-group">
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.rotationAngle') }}</span>
          <span class="label-value" ref="rotationValueRef">0°</span>
        </div>
        <input type="range" ref="rotationInputRef" min="0" max="100" value="50" class="modern-slider rotation-slider" @input="onRotationChange" />
        <span class="rotation-hint">-180° ← → +180°</span>
      </div>
    </div>

    <!-- Flip Controls -->
    <div class="flip-controls">
      <div class="modern-section-header">
        <h4>{{ t('foto.flip') }}</h4>
      </div>
      <div class="flip-buttons">
        <button @click="onFlipHorizontal" class="flip-button" :class="{ 'active': flipHRef }">
          ↔ {{ t('foto.flipH') }}
        </button>
        <button @click="onFlipVertical" class="flip-button" :class="{ 'active': flipVRef }">
          ↕ {{ t('foto.flipV') }}
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="modern-divider"></div>

    <!-- Bildkontur-Sektion -->
    <div class="modern-section-header">
      <h4>{{ t('foto.border') }}</h4>
    </div>

    <div class="modern-controls-group">
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.borderColor') }}</span>
        </div>
        <div class="modern-color-picker">
          <input type="color" ref="borderColorInputRef" value="#ffffff" class="modern-color-input" @input="onBorderColorChange" />
          <input type="text" ref="borderColorTextRef" value="#ffffff" class="modern-color-text" @change="onBorderColorTextChange" />
        </div>
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.borderWidth') }}</span>
          <span class="label-value" ref="borderWidthValueRef">0px</span>
        </div>
        <input type="range" ref="borderWidthInputRef" min="0" max="50" value="0" class="modern-slider border-slider" @input="onBorderWidthChange" />
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.borderOpacity') }}</span>
          <span class="label-value" ref="borderOpacityValueRef">100%</span>
        </div>
        <input type="range" ref="borderOpacityInputRef" min="0" max="100" value="100" class="modern-slider border-opacity-slider" @input="onBorderOpacityChange" />
      </div>
    </div>

    <!-- Reset Button -->
    <button @click="resetFilters" class="btn-secondary modern-reset-btn">
      {{ t('foto.resetFilters') }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from '../../lib/i18n.js';

const { t } = useI18n();

const props = defineProps({
  currentActiveImage: {
    type: Object,
    default: null
  },
  presets: {
    type: Array,
    default: () => []
  },
  canMoveUp: {
    type: Boolean,
    default: false
  },
  canMoveDown: {
    type: Boolean,
    default: false
  },
  currentLayerInfo: {
    type: String,
    default: ''
  }
});

const emit = defineEmits([
  'bring-to-front',
  'move-up',
  'move-down',
  'send-to-back',
  'preset-change',
  'filter-change',
  'reset-filters'
]);

// Container Ref
const containerRef = ref(null);

// Preset Ref
const presetSelectRef = ref(null);

// Filter Refs
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

// Shadow Refs
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

// Flip Refs
const flipHRef = ref(false);
const flipVRef = ref(false);

// Border Refs
const borderColorInputRef = ref(null);
const borderColorTextRef = ref(null);
const borderWidthInputRef = ref(null);
const borderWidthValueRef = ref(null);
const borderOpacityInputRef = ref(null);
const borderOpacityValueRef = ref(null);

// Emit filter change
function emitFilterChange(property, value) {
  emit('filter-change', { property, value });
}

// Handlers
function onPresetChange(event) {
  emit('preset-change', event.target.value);
}

function onBrightnessChange(event) {
  const value = parseInt(event.target.value);
  if (brightnessValueRef.value) brightnessValueRef.value.textContent = value + '%';
  emitFilterChange('brightness', value);
}

function onContrastChange(event) {
  const value = parseInt(event.target.value);
  if (contrastValueRef.value) contrastValueRef.value.textContent = value + '%';
  emitFilterChange('contrast', value);
}

function onSaturationChange(event) {
  const value = parseInt(event.target.value);
  if (saturationValueRef.value) saturationValueRef.value.textContent = value + '%';
  emitFilterChange('saturation', value);
}

function onOpacityChange(event) {
  const value = parseInt(event.target.value);
  if (opacityValueRef.value) opacityValueRef.value.textContent = value + '%';
  emitFilterChange('opacity', value);
}

function onBlurChange(event) {
  const value = parseInt(event.target.value);
  if (blurValueRef.value) blurValueRef.value.textContent = value + 'px';
  emitFilterChange('blur', value);
}

function onHueRotateChange(event) {
  const value = parseInt(event.target.value);
  if (hueRotateValueRef.value) hueRotateValueRef.value.textContent = value + '°';
  emitFilterChange('hueRotate', value);
}

function onShadowColorChange(event) {
  const value = event.target.value;
  if (shadowColorTextRef.value) shadowColorTextRef.value.value = value;
  emitFilterChange('shadowColor', value);
}

function onShadowColorTextChange(event) {
  const value = event.target.value;
  if (shadowColorInputRef.value) shadowColorInputRef.value.value = value;
  emitFilterChange('shadowColor', value);
}

function onShadowBlurChange(event) {
  const value = parseInt(event.target.value);
  if (shadowBlurValueRef.value) shadowBlurValueRef.value.textContent = value + 'px';
  emitFilterChange('shadowBlur', value);
}

function onShadowOffsetXChange(event) {
  const value = parseInt(event.target.value);
  if (shadowOffsetXValueRef.value) shadowOffsetXValueRef.value.textContent = value + 'px';
  emitFilterChange('shadowOffsetX', value);
}

function onShadowOffsetYChange(event) {
  const value = parseInt(event.target.value);
  if (shadowOffsetYValueRef.value) shadowOffsetYValueRef.value.textContent = value + 'px';
  emitFilterChange('shadowOffsetY', value);
}

function onRotationChange(event) {
  const sliderValue = parseInt(event.target.value);
  const actualRotation = (sliderValue - 50) * 3.6;
  if (rotationValueRef.value) rotationValueRef.value.textContent = Math.round(actualRotation) + '°';
  emitFilterChange('rotation', actualRotation);
}

function onFlipHorizontal() {
  flipHRef.value = !flipHRef.value;
  emitFilterChange('flipH', flipHRef.value);
}

function onFlipVertical() {
  flipVRef.value = !flipVRef.value;
  emitFilterChange('flipV', flipVRef.value);
}

function onBorderColorChange(event) {
  const value = event.target.value;
  if (borderColorTextRef.value) borderColorTextRef.value.value = value;
  emitFilterChange('borderColor', value);
}

function onBorderColorTextChange(event) {
  const value = event.target.value;
  if (borderColorInputRef.value) borderColorInputRef.value.value = value;
  emitFilterChange('borderColor', value);
}

function onBorderWidthChange(event) {
  const value = parseInt(event.target.value);
  if (borderWidthValueRef.value) borderWidthValueRef.value.textContent = value + 'px';
  emitFilterChange('borderWidth', value);
}

function onBorderOpacityChange(event) {
  const value = parseInt(event.target.value);
  if (borderOpacityValueRef.value) borderOpacityValueRef.value.textContent = value + '%';
  emitFilterChange('borderOpacity', value);
}

function resetFilters() {
  // Reset all inputs to default values
  if (brightnessInputRef.value) brightnessInputRef.value.value = 100;
  if (brightnessValueRef.value) brightnessValueRef.value.textContent = '100%';
  if (contrastInputRef.value) contrastInputRef.value.value = 100;
  if (contrastValueRef.value) contrastValueRef.value.textContent = '100%';
  if (saturationInputRef.value) saturationInputRef.value.value = 100;
  if (saturationValueRef.value) saturationValueRef.value.textContent = '100%';
  if (opacityInputRef.value) opacityInputRef.value.value = 100;
  if (opacityValueRef.value) opacityValueRef.value.textContent = '100%';
  if (blurInputRef.value) blurInputRef.value.value = 0;
  if (blurValueRef.value) blurValueRef.value.textContent = '0px';
  if (hueRotateInputRef.value) hueRotateInputRef.value.value = 0;
  if (hueRotateValueRef.value) hueRotateValueRef.value.textContent = '0°';

  if (shadowColorInputRef.value) shadowColorInputRef.value.value = '#000000';
  if (shadowColorTextRef.value) shadowColorTextRef.value.value = '#000000';
  if (shadowBlurInputRef.value) shadowBlurInputRef.value.value = 0;
  if (shadowBlurValueRef.value) shadowBlurValueRef.value.textContent = '0px';
  if (shadowOffsetXInputRef.value) shadowOffsetXInputRef.value.value = 0;
  if (shadowOffsetXValueRef.value) shadowOffsetXValueRef.value.textContent = '0px';
  if (shadowOffsetYInputRef.value) shadowOffsetYInputRef.value.value = 0;
  if (shadowOffsetYValueRef.value) shadowOffsetYValueRef.value.textContent = '0px';
  if (rotationInputRef.value) rotationInputRef.value.value = 50;
  if (rotationValueRef.value) rotationValueRef.value.textContent = '0°';

  flipHRef.value = false;
  flipVRef.value = false;

  if (borderColorInputRef.value) borderColorInputRef.value.value = '#ffffff';
  if (borderColorTextRef.value) borderColorTextRef.value.value = '#ffffff';
  if (borderWidthInputRef.value) borderWidthInputRef.value.value = 0;
  if (borderWidthValueRef.value) borderWidthValueRef.value.textContent = '0px';
  if (borderOpacityInputRef.value) borderOpacityInputRef.value.value = 100;
  if (borderOpacityValueRef.value) borderOpacityValueRef.value.textContent = '100%';

  if (presetSelectRef.value) presetSelectRef.value.value = '';

  emit('reset-filters');
}

// Watch for active image changes and update UI
watch(() => props.currentActiveImage, (newImage) => {
  if (newImage && newImage.fotoSettings) {
    loadImageSettings(newImage.fotoSettings);
  }
}, { immediate: true, deep: true });

function loadImageSettings(settings) {
  const s = settings || {};

  if (brightnessInputRef.value) brightnessInputRef.value.value = s.brightness || 100;
  if (brightnessValueRef.value) brightnessValueRef.value.textContent = (s.brightness || 100) + '%';
  if (contrastInputRef.value) contrastInputRef.value.value = s.contrast || 100;
  if (contrastValueRef.value) contrastValueRef.value.textContent = (s.contrast || 100) + '%';
  if (saturationInputRef.value) saturationInputRef.value.value = s.saturation || 100;
  if (saturationValueRef.value) saturationValueRef.value.textContent = (s.saturation || 100) + '%';
  if (opacityInputRef.value) opacityInputRef.value.value = s.opacity || 100;
  if (opacityValueRef.value) opacityValueRef.value.textContent = (s.opacity || 100) + '%';
  if (blurInputRef.value) blurInputRef.value.value = s.blur || 0;
  if (blurValueRef.value) blurValueRef.value.textContent = (s.blur || 0) + 'px';
  if (hueRotateInputRef.value) hueRotateInputRef.value.value = s.hueRotate || 0;
  if (hueRotateValueRef.value) hueRotateValueRef.value.textContent = (s.hueRotate || 0) + '°';

  if (shadowColorInputRef.value) shadowColorInputRef.value.value = s.shadowColor || '#000000';
  if (shadowColorTextRef.value) shadowColorTextRef.value.value = s.shadowColor || '#000000';
  if (shadowBlurInputRef.value) shadowBlurInputRef.value.value = s.shadowBlur || 0;
  if (shadowBlurValueRef.value) shadowBlurValueRef.value.textContent = (s.shadowBlur || 0) + 'px';
  if (shadowOffsetXInputRef.value) shadowOffsetXInputRef.value.value = s.shadowOffsetX || 0;
  if (shadowOffsetXValueRef.value) shadowOffsetXValueRef.value.textContent = (s.shadowOffsetX || 0) + 'px';
  if (shadowOffsetYInputRef.value) shadowOffsetYInputRef.value.value = s.shadowOffsetY || 0;
  if (shadowOffsetYValueRef.value) shadowOffsetYValueRef.value.textContent = (s.shadowOffsetY || 0) + 'px';

  const rotation = s.rotation || 0;
  const sliderValue = Math.round((rotation / 3.6) + 50);
  if (rotationInputRef.value) rotationInputRef.value.value = sliderValue;
  if (rotationValueRef.value) rotationValueRef.value.textContent = Math.round(rotation) + '°';

  flipHRef.value = s.flipH || false;
  flipVRef.value = s.flipV || false;

  if (borderColorInputRef.value) borderColorInputRef.value.value = s.borderColor || '#ffffff';
  if (borderColorTextRef.value) borderColorTextRef.value.value = s.borderColor || '#ffffff';
  if (borderWidthInputRef.value) borderWidthInputRef.value.value = s.borderWidth || 0;
  if (borderWidthValueRef.value) borderWidthValueRef.value.textContent = (s.borderWidth || 0) + 'px';
  if (borderOpacityInputRef.value) borderOpacityInputRef.value.value = s.borderOpacity ?? 100;
  if (borderOpacityValueRef.value) borderOpacityValueRef.value.textContent = (s.borderOpacity ?? 100) + '%';

  if (presetSelectRef.value) presetSelectRef.value.value = s.preset || '';
}

// Expose refs for parent component
defineExpose({
  containerRef,
  presetSelectRef,
  brightnessInputRef,
  brightnessValueRef,
  contrastInputRef,
  contrastValueRef,
  saturationInputRef,
  saturationValueRef,
  opacityInputRef,
  opacityValueRef,
  blurInputRef,
  blurValueRef,
  loadImageSettings
});
</script>

<style scoped>
/* Filter-Bereich Styles */
.foto-panel-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  padding-top: 10px;
}

.foto-panel-container h4 {
  margin: 0 0 6px 0;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--muted, #A8A992);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.control-group.slider {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 4px;
}

.control-group.slider label {
  grid-column: 1 / 3;
  font-size: 0.55rem;
  color: var(--muted, #A8A992);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}

.control-group.slider input {
  width: 100%;
}

.control-group.slider span {
  font-size: 0.5rem;
  color: var(--muted, #A8A992);
  font-weight: 500;
  font-family: monospace;
  min-width: 35px;
  text-align: right;
}

.control-group select {
  width: 100%;
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  background-color: var(--btn, #1c2426);
  color: var(--text, #E9E9EB);
  font-size: 0.6rem;
  cursor: pointer;
}

.control-group select:hover,
.control-group select:focus {
  border-color: var(--accent, #609198);
  outline: none;
}

/* Range Slider Styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--muted, #A8A992) 0%, var(--accent, #609198) 100%);
  outline: none;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  border: 2px solid #fff;
}

/* Modern Divider */
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

/* Modern Slider */
.modern-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.shadow-slider {
  background: linear-gradient(90deg, #1a1a2e 0%, #6ea8fe 50%, #a78bfa 100%);
}

.rotation-slider {
  background: linear-gradient(90deg, #f97316 0%, #6ea8fe 50%, #3b82f6 100%);
}

.border-slider {
  background: linear-gradient(90deg, #1a1a2e 0%, #ffffff 50%, #6ea8fe 100%);
}

.border-opacity-slider {
  background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.5) 50%, #ffffff 100%);
}

.modern-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  border: 2px solid #fff;
}

.modern-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  border: 2px solid #fff;
}

/* Color Picker */
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
}

.modern-color-input:hover {
  border-color: var(--image-section-accent, #6ea8fe);
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
}

.modern-color-text:focus {
  outline: none;
  border-color: var(--image-section-accent, #6ea8fe);
}

/* Rotation Hint */
.rotation-hint {
  font-size: 10px;
  color: #666;
  text-align: center;
  margin-top: 4px;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

/* Flip Buttons */
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
}

.flip-button.active {
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe 0%, #5090e0 100%));
  border-color: var(--image-section-accent, #6ea8fe);
  color: #fff;
}

/* Reset Button */
.btn-secondary {
  width: 100%;
  padding: 6px 10px;
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  background-color: var(--btn, #1c2426);
  color: var(--text, #E9E9EB);
  font-size: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.btn-secondary:hover {
  background-color: var(--btn-hover, #2a3335);
  border-color: var(--accent, #609198);
}

.modern-reset-btn {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #555 0%, #3a3a3a 100%);
  border: 1px solid #666;
  font-weight: 500;
}

.modern-reset-btn:hover {
  background: linear-gradient(135deg, #666 0%, #4a4a4a 100%);
  border-color: var(--image-section-accent, #6ea8fe);
}

/* Layer Controls */
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
  gap: 4px;
}

.layer-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 4px;
  background: var(--btn, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 5px;
  color: var(--text, #E9E9EB);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.layer-btn:hover:not(:disabled) {
  background: var(--btn-hover, #2a3335);
  border-color: var(--accent, #609198);
  color: var(--accent-light, #BCE5E5);
}

.layer-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.layer-icon {
  font-size: 0.7rem;
  line-height: 1;
}

.layer-text {
  font-size: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0.8;
}
</style>
