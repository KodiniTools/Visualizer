<template>
  <div class="fx-range-row">
    <label>{{ label }}: {{ modelValue }}{{ unit }}</label>
    <input
      type="range"
      :min="min"
      :max="max"
      :value="modelValue"
      @input="$emit('update:modelValue', Number($event.target.value))"
      class="fx-slider"
    />
  </div>
</template>

<script setup>
defineProps({
  label: String,
  modelValue: Number,
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  unit: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.fx-range-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 0.75rem;
  color: #999;
}
.fx-slider {
  width: 100%;
  accent-color: #4a9eff;
  height: 14px;
}
</style>
