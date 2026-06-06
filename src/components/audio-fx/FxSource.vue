<template>
  <div class="fx-row">
    <label>Quelle</label>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
      class="fx-select"
    >
      <option value="bass">Bass</option>
      <option value="mid">Mitten</option>
      <option value="treble">Höhen</option>
      <option value="volume">Lautstärke</option>
    </select>
  </div>
</template>

<script setup>
defineProps({ modelValue: String })
defineEmits(['update:modelValue'])
</script>

<style scoped>
.fx-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #aaa;
}
.fx-select {
  flex: 1;
  background: #2a2a2a;
  color: #ccc;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 0.75rem;
}
</style>
