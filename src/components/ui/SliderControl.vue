<template>
  <div class="control-group slider">
    <!-- Einheitliche Slider-Zeile wie bei den Bild-Filtern (Helligkeit …) -->
    <label>{{ label }}</label>
    <SliderField
      :class="inputClass"
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :default-value="defaultValue"
      :disabled="disabled"
      :aria-label="label"
      @start="(v) => emit('start', v)"
      @update:model-value="(v) => emit('update:modelValue', v)"
      @change="(v) => emit('change', v)"
    />
    <span class="slider-control__value">{{ valueText }}</span>
  </div>
</template>

<script setup>
/**
 * SliderControl – eine Regler-Zeile in der Standard-Optik der App:
 * Label (klein, versal) · SliderField (Regler + Zahlen-Spinner + ↺) · Einheit.
 * Optik aus ./slider-control.css (dieselbe Datei wie die Bild-Filter), damit
 * alle Regler in Hell- und Dunkelmodus identisch aussehen.
 *
 * `inputClass` landet auf dem Range-Input (z. B. für bestehende Selektoren).
 * Events wie SliderField: `update:modelValue` (live), `start`, `change`.
 */
import SliderField from './SliderField.vue'

defineProps({
  label: { type: String, required: true },
  modelValue: { type: [Number, String], default: 0 },
  min: { type: [Number, String], default: 0 },
  max: { type: [Number, String], default: 100 },
  step: { type: [Number, String], default: 1 },
  defaultValue: { type: [Number, String], default: undefined },
  disabled: { type: Boolean, default: false },
  // Anzeige rechts (Wert mit Einheit, z. B. "1.0s", "80 %")
  valueText: { type: String, default: '' },
  inputClass: { type: [String, Array, Object], default: '' },
})
const emit = defineEmits(['update:modelValue', 'start', 'change'])
</script>

<style scoped src="./slider-control.css"></style>
