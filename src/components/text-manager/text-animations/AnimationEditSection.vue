<template>
  <div>
    <AnimationToggleHeader
      :label="label"
      :enabled="Boolean(effect?.enabled)"
      :restartable="restartable"
      @toggle="emit('toggle')"
      @restart="emit('restart')"
    />
    <div v-if="effect?.enabled" class="animation-settings">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Eine Animation im Edit-Panel: Kopfzeile (An/Aus, Neustart) und, wenn aktiv,
 * die Einstellungen aus dem Slot (FadeControls, ScaleControls, …).
 */
import AnimationToggleHeader from './AnimationToggleHeader.vue'
import type { TimedTextAnimation } from '../../../lib/textManager/types'

withDefaults(
  defineProps<{
    label: string
    /** Effekt-Objekt des markierten Textes (z. B. text.animation.fade); fehlt bei sehr alten Texten */
    effect?: TimedTextAnimation | null
    /** false blendet „Neu starten“ aus */
    restartable?: boolean
  }>(),
  { effect: null, restartable: true },
)
const emit = defineEmits<{ toggle: []; restart: [] }>()
</script>

<style scoped src="./text-animations-shared.css"></style>
