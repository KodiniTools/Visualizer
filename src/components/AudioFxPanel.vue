<template>
  <div class="audio-fx-section">
    <div class="fx-header" @click="open = !open">
      <span>Audio-Reaktive Effekte</span>
      <span class="chevron" :class="{ open }" aria-hidden="true"></span>
    </div>

    <template v-if="open">
      <!-- Master toggle -->
      <div class="fx-row fx-master">
        <label class="toggle-switch">
          <input type="checkbox" v-model="store.enabled" />
          <span class="toggle-track"></span>
        </label>
        <span>Effekte aktiv</span>
      </div>

      <template v-if="store.enabled">
        <!-- BRIGHTNESS -->
        <FxEffect title="Helligkeit" v-model="store.brightnessEnabled">
          <FxSource v-model="store.brightnessSource" />
          <FxRange label="Min" v-model.number="store.brightnessMin" :min="0" :max="200" />
          <FxRange label="Max" v-model.number="store.brightnessMax" :min="0" :max="300" />
        </FxEffect>

        <!-- SATURATION -->
        <FxEffect title="Sättigung" v-model="store.saturationEnabled">
          <FxSource v-model="store.saturationSource" />
          <FxRange label="Min" v-model.number="store.saturationMin" :min="0" :max="200" />
          <FxRange label="Max" v-model.number="store.saturationMax" :min="0" :max="400" />
        </FxEffect>

        <!-- CONTRAST -->
        <FxEffect title="Kontrast" v-model="store.contrastEnabled">
          <FxSource v-model="store.contrastSource" />
          <FxRange label="Min" v-model.number="store.contrastMin" :min="0" :max="200" />
          <FxRange label="Max" v-model.number="store.contrastMax" :min="0" :max="300" />
        </FxEffect>

        <!-- HUE ROTATE -->
        <FxEffect title="Farbton-Rotation" v-model="store.hueEnabled">
          <FxSource v-model="store.hueSource" />
          <FxRange label="Bereich" v-model.number="store.hueRange" :min="0" :max="360" unit="°" />
        </FxEffect>

        <!-- PULSE -->
        <FxEffect title="Pulsierung" v-model="store.pulseEnabled">
          <FxSource v-model="store.pulseSource" />
          <FxRange label="Stärke" v-model.number="store.pulseStrength" :min="0" :max="100" />
        </FxEffect>

        <!-- GLOW -->
        <FxEffect title="Glow" v-model="store.glowEnabled">
          <FxSource v-model="store.glowSource" />
          <div class="fx-row">
            <label>Farbe</label>
            <input type="color" v-model="store.glowColor" class="color-input-sm" />
          </div>
          <FxRange label="Intensität" v-model.number="store.glowIntensity" :min="0" :max="100" />
        </FxEffect>

        <!-- TINT -->
        <FxEffect title="Farb-Tint" v-model="store.tintEnabled">
          <FxSource v-model="store.tintSource" />
          <div class="fx-row">
            <label>Farbe</label>
            <input type="color" v-model="store.tintColor" class="color-input-sm" />
          </div>
          <FxRange label="Intensität" v-model.number="store.tintIntensity" :min="0" :max="100" />
        </FxEffect>

        <!-- VIGNETTE -->
        <FxEffect title="Vignette" v-model="store.vignetteEnabled">
          <FxSource v-model="store.vignetteSource" />
          <FxRange
            label="Intensität"
            v-model.number="store.vignetteIntensity"
            :min="0"
            :max="100"
          />
        </FxEffect>

        <div class="fx-group-label">Rhythmus & Kamera</div>

        <!-- ZOOM-PUNCH (beat) -->
        <FxEffect title="Zoom-Punch (Beat)" v-model="store.zoomPunchEnabled">
          <FxRange label="Stärke" v-model.number="store.zoomPunchStrength" :min="0" :max="100" />
        </FxEffect>

        <!-- VIGNETTE-PULS (beat) -->
        <FxEffect title="Vignette-Puls (Beat)" v-model="store.vignettePulseEnabled">
          <FxRange
            label="Intensität"
            v-model.number="store.vignettePulseIntensity"
            :min="0"
            :max="100"
          />
        </FxEffect>

        <!-- BPM-LOCK-PULS -->
        <FxEffect title="BPM-Puls" v-model="store.bpmPulseEnabled">
          <FxRange label="Stärke" v-model.number="store.bpmPulseStrength" :min="0" :max="100" />
        </FxEffect>

        <!-- FREQUENZ-SPLIT -->
        <FxEffect title="Frequenz-Split" v-model="store.freqSplitEnabled">
          <FxRange label="Stärke" v-model.number="store.freqSplitStrength" :min="0" :max="100" />
        </FxEffect>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAudioFxStore } from '../stores/audioFxStore.js'
import FxEffect from './audio-fx/FxEffect.vue'
import FxSource from './audio-fx/FxSource.vue'
import FxRange from './audio-fx/FxRange.vue'

const store = useAudioFxStore()
const open = ref(false)
</script>

<style scoped>
.audio-fx-section {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 8px;
  margin-top: 4px;
}
.fx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  color: #ccc;
  padding: 4px 2px;
  user-select: none;
}
.fx-header:hover {
  color: #fff;
}
.chevron {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  opacity: 0.6;
  flex-shrink: 0;
}
.chevron.open {
  transform: rotate(-135deg);
}

.fx-master {
  margin: 6px 0 4px;
  gap: 8px;
  font-size: 0.82rem;
  color: #bbb;
}
.fx-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #aaa;
}
.toggle-switch {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.toggle-switch input {
  display: none;
}
.toggle-track {
  width: 28px;
  height: 15px;
  background: #444;
  border-radius: 8px;
  position: relative;
  transition: background 0.2s;
}
.toggle-switch input:checked + .toggle-track {
  background: #4a9eff;
}
.toggle-track::after {
  content: '';
  position: absolute;
  width: 11px;
  height: 11px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: left 0.2s;
}
.toggle-switch input:checked + .toggle-track::after {
  left: 15px;
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

.fx-group-label {
  margin: 10px 0 2px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #7a8da0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 8px;
}
</style>
