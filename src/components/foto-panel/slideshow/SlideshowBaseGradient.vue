<template>
  <!-- Farbverlauf der Fläche unter der Slideshow (Farbe 1 = Flächenfarbe) -->
  <div class="base-gradient" :class="`${prefix}-gradient`">
    <label class="checkbox-label">
      <input
        :checked="gradient.enabled"
        :class="`${prefix}-gradient-toggle`"
        type="checkbox"
        :disabled="disabled"
        @change="update({ enabled: $event.target.checked })"
      />
      <span>{{ t('slideshow.gradient') }}</span>
    </label>
    <div v-if="gradient.enabled" class="base-gradient-options">
      <label class="base-gradient-field">
        <span>{{ t('slideshow.gradientColor2') }}</span>
        <input
          :value="gradient.color2"
          :class="`${prefix}-gradient-color2`"
          type="color"
          :disabled="disabled"
          @input="update({ color2: $event.target.value })"
        />
      </label>
      <label class="base-gradient-field">
        <span>{{ t('slideshow.gradientType') }}</span>
        <select
          :value="gradient.type"
          :class="`${prefix}-gradient-type`"
          :disabled="disabled"
          @change="update({ type: $event.target.value })"
        >
          <option value="linear">{{ t('slideshow.gradientLinear') }}</option>
          <option value="radial">{{ t('slideshow.gradientRadial') }}</option>
        </select>
      </label>
      <label v-if="gradient.type === 'linear'" class="base-gradient-field angle">
        <span>{{ t('slideshow.gradientAngle') }}</span>
        <input
          :value="gradient.angle"
          :class="`${prefix}-gradient-angle`"
          type="range"
          min="0"
          max="359"
          step="1"
          :disabled="disabled"
          @input="update({ angle: Number($event.target.value) })"
        />
        <span class="angle-value">{{ gradient.angle }}°</span>
      </label>
    </div>
  </div>
</template>

<script setup>
/**
 * Einstellungen für den Farbverlauf einer Slideshow-Fläche (Canvas oder
 * Workspace). Rein darstellend: v-model liefert den bereinigten Verlauf.
 */
import { useI18n } from '../../../lib/i18n.js'
import { normalizeSlideshowGradient } from '../../../lib/slideshowBaseColor.js'

const gradient = defineModel({ type: Object, required: true })
defineProps({
  // CSS-Klassen-Präfix ('base' | 'workspace') – unterscheidet die Felder
  prefix: { type: String, default: 'base' },
  disabled: { type: Boolean, default: false },
})
const { t } = useI18n()

function update(partial) {
  gradient.value = normalizeSlideshowGradient({ ...gradient.value, ...partial }, gradient.value)
}
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.base-gradient {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.base-gradient-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding-left: 20px;
}
.base-gradient-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11px;
}
.base-gradient-field.angle {
  flex-basis: 100%;
}
.base-gradient-field.angle input {
  flex: 1;
  min-width: 0;
  accent-color: #6ea8fe;
}
.base-gradient-field input[type='color'] {
  width: 36px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: none;
  cursor: pointer;
}
.base-gradient-field select {
  padding: 3px 6px;
  font-size: 11px;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.angle-value {
  min-width: 34px;
  text-align: right;
  color: #e0e0e0;
}
[data-theme='light'] .base-gradient-field select {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
[data-theme='light'] .angle-value {
  color: #003971;
}
</style>
