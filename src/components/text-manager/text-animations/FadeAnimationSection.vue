<template>
  <div>
    <AnimationToggleHeader
      label="Einblend-Effekt (Fade):"
      :enabled="Boolean(effect?.enabled)"
      @toggle="toggleFade"
      @restart="restartFade"
    />

    <div v-if="effect?.enabled" class="animation-settings">
      <!-- Richtung -->
      <div class="control-group">
        <label>Richtung:</label>
        <select v-model="effect.direction" class="select-input" @change="updateText">
          <option value="in">Einblenden (0% → 100%)</option>
          <option value="out">Ausblenden (100% → 0%)</option>
          <option value="inOut">Ein- und Ausblenden</option>
        </select>
      </div>

      <AnimationTimingControls
        effect-key="fade"
        duration-hint="Wie lange das Ein-/Ausblenden dauert"
      />
      <AnimationLoopControls effect-key="fade" />
      <AnimationDisplayControls effect-key="fade" />
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import AnimationToggleHeader from './AnimationToggleHeader.vue'
import AnimationTimingControls from './AnimationTimingControls.vue'
import AnimationLoopControls from './AnimationLoopControls.vue'
import AnimationDisplayControls from './AnimationDisplayControls.vue'

const { selectedText, updateText, toggleFade, restartFade } = inject('textAnimationControls')
const effect = computed(() => selectedText.value?.animation?.fade ?? null)
</script>

<style scoped src="./text-animations-shared.css"></style>
