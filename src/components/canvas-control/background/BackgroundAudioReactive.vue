<template>
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
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const bg = inject('bgSettings')
const {
  gradientEnabled,
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
  updateBgAudioReactive,
} = bg
</script>

<style scoped src="./background-shared.css"></style>
<style scoped>
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

[data-theme='light'] .audio-reactive-section h5 {
  color: #014f99;
}
[data-theme='light'] .audio-reactive-section {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.06) 100%);
  border-left-color: #014f99;
}
[data-theme='light'] .effect-item {
  background: #fdfbf2;
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

@media (max-width: 768px) {
  .audio-select {
    min-height: 36px;
    font-size: 0.65rem;
  }
  .audio-slider::-webkit-slider-thumb,
  .effect-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
  .audio-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
  }
}
</style>
