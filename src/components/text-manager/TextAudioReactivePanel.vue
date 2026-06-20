<template>
  <!-- ✨ AUDIO-REACTIVE EFFECTS (collapsible) -->
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">🎵</span>
      <span>{{ t('canvasControl.audioReactive') }}</span>
      <span v-if="selectedText.audioReactive?.enabled" class="status-badge active">{{
        t('textManager.active')
      }}</span>
    </summary>
    <div class="section-content">
      <!-- Enable/Disable -->
      <div class="control-group">
        <label>{{ t('textManager.audioReactiveEffects') }}:</label>
        <div class="button-group">
          <button
            @click="toggleAudioReactive"
            :class="['btn-small', { active: selectedText.audioReactive?.enabled }]"
          >
            {{
              selectedText.audioReactive?.enabled
                ? t('textManager.activated')
                : t('textManager.deactivated')
            }}
          </button>
        </div>
      </div>

      <!-- Audio settings (only when enabled) -->
      <div v-if="selectedText.audioReactive?.enabled">
        <!-- Audio Source -->
        <div class="control-group">
          <label>{{ t('textManager.audioSource') }}:</label>
          <select
            v-model="selectedText.audioReactive.source"
            @change="updateText"
            class="select-input"
          >
            <option value="bass">{{ t('textManager.bassKickDrums') }}</option>
            <option value="mid">{{ t('textManager.midVocalsMelody') }}</option>
            <option value="treble">{{ t('textManager.trebleHiHatsHighs') }}</option>
            <option value="volume">{{ t('textManager.volumeOverall') }}</option>
            <option value="dynamic">✨ {{ t('textManager.dynamicAutoBlend') }}</option>
          </select>
          <div
            v-if="selectedText.audioReactive.source === 'dynamic'"
            class="hint-text"
            style="color: var(--accent-primary, #c9984d)"
          >
            {{ t('textManager.dynamicHint') }}
          </div>
        </div>

        <!-- Smoothing -->
        <div class="control-group">
          <label>
            {{ t('textManager.smoothing') }}: {{ selectedText.audioReactive.smoothing }}%
          </label>
          <input
            type="range"
            v-model.number="selectedText.audioReactive.smoothing"
            @input="updateText"
            min="0"
            max="100"
            class="slider"
          />
          <div class="hint-text">{{ t('textManager.smoothingHint') }}</div>
        </div>

        <!-- ✨ Advanced Audio Settings -->
        <details class="advanced-settings">
          <summary>⚙️ {{ t('textManager.advancedSettings') }}</summary>

          <!-- Presets -->
          <div class="control-group">
            <label>{{ t('presets.title') }}:</label>
            <div class="preset-buttons">
              <button
                v-for="preset in AUDIO_PRESETS"
                :key="preset.id"
                @click="applyAudioPreset(preset.id)"
                class="btn-preset"
                :title="t(preset.titleKey)"
              >
                {{ preset.icon }} {{ t(preset.labelKey) }}
              </button>
            </div>
          </div>

          <!-- Threshold -->
          <div class="control-group">
            <label>
              {{ t('textManager.threshold') }}: {{ selectedText.audioReactive.threshold || 0 }}%
            </label>
            <input
              type="range"
              v-model.number="selectedText.audioReactive.threshold"
              @input="updateText"
              min="0"
              max="50"
              class="slider"
            />
            <div class="hint-text">{{ t('textManager.thresholdHint') }}</div>
          </div>

          <!-- Attack -->
          <div class="control-group">
            <label>
              {{ t('textManager.attack') }}: {{ selectedText.audioReactive.attack || 90 }}%
            </label>
            <input
              type="range"
              v-model.number="selectedText.audioReactive.attack"
              @input="updateText"
              min="10"
              max="100"
              class="slider"
            />
            <div class="hint-text">{{ t('textManager.attackHint') }}</div>
          </div>

          <!-- Release -->
          <div class="control-group">
            <label>
              {{ t('textManager.release') }}: {{ selectedText.audioReactive.release || 50 }}%
            </label>
            <input
              type="range"
              v-model.number="selectedText.audioReactive.release"
              @input="updateText"
              min="10"
              max="100"
              class="slider"
            />
            <div class="hint-text">{{ t('textManager.releaseHint') }}</div>
          </div>

          <!-- Reset Button -->
          <button @click="resetAudioSettings" class="btn-reset">
            🔄 {{ t('textManager.reset') }}
          </button>
        </details>

        <div class="divider"></div>

        <h4>{{ t('textManager.selectEffects') }}</h4>

        <!-- Effects List (data-driven) -->
        <div class="effects-grid">
          <div v-for="effect in EFFECTS" :key="effect.key" class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects[effect.key].enabled"
                  @change="updateText"
                />
                <span class="effect-icon">{{ effect.icon }}</span>
                {{ t(effect.labelKey) }}
              </label>
              <span v-if="effect.hintKey" class="effect-hint" :title="t(effect.hintKey)">ℹ️</span>
            </div>

            <!-- Standard intensity slider -->
            <div
              v-if="
                selectedText.audioReactive.effects[effect.key].enabled && effect.key !== 'opacity'
              "
              class="effect-intensity"
            >
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects[effect.key].intensity"
                @input="updateText"
                :min="effect.min ?? 10"
                :max="effect.max ?? 100"
                class="slider-small"
              />
              <span class="intensity-value">
                {{ selectedText.audioReactive.effects[effect.key].intensity }}%
              </span>
            </div>

            <!-- Opacity: extra controls (minimum + ease curve) -->
            <div
              v-if="
                selectedText.audioReactive.effects[effect.key].enabled && effect.key === 'opacity'
              "
              class="effect-details"
            >
              <div class="effect-intensity">
                <span class="effect-label">{{ t('textManager.intensity') }}:</span>
                <input
                  type="range"
                  v-model.number="selectedText.audioReactive.effects.opacity.intensity"
                  @input="updateText"
                  min="10"
                  max="100"
                  class="slider-small"
                />
                <span class="intensity-value">
                  {{ selectedText.audioReactive.effects.opacity.intensity }}%
                </span>
              </div>
              <div class="effect-intensity">
                <span class="effect-label">{{ t('textManager.minimum') }}:</span>
                <input
                  type="range"
                  v-model.number="selectedText.audioReactive.effects.opacity.minimum"
                  @input="updateText"
                  min="0"
                  max="90"
                  class="slider-small"
                />
                <span class="intensity-value">
                  {{ selectedText.audioReactive.effects.opacity.minimum || 0 }}%
                </span>
              </div>
              <label class="effect-checkbox-small">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.opacity.ease"
                  @change="updateText"
                />
                {{ t('textManager.easeCurve') }}
              </label>
            </div>
          </div>
        </div>

        <!-- Reset All Effects Button -->
        <button @click="resetAllAudioEffects" class="btn-reset-all-effects">
          <span class="reset-icon">🔄</span>
          {{ t('textManager.resetAllEffects') }}
        </button>

        <!-- Save/Load Audio Effects Preset -->
        <div class="audio-preset-actions">
          <button @click="saveAudioEffectsPreset" class="btn-save-preset">
            <span class="preset-icon">💾</span>
            {{ t('textManager.saveEffectsPreset') }}
          </button>
          <button
            @click="loadAudioEffectsPreset"
            class="btn-load-preset"
            :disabled="!hasAudioEffectsPreset"
            :title="hasAudioEffectsPreset ? '' : t('textManager.noPresetSaved')"
          >
            <span class="preset-icon">📂</span>
            {{ t('textManager.loadEffectsPreset') }}
          </button>
        </div>

        <div class="hint-text" style="margin-top: 10px">
          {{ t('textManager.effectsTip') }}
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useToastStore } from '../../stores/toastStore.js'
import { useAudioReactiveText } from '../../composables/useAudioReactiveText.js'

