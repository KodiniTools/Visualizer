<template>
  <div class="audio-reactive-group">
    <div class="checkbox-control">
      <label class="modern-checkbox-label">
        <input
          type="checkbox"
          :ref="arc.audioReactiveEnabledRef"
          class="modern-checkbox"
          @change="onAudioReactiveToggle"
        />
        <span class="checkbox-text">{{ t('foto.audioReactive') }}</span>
      </label>
    </div>

    <!-- Audio-Level Anzeige -->
    <div v-if="isEnabled" class="audio-level-indicator">
      <span class="level-label">{{ t('foto.audioLevel') }}</span>
      <div class="level-bar-container">
        <div class="level-bar" :ref="arc.audioLevelBarRef"></div>
      </div>
    </div>

    <!-- Master-Einstellungen -->
    <template v-if="isEnabled">
      <!-- Audio-Quelle -->
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.audioSource') }}</span>
        </div>
        <select
          :ref="arc.audioReactiveSourceRef"
          class="modern-select"
          @change="onAudioReactiveSourceChange"
        >
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
          <span class="label-value" :ref="arc.audioReactiveSmoothingValueRef">50%</span>
        </div>
        <input
          type="range"
          :ref="arc.audioReactiveSmoothingRef"
          min="0"
          max="100"
          value="50"
          class="audio-slider"
          @input="onAudioReactiveSmoothingChange"
        />
      </div>

      <!-- Audio-Pegel (Gain) -->
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.audioGain') }}</span>
          <span class="label-value" :ref="arc.audioReactiveGainValueRef">100%</span>
        </div>
        <input
          type="range"
          :ref="arc.audioReactiveGainRef"
          min="0"
          max="2"
          step="0.05"
          value="1"
          class="audio-slider"
          @input="onAudioReactiveGainChange"
        />
      </div>

      <!-- Easing -->
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.easing') }}</span>
        </div>
        <select
          :ref="arc.audioReactiveEasingRef"
          class="modern-select"
          @change="onAudioReactiveEasingChange"
        >
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
          <span class="label-value" :ref="arc.audioReactiveBeatBoostValueRef">Aus</span>
        </div>
        <input
          type="range"
          :ref="arc.audioReactiveBeatBoostRef"
          min="1.0"
          max="3.0"
          step="0.1"
          value="1.0"
          class="audio-slider"
          @input="onAudioReactiveBeatBoostChange"
        />
      </div>

      <!-- Phase -->
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.phase') }}</span>
          <span class="label-value" :ref="arc.audioReactivePhaseValueRef">0°</span>
        </div>
        <input
          type="range"
          :ref="arc.audioReactivePhaseRef"
          min="0"
          max="360"
          value="0"
          class="audio-slider"
          @input="onAudioReactivePhaseChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const arc = inject('audioReactiveControls')
const {
  isEnabled,
  onAudioReactiveToggle,
  onAudioReactiveSourceChange,
  onAudioReactiveSmoothingChange,
  onAudioReactiveEasingChange,
  onAudioReactiveBeatBoostChange,
  onAudioReactivePhaseChange,
  onAudioReactiveGainChange,
} = arc
</script>

<style scoped src="./audio-reactive-shared.css"></style>
<style scoped>
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
.modern-select:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgb(139 92 246 / 35%);
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

[data-theme='light'] .audio-reactive-group {
  border-color: var(--border-color);
}
[data-theme='light'] .modern-checkbox-label {
  background: #fdfbf2;
}
[data-theme='light'] .modern-checkbox-label:hover {
  background: var(--btn-hover);
}
[data-theme='light'] .level-bar-container {
  border-color: var(--border-color);
}
[data-theme='light'] .audio-slider {
  background: linear-gradient(90deg, rgba(7, 63, 116, 0.25) 0%, rgba(1, 79, 153, 0.45) 100%);
}
[data-theme='light'] .audio-slider::-webkit-slider-thumb {
  background: #073f74;
}
[data-theme='light'] .audio-slider::-moz-range-thumb {
  background: #073f74;
}
[data-theme='light'] .label-value {
  color: #073f74;
}
[data-theme='light'] .modern-select:hover {
  border-color: var(--accent-secondary);
}
[data-theme='light'] .modern-select:focus-visible {
  border-color: var(--accent-primary);
}

@media (max-width: 768px) {
  .modern-checkbox-label {
    padding: 8px 10px;
  }
  .audio-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
  .audio-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
  }
  .modern-select {
    min-height: 36px;
    font-size: 0.75rem;
  }
}
</style>
