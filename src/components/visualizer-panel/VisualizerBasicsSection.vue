<template>
  <!-- Visualizer Ein/Aus + Farbe (kompakte Zeilen) -->
  <div class="control-section status-toggle">
    <div class="inline-row">
      <span class="section-label">{{ t('visualizer.status') }}</span>
      <div class="status-toggle-right">
        <span v-if="!store.showVisualizer" class="status-hint">{{ t('visualizer.disabled') }}</span>
        <button
          class="switch"
          :class="{ on: store.showVisualizer }"
          type="button"
          role="switch"
          :aria-checked="store.showVisualizer"
          :title="store.showVisualizer ? t('common.on') : t('common.off')"
          @click="store.toggleVisualizer()"
        >
          <span class="switch-knob"></span>
        </button>
      </div>
    </div>
  </div>

  <div class="control-section">
    <div class="inline-row">
      <span class="section-label">{{ t('visualizer.color') }}</span>
      <ColorField
        :model-value="store.visualizerColor"
        class="color-swatch"
        :title="t('visualizer.color')"
        @update:model-value="store.setColor($event)"
      />
    </div>
  </div>

  <!-- Intensität-Regler -->
  <div class="control-section">
    <span class="section-label">
      {{ t('visualizer.intensity') }}: {{ Math.round(store.visualizerOpacity * 100) }}%
    </span>
    <SliderField
      :min="0"
      :max="1"
      :step="0.01"
      :default-value="1"
      :model-value="store.visualizerOpacity"
      class="slider intensity-slider"
      @update:model-value="store.setOpacity($event)"
    />
  </div>

  <!-- Farbtransparenz-Regler -->
  <div class="control-section">
    <span class="section-label">
      {{ t('visualizer.colorTransparency') }}: {{ Math.round(store.colorOpacity * 100) }}%
    </span>
    <SliderField
      :min="0"
      :max="1"
      :step="0.01"
      :default-value="1"
      :model-value="store.colorOpacity"
      class="slider color-slider"
      @update:model-value="store.setColorOpacity($event)"
    />
  </div>
</template>

<script setup>
import SliderField from '../ui/SliderField.vue'
import ColorField from '../ui/ColorField.vue'
import { useI18n } from '../../lib/i18n.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

const { t } = useI18n()
const store = useVisualizerStore()
</script>

<style scoped src="./visualizerPanelShared.css"></style>
<style scoped>
/* Kompakte Zeile: Label links, Steuerung rechts */
.inline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.inline-row .section-label {
  margin-bottom: 0;
}

/* Modern Toggle Switch (ersetzt den großen Status-Button) */
.switch {
  position: relative;
  flex-shrink: 0;
  width: 34px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background-color: var(--secondary-bg, #0e1c32);
  box-shadow: inset 0 0 0 1px var(--border-color, rgba(201, 152, 77, 0.35));
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}
.switch .switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-muted, #7a8da0);
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;
}
.switch.on {
  background-color: var(--accent-primary, #c9984d);
  box-shadow: inset 0 0 0 1px var(--accent-primary, #c9984d);
}
.switch.on .switch-knob {
  transform: translateX(16px);
  background: var(--accent-text, #091428);
}
.switch:focus-visible {
  outline: none;
  box-shadow:
    inset 0 0 0 1px var(--accent-primary, #c9984d),
    0 0 0 3px var(--ring);
}

/* Deaktivierter Visualizer wird nur vom Canvas ausgeblendet - die
   Bearbeitung (Farbe, Position, Visualizer-Typ etc.) bleibt möglich, damit
   der Nutzer neue Einstellungen vorbereiten kann, bevor er ihn wieder
   einschaltet. Daher hier bewusst kein pointer-events/opacity auf den
   control-sections. Der Status-Hinweis steht inline neben dem Toggle statt
   als Overlay, damit er weder den Schalter noch das Hilfe-Icon verdeckt. */
.status-toggle-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-hint {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

/* Kompakter Farb-Swatch (ersetzt die große Farbleiste) */
.color-swatch {
  flex-shrink: 0;
  width: 30px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.35));
  border-radius: 5px;
  cursor: pointer;
  background-color: transparent;
  transition: border-color 0.2s ease;
}
.color-swatch:hover {
  border-color: var(--accent-primary, #c9984d);
}
.color-swatch::-webkit-color-swatch-wrapper {
  padding: 2px;
}
.color-swatch::-webkit-color-swatch {
  border: none;
  border-radius: 3px;
}
.color-swatch::-moz-color-swatch {
  border: none;
  border-radius: 3px;
}

/* Intensität-Slider */
.intensity-slider {
  background: linear-gradient(
    to right,
    var(--secondary-bg, #0e1c32) 0%,
    var(--accent-primary, #c9984d) 100%
  );
}

.intensity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.intensity-slider::-webkit-slider-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.intensity-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.intensity-slider::-moz-range-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

/* Farbtransparenz-Slider */
.color-slider {
  background: linear-gradient(to right, rgba(110, 168, 254, 0) 0%, rgba(110, 168, 254, 1) 100%);
}

.color-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #8bc34a;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.color-slider::-webkit-slider-thumb:hover {
  background: #7cb342;
  transform: scale(1.15);
}

.color-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #8bc34a;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.color-slider::-moz-range-thumb:hover {
  background: #7cb342;
  transform: scale(1.15);
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .switch {
  background-color: #eef2f8;
  box-shadow: inset 0 0 0 1px rgba(1, 79, 153, 0.3);
}
[data-theme='light'] .switch .switch-knob {
  background: #7a8da0;
}
[data-theme='light'] .switch.on {
  background-color: #014f99;
  box-shadow: inset 0 0 0 1px #014f99;
}
[data-theme='light'] .switch.on .switch-knob {
  background: #ffffff;
}

[data-theme='light'] .color-swatch {
  border-color: rgba(1, 79, 153, 0.3);
}
[data-theme='light'] .color-swatch:hover {
  border-color: #014f99;
}

[data-theme='light'] .intensity-slider {
  background: linear-gradient(to right, #f9f2d5 0%, #014f99 100%);
}

[data-theme='light'] .intensity-slider::-webkit-slider-thumb {
  background: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .intensity-slider::-webkit-slider-thumb:hover {
  background: #003971;
}

[data-theme='light'] .intensity-slider::-moz-range-thumb {
  background: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .intensity-slider::-moz-range-thumb:hover {
  background: #003971;
}

[data-theme='light'] .color-slider::-webkit-slider-thumb {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .color-slider::-moz-range-thumb {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .color-swatch {
    width: 34px;
    height: 26px;
  }
}
</style>
