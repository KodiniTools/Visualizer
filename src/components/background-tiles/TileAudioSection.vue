<template>
  <div class="audio-section">
    <div class="audio-header">
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="tilesStore.selectedTile.audioReactive?.enabled"
          @change="toggleAudioReactive($event.target.checked)"
        />
        <span>{{ t('backgroundTiles.audioReactive') }}</span>
      </label>
    </div>

    <div v-if="tilesStore.selectedTile.audioReactive?.enabled" class="audio-controls">
      <!-- Audio-Quelle -->
      <div class="control-group">
        <label>{{ t('backgroundTiles.reactsTo') }}:</label>
        <select
          :value="tilesStore.selectedTile.audioReactive.source"
          class="audio-select"
          @change="setAudioSource($event.target.value)"
        >
          <option value="bass">{{ t('backgroundTiles.bassBass') }}</option>
          <option value="mid">{{ t('backgroundTiles.midVocals') }}</option>
          <option value="treble">{{ t('backgroundTiles.trebleHiHats') }}</option>
          <option value="volume">{{ t('backgroundTiles.volumeTotal') }}</option>
          <option value="dynamic">{{ t('backgroundTiles.dynamicAuto') }}</option>
        </select>
      </div>

      <!-- Glättung -->
      <div class="control-group">
        <label
          >{{ t('backgroundTiles.smoothing') }}:
          {{ tilesStore.selectedTile.audioReactive.smoothing }}%</label
        >
        <input
          type="range"
          :value="tilesStore.selectedTile.audioReactive.smoothing"
          min="0"
          max="100"
          step="5"
          class="audio-slider"
          @input="setAudioSmoothing($event.target.value)"
        />
      </div>

      <!-- Effekte -->
      <div class="effects-list">
        <!-- Hue (Farbton) -->
        <label class="effect-item">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.audioReactive.effects.hue.enabled"
            @change="toggleEffect('hue', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.hue') }}</span>
          <input
            type="range"
            :value="tilesStore.selectedTile.audioReactive.effects.hue.intensity"
            min="0"
            max="100"
            step="5"
            class="effect-slider"
            @input="setEffectIntensity('hue', $event.target.value)"
          />
          <span class="effect-value"
            >{{ tilesStore.selectedTile.audioReactive.effects.hue.intensity }}%</span
          >
        </label>

        <!-- Brightness (Helligkeit) -->
        <label class="effect-item">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.audioReactive.effects.brightness.enabled"
            @change="toggleEffect('brightness', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.brightness') }}</span>
          <input
            type="range"
            :value="tilesStore.selectedTile.audioReactive.effects.brightness.intensity"
            min="0"
            max="100"
            step="5"
            class="effect-slider"
            @input="setEffectIntensity('brightness', $event.target.value)"
          />
          <span class="effect-value"
            >{{ tilesStore.selectedTile.audioReactive.effects.brightness.intensity }}%</span
          >
        </label>

        <!-- Saturation (Sättigung) -->
        <label class="effect-item">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.audioReactive.effects.saturation.enabled"
            @change="toggleEffect('saturation', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.saturation') }}</span>
          <input
            type="range"
            :value="tilesStore.selectedTile.audioReactive.effects.saturation.intensity"
            min="0"
            max="100"
            step="5"
            class="effect-slider"
            @input="setEffectIntensity('saturation', $event.target.value)"
          />
          <span class="effect-value"
            >{{ tilesStore.selectedTile.audioReactive.effects.saturation.intensity }}%</span
          >
        </label>

        <!-- Glow (Leuchten) -->
        <label class="effect-item">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.audioReactive.effects.glow.enabled"
            @change="toggleEffect('glow', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.glow') }}</span>
          <input
            type="range"
            :value="tilesStore.selectedTile.audioReactive.effects.glow.intensity"
            min="0"
            max="100"
            step="5"
            class="effect-slider"
            @input="setEffectIntensity('glow', $event.target.value)"
          />
          <span class="effect-value"
            >{{ tilesStore.selectedTile.audioReactive.effects.glow.intensity }}%</span
          >
        </label>

        <!-- Scale (Skalierung) -->
        <label class="effect-item">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.audioReactive.effects.scale.enabled"
            @change="toggleEffect('scale', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.pulse') }}</span>
          <input
            type="range"
            :value="tilesStore.selectedTile.audioReactive.effects.scale.intensity"
            min="0"
            max="100"
            step="5"
            class="effect-slider"
            @input="setEffectIntensity('scale', $event.target.value)"
          />
          <span class="effect-value"
            >{{ tilesStore.selectedTile.audioReactive.effects.scale.intensity }}%</span
          >
        </label>

        <!-- Blur (Weichzeichnen) -->
        <label class="effect-item">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.audioReactive.effects.blur.enabled"
            @change="toggleEffect('blur', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.blur') }}</span>
          <input
            type="range"
            :value="tilesStore.selectedTile.audioReactive.effects.blur.intensity"
            min="0"
            max="100"
            step="5"
            class="effect-slider"
            @input="setEffectIntensity('blur', $event.target.value)"
          />
          <span class="effect-value"
            >{{ tilesStore.selectedTile.audioReactive.effects.blur.intensity }}%</span
          >
        </label>

        <!-- Strobe (Blitz) -->
        <label class="effect-item">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.audioReactive.effects.strobe?.enabled"
            @change="toggleEffect('strobe', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.strobe') }}</span>
          <input
            type="range"
            :value="tilesStore.selectedTile.audioReactive.effects.strobe?.intensity || 80"
            min="0"
            max="100"
            step="5"
            class="effect-slider"
            @input="setEffectIntensity('strobe', $event.target.value)"
          />
          <span class="effect-value"
            >{{ tilesStore.selectedTile.audioReactive.effects.strobe?.intensity || 80 }}%</span
          >
        </label>

        <!-- Contrast (Kontrast) -->
        <label class="effect-item">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.audioReactive.effects.contrast?.enabled"
            @change="toggleEffect('contrast', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.contrastEffect') }}</span>
          <input
            type="range"
            :value="tilesStore.selectedTile.audioReactive.effects.contrast?.intensity || 70"
            min="0"
            max="100"
            step="5"
            class="effect-slider"
            @input="setEffectIntensity('contrast', $event.target.value)"
          />
          <span class="effect-value"
            >{{ tilesStore.selectedTile.audioReactive.effects.contrast?.intensity || 70 }}%</span
          >
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()
const {
  tilesStore,
  toggleAudioReactive,
  setAudioSource,
  setAudioSmoothing,
  toggleEffect,
  setEffectIntensity,
} = inject('tileControls')
</script>

