<template>
  <div class="fx-effect">
    <div class="fx-effect-header">
      <label class="fx-check">
        <input
          type="checkbox"
          :checked="modelValue"
          @change="$emit('update:modelValue', $event.target.checked)"
        />
        <span>{{ title }}</span>
      </label>
    </div>
    <div v-if="modelValue" class="fx-effect-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String, modelValue: Boolean })
defineEmits(['update:modelValue'])
</script>

<style scoped>
.fx-effect {
  border-left: 2px solid rgba(74, 158, 255, 0.2);
  margin: 4px 0;
  padding-left: 6px;
}
.fx-effect-header {
  margin-bottom: 2px;
}
.fx-check {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  color: #ccc;
}
.fx-check input {
  accent-color: #4a9eff;
}
.fx-effect-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 2px 0 4px 4px;
}
</style>
