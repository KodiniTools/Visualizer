<template>
  <div class="fx-range-row">
    <span class="fx-range-label">{{ label }}: {{ modelValue }}{{ unit }}</span>
    <SliderField
      :model-value="modelValue"
      :min="min"
      :max="max"
      :aria-label="label"
      @update:model-value="$emit('update:modelValue', Number($event))"
    />
  </div>
</template>

<script setup lang="ts">
import SliderField from '../ui/SliderField.vue'

withDefaults(
  defineProps<{ label: string; modelValue?: number; min?: number; max?: number; unit?: string }>(),
  { modelValue: 0, min: 0, max: 100, unit: '' },
)
defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<style scoped src="../ui/slider-control.css"></style>
<style scoped>
.fx-range-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fx-range-label {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  font-variant-numeric: tabular-nums;
}
</style>
