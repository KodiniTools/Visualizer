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

<script setup lang="ts">
/**
 * Farbfeld der Formen-Galerie: ColorField plus die zuletzt verwendeten Farben
 * (wie das ColorField im Bildkonverter). `update:modelValue` live,
 * `commit` einmal bei abgeschlossener Auswahl – dabei wandert die Farbe in die
 * Verlaufsliste. Ein Klick auf ein Farbfeld übernimmt und committet direkt.
 */
import ColorField from '../ui/ColorField.vue'
import UiColorSwatches from '../ui/UiColorSwatches.vue'
import { useRecentColors } from '../../composables/useRecentColors'

withDefaults(
  defineProps<{
    modelValue?: string
    label: string
    recentLabel: string
    /** Label sichtbar neben dem Farbfeld */
    showLabel?: boolean
  }>(),
  { modelValue: '#000000', showLabel: true },
)
const emit = defineEmits<{ 'update:modelValue': [color: string]; commit: [color: string] }>()

const { recentColors, addRecentColor } = useRecentColors()

function commit(value: string) {
  addRecentColor(value)
  emit('commit', value)
}

function pick(color: string) {
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
