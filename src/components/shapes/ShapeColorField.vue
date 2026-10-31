<template>
  <div class="shape-color-field">
    <div class="shape-color-field__row">
      <ColorField
        :model-value="modelValue"
        :label="label"
        @update:model-value="emit('update:modelValue', $event)"
        @change="commit"
      />
      <span v-if="showLabel" class="shape-color-field__label">{{ label }}</span>
    </div>
    <UiColorSwatches
      class="shape-color-field__recent"
      :colors="recentColors"
      :label="recentLabel"
      :model-value="modelValue"
      @pick="pick"
    />
  </div>
</template>

<script setup>
/**
 * Farbfeld der Formen-Galerie: ColorField plus die zuletzt verwendeten Farben
 * (wie das ColorField im Bildkonverter). `update:modelValue` live,
 * `commit` einmal bei abgeschlossener Auswahl – dabei wandert die Farbe in die
 * Verlaufsliste. Ein Klick auf ein Farbfeld übernimmt und committet direkt.
 */
import ColorField from '../ui/ColorField.vue'
import UiColorSwatches from '../ui/UiColorSwatches.vue'
import { useRecentColors } from '../../composables/useRecentColors.js'

defineProps({
  modelValue: { type: String, default: '#000000' },
  label: { type: String, required: true },
  recentLabel: { type: String, required: true },
  /** Label sichtbar neben dem Farbfeld */
  showLabel: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'commit'])

const { recentColors, addRecentColor } = useRecentColors()

function commit(value) {
  addRecentColor(value)
  emit('commit', value)
}

function pick(color) {
  emit('update:modelValue', color)
  commit(color)
}
</script>

<style scoped>
.shape-color-field {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.shape-color-field__row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}

.shape-color-field__label {
  font-size: var(--ds-text-sm);
  color: var(--ds-text);
}
</style>
