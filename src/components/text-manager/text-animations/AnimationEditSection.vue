<template>
  <div>
    <AnimationToggleHeader
      :label="label"
      :enabled="Boolean(effect?.enabled)"
      @toggle="emit('toggle')"
      @restart="emit('restart')"
    />
    <div v-if="effect?.enabled" class="animation-settings">
      <slot />
    </div>
  </div>
</template>

<script setup>
/**
 * Eine Animation im Edit-Panel: Kopfzeile (An/Aus, Neustart) und, wenn aktiv,
 * die Einstellungen aus dem Slot (FadeControls, ScaleControls, …).
 */
import AnimationToggleHeader from './AnimationToggleHeader.vue'

defineProps({
  label: { type: String, required: true },
  /** Effekt-Objekt des markierten Textes (z. B. text.animation.fade); fehlt bei sehr alten Texten */
  effect: { type: Object, default: null },
})
const emit = defineEmits(['toggle', 'restart'])
</script>

<style scoped src="./text-animations-shared.css"></style>
