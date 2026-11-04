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

<script setup>
import SliderField from '../ui/SliderField.vue'

defineProps({
  label: { type: String, required: true },
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  unit: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
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
