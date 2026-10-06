<template>
  <div class="panel-section">
    <div class="section-header-row">
      <h4>{{ t('beatDrop.title') }}</h4>
      <label class="toggle-switch">
        <input type="checkbox" v-model="beatDropStore.enabled" />
        <span class="toggle-track"></span>
      </label>
    </div>

    <template v-if="beatDropStore.enabled">
      <div class="control-group">
        <label>{{ t('beatDrop.source') }}:</label>
        <select v-model="beatDropStore.source" class="gradient-select">
          <option value="bass">Bass</option>
          <option value="mid">Mid</option>
          <option value="treble">Treble</option>
          <option value="volume">Volume</option>
          <option value="dynamic">Dynamic</option>
          <optgroup label="Onset (beat, auto-normalized)">
            <option value="bassOnset">Bass Onset</option>
            <option value="midOnset">Mid Onset</option>
            <option value="trebleOnset">Treble Onset</option>
            <option value="allOnset">All Onset</option>
          </optgroup>
        </select>
      </div>

      <!-- Flash -->
      <div class="beat-effect-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="beatDropStore.flashEnabled" />
          <span>{{ t('beatDrop.flash') }}</span>
        </label>
        <ColorField v-model="beatDropStore.flashColor" class="color-input-sm" />
      </div>
      <template v-if="beatDropStore.flashEnabled">
        <div class="control-group compact">
          <label>{{ t('beatDrop.intensity') }}: {{ beatDropStore.flashIntensity }}%</label>
          <SliderField
            v-model="beatDropStore.flashIntensity"
            :min="0"
            :max="100"
            :default-value="70"
            class="opacity-slider"
          />
        </div>
        <div class="control-group compact">
          <label>{{ t('beatDrop.decay') }}: {{ beatDropStore.flashDecay }}%</label>
          <SliderField
            v-model="beatDropStore.flashDecay"
            :min="1"
            :max="100"
            :default-value="60"
            class="opacity-slider"
          />
        </div>
      </template>

      <!-- Color Burst -->
      <div class="beat-effect-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="beatDropStore.colorBurstEnabled" />
          <span>{{ t('beatDrop.colorBurst') }}</span>
        </label>
        <ColorField v-model="beatDropStore.colorBurstColor" class="color-input-sm" />
      </div>
      <template v-if="beatDropStore.colorBurstEnabled">
        <div class="control-group compact">
          <label>{{ t('beatDrop.intensity') }}: {{ beatDropStore.colorBurstIntensity }}%</label>
          <SliderField
            v-model="beatDropStore.colorBurstIntensity"
            :min="0"
            :max="100"
            :default-value="60"
            class="opacity-slider"
          />
        </div>
      </template>

      <!-- Strobe -->
      <div class="beat-effect-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="beatDropStore.strobeEnabled" />
          <span>{{ t('beatDrop.strobe') }}</span>
        </label>
      </div>
      <template v-if="beatDropStore.strobeEnabled">
        <div class="control-group compact">
          <label>{{ t('beatDrop.rate') }}: {{ beatDropStore.strobeRate }} Hz</label>
          <SliderField
            v-model="beatDropStore.strobeRate"
            :min="1"
            :max="30"
            :default-value="8"
            class="opacity-slider"
          />
        </div>
        <div class="control-group compact">
          <label>{{ t('beatDrop.intensity') }}: {{ beatDropStore.strobeIntensity }}%</label>
          <SliderField
            v-model="beatDropStore.strobeIntensity"
            :min="0"
            :max="100"
            :default-value="80"
            class="opacity-slider"
          />
        </div>
      </template>

      <!-- Vignette Pulse -->
      <div class="beat-effect-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="beatDropStore.vignettePulseEnabled" />
          <span>{{ t('beatDrop.vignette') }}</span>
        </label>
        <ColorField v-model="beatDropStore.vignettePulseColor" class="color-input-sm" />
      </div>
      <template v-if="beatDropStore.vignettePulseEnabled">
        <div class="control-group compact">
          <label>{{ t('beatDrop.intensity') }}: {{ beatDropStore.vignettePulseIntensity }}%</label>
          <SliderField
            v-model="beatDropStore.vignettePulseIntensity"
            :min="0"
            :max="100"
            :default-value="70"
            class="opacity-slider"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import ColorField from '../ui/ColorField.vue'
import SliderField from '../ui/SliderField.vue'
import { useI18n } from '../../lib/i18n.js'
import { useBeatDropStore } from '../../stores/beatDropStore.js'

const { t } = useI18n()
const beatDropStore = useBeatDropStore()
</script>

<style scoped>
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header-row h4 {
  margin: 0;
}

.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-track {
  width: 32px;
  height: 18px;
  background: var(--border-color);
  border-radius: var(--ds-radius-md);
  position: relative;
  transition: background var(--ds-duration) var(--ds-ease);
}

.toggle-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: #fff;
  transition: transform var(--ds-duration) var(--ds-ease);
}

.toggle-switch input:checked + .toggle-track {
  background: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-track::after {
  transform: translateX(14px);
}

.beat-effect-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  margin-bottom: 2px;
}

.color-input-sm {
  width: 28px;
  height: 22px;
  border: none;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  padding: 0;
  background: none;
}

.control-group {
  margin-bottom: 6px;
}

.control-group label {
  display: block;
  margin-bottom: 4px;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  font-weight: var(--ds-weight-medium);
}

.control-group.compact {
  margin-top: 4px;
  margin-bottom: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
}

.gradient-select {
  width: 100%;
  padding: 5px 8px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  cursor: pointer;
}

.opacity-slider {
  width: 100%;
  height: 3px;
  background: var(--text-muted);
  border-radius: var(--ds-radius-sm);
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
  background-color: var(--accent-tertiary);
  border: 2px solid var(--ds-surface-1);
  border-radius: var(--ds-radius-full);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

@media (max-width: 768px) {
  .gradient-select {
    min-height: 36px;
    font-size: var(--ds-text-xs);
  }

  .opacity-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
}
</style>