<style scoped>
.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  color: #bbb;
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.checkbox-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #4ade80;
}

/* Audio-Reaktiv Sektion */
.audio-section {
  margin: 12px 0;
  padding: 12px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
}

.audio-header {
  margin-bottom: 10px;
}

.audio-header .checkbox-label span {
  font-size: 12px;
  font-weight: 600;
  color: #a78bfa;
}

.audio-controls {
  margin-top: 10px;
}

.audio-select {
  width: 100%;
  padding: 6px 10px;
  background: rgba(30, 30, 50, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 11px;
  cursor: pointer;
}

.audio-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.audio-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.effects-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-item {
  display: grid;
  grid-template-columns: auto 70px 1fr 35px;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: rgba(30, 30, 50, 0.6);
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
}

.effect-item input[type='checkbox'] {
  width: 12px;
  height: 12px;
  accent-color: #8b5cf6;
}

.effect-item span {
  color: var(--text-secondary);
}

.effect-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.effect-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.effect-value {
  font-size: 9px;
  color: #94a3b8;
  text-align: right;
  font-family: monospace;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .control-group label {
  color: #4d6d8e;
}

[data-theme='light'] .checkbox-label input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .effect-item input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .audio-section {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.06) 0%, rgba(7, 63, 116, 0.06) 100%);
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .audio-header .checkbox-label span {
  color: #014f99;
}

[data-theme='light'] .audio-select {
  background: #fdfbf2;
  color: #003971;
  border-color: var(--border-color);
}

[data-theme='light'] .audio-select:hover {
  border-color: #014f99;
}

[data-theme='light'] .audio-slider {
  background: linear-gradient(90deg, rgba(7, 63, 116, 0.25) 0%, rgba(1, 79, 153, 0.45) 100%);
}

[data-theme='light'] .audio-slider::-webkit-slider-thumb {
  background: #073f74;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .audio-slider::-moz-range-thumb {
  background: #073f74;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .effect-item {
  background: #fdfbf2;
}

[data-theme='light'] .effect-item span {
  color: #003971;
}

[data-theme='light'] .effect-slider {
  background: linear-gradient(90deg, rgba(7, 63, 116, 0.2) 0%, rgba(1, 79, 153, 0.4) 100%);
}

[data-theme='light'] .effect-slider::-webkit-slider-thumb {
  background: #073f74;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .effect-slider::-moz-range-thumb {
  background: #073f74;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .effect-value {
  color: #4d6d8e;
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .audio-slider::-webkit-slider-thumb,
  .effect-slider::-webkit-slider-thumb {
    width: 18px;
    height: 18px;
  }
}
</style>
