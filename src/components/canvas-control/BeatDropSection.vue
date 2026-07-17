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
        </select>
      </div>

      <!-- Flash -->
      <div class="beat-effect-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="beatDropStore.flashEnabled" />
          <span>{{ t('beatDrop.flash') }}</span>
        </label>
        <input type="color" v-model="beatDropStore.flashColor" class="color-input-sm" />
      </div>
      <template v-if="beatDropStore.flashEnabled">
        <div class="control-group compact">
          <label>{{ t('beatDrop.intensity') }}: {{ beatDropStore.flashIntensity }}%</label>
          <input
            type="range"
            v-model.number="beatDropStore.flashIntensity"
            min="0"
            max="100"
            class="opacity-slider"
          />
        </div>
        <div class="control-group compact">
          <label>{{ t('beatDrop.decay') }}: {{ beatDropStore.flashDecay }}%</label>
          <input
            type="range"
            v-model.number="beatDropStore.flashDecay"
            min="1"
            max="100"
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
        <input type="color" v-model="beatDropStore.colorBurstColor" class="color-input-sm" />
      </div>
      <template v-if="beatDropStore.colorBurstEnabled">
        <div class="control-group compact">
          <label>{{ t('beatDrop.intensity') }}: {{ beatDropStore.colorBurstIntensity }}%</label>
          <input
            type="range"
            v-model.number="beatDropStore.colorBurstIntensity"
            min="0"
            max="100"
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
          <input
            type="range"
            v-model.number="beatDropStore.strobeRate"
            min="1"
            max="30"
            class="opacity-slider"
          />
        </div>
        <div class="control-group compact">
          <label>{{ t('beatDrop.intensity') }}: {{ beatDropStore.strobeIntensity }}%</label>
          <input
            type="range"
            v-model.number="beatDropStore.strobeIntensity"
            min="0"
            max="100"
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
        <input type="color" v-model="beatDropStore.vignettePulseColor" class="color-input-sm" />
      </div>
      <template v-if="beatDropStore.vignettePulseEnabled">
        <div class="control-group compact">
          <label>{{ t('beatDrop.intensity') }}: {{ beatDropStore.vignettePulseIntensity }}%</label>
          <input
            type="range"
            v-model.number="beatDropStore.vignettePulseIntensity"
            min="0"
            max="100"
            class="opacity-slider"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
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
  background: var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: 9px;
  position: relative;
  transition: background 0.2s;
}

.toggle-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

.toggle-switch input:checked + .toggle-track {
  background: var(--accent-primary, #c9984d);
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
  border-radius: 4px;
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
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  font-weight: 500;
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
  font-size: 0.6rem;
  color: var(--text-primary, #e9e9eb);
}

.gradient-select {
  width: 100%;
  padding: 5px 8px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  cursor: pointer;
}

.opacity-slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(
    to right,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
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
  background-color: var(--accent-tertiary, #f8e1a9);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .gradient-select {
    min-height: 36px;
    font-size: 0.65rem;
  }

  .opacity-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
}
</style>
