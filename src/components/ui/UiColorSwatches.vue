<template>
  <div v-if="colors.length" class="ui-swatches" role="group" :aria-label="label">
    <button
      v-for="color in colors"
      :key="color"
      type="button"
      :class="['ui-swatches__swatch', { 'ui-swatches__swatch--active': isActive(color) }]"
      :style="{ backgroundColor: color }"
      :title="color"
      :aria-label="`${label}: ${color}`"
      :aria-pressed="isActive(color)"
      :data-color="color"
      @click="emit('pick', color)"
    ></button>
  </div>
</template>

<script setup>
/**
 * Reihe kleiner Farbfelder (z. B. „Zuletzt verwendet“). Ein Klick meldet die
 * Farbe über `pick`; die zum `modelValue` passende Farbe ist markiert.
 * Ohne Farben wird nichts gerendert.
 */
const props = defineProps({
  /** Array<string> – Hex-Farben `#rrggbb` */
  colors: { type: Array, default: () => [] },
  /** Zugänglicher Name der Gruppe; jedes Feld heißt „label: #farbe“ */
  label: { type: String, required: true },
  /** Aktuelle Farbe (wird markiert) */
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['pick'])

const isActive = (color) => String(props.modelValue || '').toLowerCase() === color.toLowerCase()
</script>

<style scoped>
.ui-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-1);
}

.ui-swatches__swatch {
  width: 20px;
  height: 20px;
  padding: 0;
  border: var(--ds-border-width) solid var(--ds-border-strong);
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

/* Hover ändert nur Farbe */
.ui-swatches__swatch:hover {
  border-color: var(--ds-text-3);
}

.ui-swatches__swatch:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.ui-swatches__swatch--active {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}
</style>
