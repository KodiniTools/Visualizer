<template>
  <div class="fx-effect">
    <UiSwitch
      :model-value="modelValue"
      class="fx-effect-toggle"
      :label="title"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <div v-if="modelValue" class="fx-effect-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import UiSwitch from '../ui/UiSwitch.vue'

withDefaults(defineProps<{ title: string; modelValue?: boolean }>(), { modelValue: false })
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<style scoped>
.fx-effect {
  margin: var(--ds-space-1) 0;
}
/* Einstellungen eines aktiven Effekts: eingerückt unter seinem Schalter */
.fx-effect-body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  margin: var(--ds-space-1) 0 var(--ds-space-2) 6px;
  padding-left: var(--ds-space-3);
  border-left: 2px solid var(--ds-border-strong);
}
</style>