const props = defineProps({
  selectedText: {
    type: Object,
    required: true,
  },
})

const { t } = useI18n()
const toastStore = useToastStore()
const canvasManager = inject('canvasManager')

const selectedTextRef = { value: props.selectedText }

const {
  hasAudioEffectsPreset,
  toggleAudioReactive,
  applyAudioPreset,
  resetAudioSettings,
  resetAllAudioEffects,
  saveAudioEffectsPreset,
  loadAudioEffectsPreset,
} = useAudioReactiveText(selectedTextRef, canvasManager, toastStore)

function updateText() {
  if (canvasManager.value?.redrawCallback) {
    canvasManager.value.redrawCallback()
  }
}

const AUDIO_PRESETS = [
  {
    id: 'punchy',
    icon: '⚡',
    labelKey: 'textManager.presetPunchy',
    titleKey: 'textManager.presetPunchyTitle',
  },
  {
    id: 'smooth',
    icon: '🌊',
    labelKey: 'textManager.presetSmooth',
    titleKey: 'textManager.presetSmoothTitle',
  },
  {
    id: 'subtle',
    icon: '🎭',
    labelKey: 'textManager.presetSubtle',
    titleKey: 'textManager.presetSubtleTitle',
  },
  {
    id: 'extreme',
    icon: '🔥',
    labelKey: 'textManager.presetExtreme',
    titleKey: 'textManager.presetExtremeTitle',
  },
]

