<template>
  <div class="audio-reactive-section">
    <!-- Master Toggle -->
    <div class="audio-reactive-group">
      <div class="checkbox-control">
        <label class="modern-checkbox-label">
          <input type="checkbox" ref="audioReactiveEnabledRef" class="modern-checkbox" @change="onAudioReactiveToggle" />
          <span class="checkbox-text">{{ t('foto.audioReactive') }}</span>
        </label>
      </div>

      <!-- Audio-Level Anzeige -->
      <div v-if="isEnabled" class="audio-level-indicator">
        <span class="level-label">{{ t('foto.audioLevel') }}</span>
        <div class="level-bar-container">
          <div class="level-bar" ref="audioLevelBarRef"></div>
        </div>
      </div>

      <!-- Master-Einstellungen -->
      <template v-if="isEnabled">
        <!-- Audio-Quelle -->
        <div class="modern-control">
          <div class="modern-label">
            <span class="label-text">{{ t('foto.audioSource') }}</span>
          </div>
          <select ref="audioReactiveSourceRef" class="modern-select" @change="onAudioReactiveSourceChange">
            <option value="bass">{{ t('foto.bass') }}</option>
            <option value="mid">{{ t('foto.mid') }}</option>
            <option value="treble">{{ t('foto.treble') }}</option>
            <option value="volume">{{ t('foto.volume') }}</option>
          </select>
        </div>

        <!-- Glättung -->
        <div class="modern-control">
          <div class="modern-label">
            <span class="label-text">{{ t('foto.smoothing') }}</span>
            <span class="label-value" ref="audioReactiveSmoothingValueRef">50%</span>
          </div>
          <input type="range" ref="audioReactiveSmoothingRef" min="0" max="100" value="50" class="audio-slider" @input="onAudioReactiveSmoothingChange" />
        </div>

        <!-- Easing -->
        <div class="modern-control">
          <div class="modern-label">
            <span class="label-text">{{ t('foto.easing') }}</span>
          </div>
          <select ref="audioReactiveEasingRef" class="modern-select" @change="onAudioReactiveEasingChange">
            <option value="linear">Linear</option>
            <option value="easeIn">Ease In</option>
            <option value="easeOut">Ease Out</option>
            <option value="easeInOut">Ease In/Out</option>
            <option value="bounce">Bounce</option>
            <option value="elastic">Elastic</option>
            <option value="punch">Punch</option>
          </select>
        </div>

        <!-- Beat-Boost -->
        <div class="modern-control">
          <div class="modern-label">
            <span class="label-text">{{ t('foto.beatBoost') }}</span>
            <span class="label-value" ref="audioReactiveBeatBoostValueRef">Aus</span>
          </div>
          <input type="range" ref="audioReactiveBeatBoostRef" min="1.0" max="3.0" step="0.1" value="1.0" class="audio-slider" @input="onAudioReactiveBeatBoostChange" />
        </div>

        <!-- Phase -->
        <div class="modern-control">
          <div class="modern-label">
            <span class="label-text">{{ t('foto.phase') }}</span>
            <span class="label-value" ref="audioReactivePhaseValueRef">0°</span>
          </div>
          <input type="range" ref="audioReactivePhaseRef" min="0" max="360" value="0" class="audio-slider" @input="onAudioReactivePhaseChange" />
        </div>
      </template>
    </div>

    <!-- Presets -->
    <div v-if="isEnabled" class="preset-buttons">
      <div class="modern-label">
        <span class="label-text">{{ t('foto.presets') }}</span>
      </div>
      <div class="preset-grid">
        <button
          v-for="preset in presetList"
          :key="preset.id"
          class="preset-btn"
          :class="{ 'active': activeAudioPreset === preset.id }"
          @click="$emit('toggle-preset', preset.id)"
        >
          {{ preset.icon }} {{ preset.name }}
        </button>
      </div>
    </div>

    <!-- Effekte-Grid -->
    <div v-if="isEnabled" class="effects-grid">
      <div class="modern-label">
        <span class="label-text">{{ t('foto.effects') }}</span>
      </div>

      <!-- Farbeffekte -->
      <div class="effect-category">
        <span class="category-title">{{ t('foto.colorEffects') }}</span>
        <div v-for="effect in colorEffects" :key="effect.id" class="effect-item" :data-effect-id="effect.id">
          <label class="effect-checkbox-label">
            <input type="checkbox" class="effect-checkbox" @change="$emit('effect-toggle', effect.id, $event.target.checked)" />
            <span class="effect-name">{{ effect.name }}</span>
          </label>
          <select class="effect-source-select" @change="$emit('effect-source-change', effect.id, $event.target.value)">
            <option value="">{{ t('foto.global') }}</option>
            <option value="bass">{{ t('foto.bass') }}</option>
            <option value="mid">{{ t('foto.mid') }}</option>
            <option value="treble">{{ t('foto.treble') }}</option>
            <option value="volume">{{ t('foto.volume') }}</option>
          </select>
          <input type="range" class="effect-slider" min="0" max="100" value="80" @input="$emit('effect-intensity-change', effect.id, $event.target.value)" />
          <span class="effect-value">80%</span>
        </div>
      </div>

      <!-- Transformationseffekte -->
      <div class="effect-category">
        <span class="category-title">{{ t('foto.transformEffects') }}</span>
        <div v-for="effect in transformEffects" :key="effect.id" class="effect-item" :data-effect-id="effect.id">
          <label class="effect-checkbox-label">
            <input type="checkbox" class="effect-checkbox" @change="$emit('effect-toggle', effect.id, $event.target.checked)" />
            <span class="effect-name">{{ effect.name }}</span>
          </label>
          <select class="effect-source-select" @change="$emit('effect-source-change', effect.id, $event.target.value)">
            <option value="">{{ t('foto.global') }}</option>
            <option value="bass">{{ t('foto.bass') }}</option>
            <option value="mid">{{ t('foto.mid') }}</option>
            <option value="treble">{{ t('foto.treble') }}</option>
            <option value="volume">{{ t('foto.volume') }}</option>
          </select>
          <input type="range" class="effect-slider" min="0" max="100" value="50" @input="$emit('effect-intensity-change', effect.id, $event.target.value)" />
          <span class="effect-value">50%</span>
        </div>
      </div>

      <!-- Bewegungseffekte -->
      <div class="effect-category">
        <span class="category-title">{{ t('foto.movementEffects') }}</span>
        <div v-for="effect in movementEffects" :key="effect.id" class="effect-item" :data-effect-id="effect.id">
          <label class="effect-checkbox-label">
            <input type="checkbox" class="effect-checkbox" @change="$emit('effect-toggle', effect.id, $event.target.checked)" />
            <span class="effect-name">{{ effect.name }}</span>
          </label>
          <select class="effect-source-select" @change="$emit('effect-source-change', effect.id, $event.target.value)">
            <option value="">{{ t('foto.global') }}</option>
            <option value="bass">{{ t('foto.bass') }}</option>
            <option value="mid">{{ t('foto.mid') }}</option>
            <option value="treble">{{ t('foto.treble') }}</option>
            <option value="volume">{{ t('foto.volume') }}</option>
          </select>
          <input type="range" class="effect-slider" min="0" max="100" value="50" @input="$emit('effect-intensity-change', effect.id, $event.target.value)" />
          <span class="effect-value">50%</span>
        </div>
      </div>

      <!-- Spezialeffekte -->
      <div class="effect-category">
        <span class="category-title">{{ t('foto.specialEffects') }}</span>
        <div v-for="effect in specialEffects" :key="effect.id" class="effect-item" :data-effect-id="effect.id">
          <label class="effect-checkbox-label">
            <input type="checkbox" class="effect-checkbox" @change="$emit('effect-toggle', effect.id, $event.target.checked)" />
            <span class="effect-name">{{ effect.name }}</span>
          </label>
          <select class="effect-source-select" @change="$emit('effect-source-change', effect.id, $event.target.value)">
            <option value="">{{ t('foto.global') }}</option>
            <option value="bass">{{ t('foto.bass') }}</option>
            <option value="mid">{{ t('foto.mid') }}</option>
            <option value="treble">{{ t('foto.treble') }}</option>
            <option value="volume">{{ t('foto.volume') }}</option>
          </select>
          <input type="range" class="effect-slider" min="0" max="100" value="60" @input="$emit('effect-intensity-change', effect.id, $event.target.value)" />
          <span class="effect-value">60%</span>
        </div>
      </div>
    </div>

    <!-- Preset-Aktionen -->
    <div v-if="isEnabled" class="audio-preset-actions">
      <button class="btn-preset-action btn-save" @click="$emit('save-settings')" :disabled="!hasActiveImage">
        {{ t('foto.save') }}
      </button>
      <button class="btn-preset-action btn-apply" @click="$emit('apply-settings')" :disabled="!hasSavedSettings">
        {{ t('foto.apply') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../../lib/i18n.js';

const { t, locale } = useI18n();

const props = defineProps({
  hasActiveImage: {
    type: Boolean,
    default: false
  },
  hasSavedSettings: {
    type: Boolean,
    default: false
  },
  activeAudioPreset: {
    type: String,
    default: null
  }
});

const emit = defineEmits([
  'audio-reactive-toggle',
  'source-change',
  'smoothing-change',
  'easing-change',
  'beat-boost-change',
  'phase-change',
  'toggle-preset',
  'effect-toggle',
  'effect-intensity-change',
  'effect-source-change',
  'save-settings',
  'apply-settings'
]);

// Refs
const audioReactiveEnabledRef = ref(null);
const audioLevelBarRef = ref(null);
const audioReactiveSourceRef = ref(null);
const audioReactiveSmoothingRef = ref(null);
const audioReactiveSmoothingValueRef = ref(null);
const audioReactiveEasingRef = ref(null);
const audioReactiveBeatBoostRef = ref(null);
const audioReactiveBeatBoostValueRef = ref(null);
const audioReactivePhaseRef = ref(null);
const audioReactivePhaseValueRef = ref(null);

const isEnabled = ref(false);

// Preset-Liste
const presetList = [
  { id: 'pulse', name: 'Pulse', icon: '💓' },
  { id: 'dance', name: 'Dance', icon: '💃' },
  { id: 'shake', name: 'Shake', icon: '🎸' },
  { id: 'glow', name: 'Glow', icon: '✨' },
  { id: 'strobe', name: 'Strobe', icon: '⚡' },
  { id: 'glitch', name: 'Glitch', icon: '🔥' }
];

// Effekt-Kategorien (mit i18n)
const colorEffects = computed(() => [
  { id: 'hue', name: t('foto.effectNames.hue') },
  { id: 'brightness', name: t('foto.effectNames.brightness') },
  { id: 'saturation', name: t('foto.effectNames.saturation') },
  { id: 'contrast', name: t('foto.effectNames.contrast') },
  { id: 'grayscale', name: t('foto.effectNames.grayscale') },
  { id: 'sepia', name: t('foto.effectNames.sepia') },
  { id: 'invert', name: t('foto.effectNames.invert') }
]);

const transformEffects = computed(() => [
  { id: 'scale', name: t('foto.effectNames.scale') },
  { id: 'rotation', name: t('foto.effectNames.rotation') },
  { id: 'skew', name: t('foto.effectNames.skew') },
  { id: 'perspective', name: t('foto.effectNames.perspective') }
]);

const movementEffects = computed(() => [
  { id: 'shake', name: t('foto.effectNames.shake') },
  { id: 'bounce', name: t('foto.effectNames.bounce') },
  { id: 'swing', name: t('foto.effectNames.swing') },
  { id: 'orbit', name: t('foto.effectNames.orbit') },
  { id: 'figure8', name: t('foto.effectNames.figure8') },
  { id: 'wave', name: t('foto.effectNames.wave') },
  { id: 'spiral', name: t('foto.effectNames.spiral') },
  { id: 'float', name: t('foto.effectNames.float') }
]);

const specialEffects = computed(() => [
  { id: 'glow', name: t('foto.effectNames.glow') },
  { id: 'border', name: t('foto.effectNames.border') },
  { id: 'blur', name: t('foto.effectNames.blur') },
  { id: 'strobe', name: t('foto.effectNames.strobe') },
  { id: 'chromatic', name: t('foto.effectNames.chromatic') }
]);

// Handlers
function onAudioReactiveToggle(event) {
  isEnabled.value = event.target.checked;
  emit('audio-reactive-toggle', event);
}

function onAudioReactiveSourceChange(event) {
  emit('source-change', event);
}

function onAudioReactiveSmoothingChange(event) {
  const value = parseInt(event.target.value);
  if (audioReactiveSmoothingValueRef.value) {
    audioReactiveSmoothingValueRef.value.textContent = value + '%';
  }
  emit('smoothing-change', event);
}

function onAudioReactiveEasingChange(event) {
  emit('easing-change', event);
}

function onAudioReactiveBeatBoostChange(event) {
  const value = parseFloat(event.target.value);
  const displayValue = value <= 1.0 ? t('foto.beatBoostOff') : `${Math.round((value - 1) * 100)}%`;
  if (audioReactiveBeatBoostValueRef.value) {
    audioReactiveBeatBoostValueRef.value.textContent = displayValue;
  }
  emit('beat-boost-change', event);
}

function onAudioReactivePhaseChange(event) {
  const value = parseInt(event.target.value);
  if (audioReactivePhaseValueRef.value) {
    audioReactivePhaseValueRef.value.textContent = value + '°';
  }
  emit('phase-change', event);
}

/**
 * Lädt Audio-Reaktiv Einstellungen in die UI
 */
function loadSettings(imageData) {
  if (!imageData) {
    // Reset to defaults
    isEnabled.value = false;
    if (audioReactiveEnabledRef.value) {
      audioReactiveEnabledRef.value.checked = false;
    }
    return;
  }

  const audioReactive = imageData.fotoSettings?.audioReactive || {};

  // Master-Einstellungen
  const enabled = audioReactive.enabled || false;
  isEnabled.value = enabled;
  if (audioReactiveEnabledRef.value) {
    audioReactiveEnabledRef.value.checked = enabled;
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

  if (audioReactiveEasingRef.value) {
    audioReactiveEasingRef.value.value = audioReactive.easing || 'linear';
  }

  if (audioReactiveBeatBoostRef.value) {
    const beatBoost = audioReactive.beatBoost ?? 1.0;
    audioReactiveBeatBoostRef.value.value = beatBoost;
    if (audioReactiveBeatBoostValueRef.value) {
      const displayValue = beatBoost <= 1.0 ? t('foto.beatBoostOff') : `${Math.round((beatBoost - 1) * 100)}%`;
      audioReactiveBeatBoostValueRef.value.textContent = displayValue;
    }
  }

  if (audioReactivePhaseRef.value) {
    const phase = audioReactive.phase ?? 0;
    audioReactivePhaseRef.value.value = phase;
    if (audioReactivePhaseValueRef.value) {
      audioReactivePhaseValueRef.value.textContent = phase + '°';
    }
  }

  // Effekte laden (alle Effekt-Checkboxen und Slider)
  const effects = audioReactive.effects || {};
  const allEffectIds = [
    'hue', 'brightness', 'saturation', 'contrast', 'grayscale', 'sepia', 'invert',
    'scale', 'rotation', 'skew', 'perspective',
    'shake', 'bounce', 'swing', 'orbit', 'figure8', 'wave', 'spiral', 'float',
    'glow', 'border', 'blur', 'strobe', 'chromatic'
  ];

  // DOM-Elemente für Effekte suchen und aktualisieren (über data-effect-id)
  setTimeout(() => {
    allEffectIds.forEach(effectId => {
      const effectData = effects[effectId];
      const enabled = effectData?.enabled || false;
      const intensity = effectData?.intensity ?? 80;
      const source = effectData?.source || '';

      // Finde die Effekt-Elemente im DOM über data-effect-id
      const effectItem = document.querySelector(`.effect-item[data-effect-id="${effectId}"]`);
      if (effectItem) {
        const checkbox = effectItem.querySelector('.effect-checkbox');
        const slider = effectItem.querySelector('.effect-slider');
        const valueSpan = effectItem.querySelector('.effect-value');
        const sourceSelect = effectItem.querySelector('.effect-source-select');

        if (checkbox) checkbox.checked = enabled;
        if (slider) slider.value = intensity;
        if (valueSpan) valueSpan.textContent = intensity + '%';
        if (sourceSelect) sourceSelect.value = source;
      }
    });
  }, 0);

  console.log('🔊 Audio-Reaktiv Einstellungen geladen:', audioReactive);
}

// Expose refs and methods
defineExpose({
  audioReactiveEnabledRef,
  audioLevelBarRef,
  audioReactiveSourceRef,
  audioReactiveSmoothingRef,
  audioReactiveSmoothingValueRef,
  audioReactiveEasingRef,
  audioReactiveBeatBoostRef,
  audioReactiveBeatBoostValueRef,
  audioReactivePhaseRef,
  audioReactivePhaseValueRef,
  isEnabled,
  loadSettings
});
</script>

<style scoped>
.audio-reactive-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audio-reactive-group {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 8px;
  padding: 10px;
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
  color: var(--text-secondary);
}

.modern-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.modern-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 500;
}

.label-text {
  color: var(--text-muted);
}

.label-value {
  color: #8b5cf6;
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  min-width: 35px;
  text-align: right;
}

.modern-select {
  width: 100%;
  padding: 4px 8px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.7rem;
  cursor: pointer;
}

.modern-select:hover {
  border-color: rgba(139, 92, 246, 0.3);
}

.modern-select:focus {
  outline: none;
  border-color: rgba(139, 92, 246, 0.5);
}

.modern-select option {
  background: var(--card-bg);
  color: var(--text-primary);
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

/* Audio Level Indicator */
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
  background: var(--secondary-bg);
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

/* Preset Buttons */
.preset-buttons {
  margin-top: 8px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 6px;
}

.preset-btn {
  padding: 6px 4px;
  font-size: 0.6rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.preset-btn:hover {
  background: rgba(139, 92, 246, 0.3);
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.preset-btn.active {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.6) 0%, rgba(236, 72, 153, 0.5) 100%);
  border-color: rgba(236, 72, 153, 0.8);
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.5), 0 0 20px rgba(236, 72, 153, 0.3);
  color: var(--text-primary);
  animation: presetGlow 2s ease-in-out infinite alternate;
}

@keyframes presetGlow {
  0% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.5), 0 0 16px rgba(236, 72, 153, 0.2); }
  100% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.7), 0 0 24px rgba(236, 72, 153, 0.4); }
}

/* Effects Grid */
.effects-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.effect-category {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  padding: 8px;
}

.category-title {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 6px;
}

.effect-item {
  display: grid;
  grid-template-columns: 1fr 50px 45px 28px;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 4px;
  transition: all 0.15s ease;
  margin-bottom: 4px;
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
  color: var(--text-secondary);
  white-space: nowrap;
}

.effect-source-select {
  width: 100%;
  padding: 2px 4px;
  font-size: 0.55rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 3px;
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  text-align: center;
}

.effect-source-select:hover {
  background: rgba(139, 92, 246, 0.25);
  border-color: rgba(139, 92, 246, 0.5);
}

.effect-source-select:focus {
  outline: none;
  border-color: #8b5cf6;
}

.effect-source-select option {
  background: var(--card-bg);
  color: var(--text-primary);
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
  color: var(--text-muted);
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

/* Preset Actions */
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
</style>