const EFFECTS = [
  { key: 'hue', icon: '🎨', labelKey: 'textManager.colorRotation' },
  { key: 'brightness', icon: '☀️', labelKey: 'textManager.brightness' },
  { key: 'scale', icon: '📐', labelKey: 'textManager.pulsate' },
  { key: 'glow', icon: '✨', labelKey: 'textManager.glow' },
  { key: 'shake', icon: '🫨', labelKey: 'textManager.shake' },
  { key: 'bounce', icon: '⬆️', labelKey: 'textManager.bounce' },
  { key: 'swing', icon: '➡️', labelKey: 'textManager.swing' },
  { key: 'opacity', icon: '👁️', labelKey: 'textManager.blink' },
  { key: 'letterSpacing', icon: '↔️', labelKey: 'textManager.spacing' },
  { key: 'strokeWidth', icon: '🖼️', labelKey: 'textManager.outline' },
  { key: 'skew', icon: '📐', labelKey: 'textManager.skew', hintKey: 'textManager.skewHint' },
  { key: 'strobe', icon: '⚡', labelKey: 'textManager.strobe', hintKey: 'textManager.strobeHint' },
  {
    key: 'rgbGlitch',
    icon: '🌈',
    labelKey: 'textManager.rgbGlitch',
    hintKey: 'textManager.rgbGlitchHint',
  },
  {
    key: 'perspective3d',
    icon: '🎲',
    labelKey: 'textManager.perspective3d',
    hintKey: 'textManager.perspective3dHint',
  },
  { key: 'wave', icon: '🌊', labelKey: 'textManager.wave', hintKey: 'textManager.waveHint' },
  {
    key: 'rotation',
    icon: '🔄',
    labelKey: 'textManager.rotation',
    hintKey: 'textManager.rotationHint',
  },
  {
    key: 'elastic',
    icon: '🎈',
    labelKey: 'textManager.elastic',
    hintKey: 'textManager.elasticHint',
  },
]
</script>

<style scoped>
/* ===== SHARED BASE STYLES ===== */
.control-group {
  margin-bottom: 6px;
}

.control-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}

.select-input {
  width: 100%;
  padding: 5px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  font-family: inherit;
  transition: all 0.2s ease;
}

.select-input:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
  background-color: var(--btn-hover, #1a2a42);
}

.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 3px;
  line-height: 1.4;
}

.slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider::-moz-range-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.button-group {
  display: flex;
  gap: 4px;
}

.btn-small {
  flex: 1;
  padding: 5px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-small:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: translateY(-1px);
}

.btn-small.active {
  background: rgba(201, 152, 77, 0.3);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
  font-weight: 600;
}

h4 {
  margin: 8px 0 6px 0;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ===== COLLAPSIBLE SECTIONS ===== */
.collapsible-section {
  background-color: var(--secondary-bg);
  border: 1px solid var(--card-bg);
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.collapsible-section:hover {
  border-color: var(--btn-hover);
}

.collapsible-section[open] {
  border-color: var(--btn-hover);
}

.collapsible-section summary {
  list-style: none;
}

.collapsible-section summary::-webkit-details-marker {
  display: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--secondary-bg) 100%);
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  user-select: none;
}

.section-header:hover {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
  color: #fff;
}

.collapsible-section[open] .section-header {
  border-bottom: 1px solid var(--card-bg);
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
}

.section-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.section-header::before {
  content: '▶';
  font-size: 8px;
  color: #6ea8fe;
  transition: transform 0.2s ease;
  margin-right: 4px;
}

.collapsible-section[open] .section-header::before {
  transform: rotate(90deg);
}

.section-content {
  padding: 12px;
  background-color: var(--secondary-bg);
}

.status-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 9px;
  font-weight: 600;
  border-radius: 10px;
  background-color: var(--secondary-bg);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-badge.active {
  background: linear-gradient(135deg, #2a5a2a 0%, #3a6a3a 100%);
  color: #8fdf8f;
  border: 1px solid #4a7a4a;
}

/* ===== DIVIDER ===== */
.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #444 50%, transparent 100%);
  margin: 16px 0;
}

/* ===== AUDIO-REACTIVE EFFECTS GRID ===== */
.effects-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.effect-item {
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 5px;
  padding: 6px 8px;
  transition: all 0.2s ease;
}

.effect-item:hover {
  border-color: var(--accent-primary, #c9984d);
  background-color: var(--btn-hover, #1a2a42);
}

.effect-header {
  display: flex;
  align-items: center;
}

.effect-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.55rem;
  color: var(--text-primary, #e9e9eb);
  user-select: none;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.effect-checkbox input[type='checkbox'] {
  width: 12px;
  height: 12px;
  cursor: pointer;
  accent-color: var(--accent-primary, #c9984d);
}

.effect-icon {
  font-size: 0.65rem;
  margin-right: 2px;
}

.effect-intensity {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.effect-details {
  margin-top: 6px;
  padding: 6px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.effect-details .effect-intensity {
  margin-top: 4px;
  padding-top: 4px;
  border-top: none;
}

.effect-details .effect-intensity:first-child {
  margin-top: 0;
  padding-top: 0;
}

.effect-label {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  min-width: 50px;
  text-transform: uppercase;
}

.effect-checkbox-small {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 6px;
  cursor: pointer;
  text-transform: uppercase;
}

.effect-checkbox-small input[type='checkbox'] {
  width: 10px;
  height: 10px;
  cursor: pointer;
}

.effect-hint {
  margin-left: auto;
  cursor: help;
  font-size: 0.6rem;
}

.advanced-settings {
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  padding: 6px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
}

.advanced-settings summary {
  cursor: pointer;
  font-size: 0.55rem;
  color: var(--accent-primary, #c9984d);
  padding: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.advanced-settings summary:hover {
  color: var(--accent-tertiary, #f8e1a9);
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.btn-preset {
  flex: 1;
  min-width: 60px;
  padding: 5px 6px;
  font-size: 0.5rem;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.btn-preset:hover {
  background: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
  transform: translateY(-1px);
}

.btn-preset:active {
  transform: translateY(0);
}

.btn-reset {
  width: 100%;
  margin-top: 8px;
  padding: 5px 8px;
  font-size: 0.55rem;
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 4px;
  color: #ffaaaa;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-reset:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.5);
  color: #fff;
}

/* Reset All Effects Button */
.btn-reset-all-effects {
  width: 100%;
  margin-top: 12px;
  padding: 10px 14px;
  font-size: 0.65rem;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(255, 100, 100, 0.15) 0%, rgba(255, 150, 100, 0.15) 100%);
  border: 1px solid rgba(255, 100, 100, 0.4);
  border-radius: 6px;
  color: #ffaaaa;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-reset-all-effects:hover {
  background: linear-gradient(135deg, rgba(255, 100, 100, 0.25) 0%, rgba(255, 150, 100, 0.25) 100%);
  border-color: rgba(255, 100, 100, 0.6);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 100, 100, 0.2);
}

.btn-reset-all-effects .reset-icon {
  font-size: 0.8rem;
}

/* Audio Effects Preset Actions */
.audio-preset-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-save-preset,
.btn-load-preset {
  flex: 1;
  padding: 8px 12px;
  font-size: 0.6rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-save-preset {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(129, 199, 132, 0.15) 100%);
  border: 1px solid rgba(76, 175, 80, 0.4);
  color: #81c784;
}

.btn-save-preset:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(129, 199, 132, 0.25) 100%);
  border-color: rgba(76, 175, 80, 0.6);
  color: #a5d6a7;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.btn-load-preset {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(100, 181, 246, 0.15) 100%);
  border: 1px solid rgba(33, 150, 243, 0.4);
  color: #64b5f6;
}

.btn-load-preset:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.25) 0%, rgba(100, 181, 246, 0.25) 100%);
  border-color: rgba(33, 150, 243, 0.6);
  color: #90caf9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
}

.btn-load-preset:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.btn-save-preset .preset-icon,
.btn-load-preset .preset-icon {
  font-size: 0.75rem;
}

.advanced-settings .control-group {
  margin-top: 6px;
}

.advanced-settings .control-group label {
  font-size: 0.55rem;
}

.advanced-settings .hint-text {
  font-size: 0.45rem;
  margin-top: 2px;
}

.slider-small {
  flex: 1;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}

.slider-small::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider-small::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  background: var(--accent-primary, #c9984d);
}

.slider-small::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider-small::-moz-range-thumb:hover {
  transform: scale(1.1);
  background: var(--accent-primary, #c9984d);
}

.intensity-value {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  font-weight: 500;
  min-width: 30px;
  text-align: right;
  font-family: monospace;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .btn-small.active {
  background: rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .slider::-webkit-slider-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider::-moz-range-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider-small::-webkit-slider-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider-small::-moz-range-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .effect-details {
  background: rgba(1, 79, 153, 0.04);
}

[data-theme='light'] .advanced-settings {
  background: rgba(1, 79, 153, 0.04);
}

[data-theme='light'] .btn-reset {
  background: rgba(244, 67, 54, 0.08);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #c62828;
}

[data-theme='light'] .btn-reset:hover {
  background: rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.5);
  color: #b71c1c;
}

[data-theme='light'] .btn-reset-all-effects {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(255, 150, 100, 0.08) 100%);
  border: 1px solid rgba(244, 67, 54, 0.35);
  color: #c62828;
}

[data-theme='light'] .btn-reset-all-effects:hover {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(255, 150, 100, 0.15) 100%);
  border-color: rgba(244, 67, 54, 0.5);
  color: #b71c1c;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.1);
}

[data-theme='light'] .btn-save-preset {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(129, 199, 132, 0.08) 100%);
  border: 1px solid rgba(76, 175, 80, 0.35);
  color: #2e7d32;
}

[data-theme='light'] .btn-save-preset:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(129, 199, 132, 0.15) 100%);
  border-color: rgba(76, 175, 80, 0.5);
  color: #1b5e20;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.1);
}

[data-theme='light'] .btn-load-preset {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.08) 0%, rgba(1, 79, 153, 0.05) 100%);
  border: 1px solid rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-load-preset:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.15) 0%, rgba(1, 79, 153, 0.1) 100%);
  border-color: rgba(1, 79, 153, 0.5);
  color: #003971;
  box-shadow: 0 4px 12px rgba(1, 79, 153, 0.1);
}

[data-theme='light'] .collapsible-section {
  background-color: #ffffff;
  border: 1px solid rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .collapsible-section:hover {
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .collapsible-section[open] {
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .section-header {
  background: linear-gradient(135deg, #f9f2d5 0%, #ffffff 100%);
  color: #003971;
}

[data-theme='light'] .section-header:hover {
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
  color: #014f99;
}

[data-theme='light'] .collapsible-section[open] .section-header {
  border-bottom: 1px solid rgba(1, 79, 153, 0.12);
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
}

[data-theme='light'] .section-header::before {
  color: #014f99;
}

[data-theme='light'] .section-content {
  background-color: #ffffff;
}

[data-theme='light'] .status-badge {
  background-color: #e8e0c4;
  color: #4d6d8e;
}

[data-theme='light'] .status-badge.active {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.08) 100%);
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.35);
}

[data-theme='light'] .divider {
  background: linear-gradient(90deg, transparent 0%, rgba(201, 152, 77, 0.4) 50%, transparent 100%);
}
</style>
