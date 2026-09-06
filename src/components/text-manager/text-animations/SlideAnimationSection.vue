<template>
  <div>
    <AnimationToggleHeader
      label="Slide-Effekt (Hereingleiten):"
      :enabled="Boolean(effect?.enabled)"
      @toggle="toggleSlide"
      @restart="restartSlide"
    />

    <div v-if="effect?.enabled" class="animation-settings">
      <!-- Richtung -->
      <div class="control-group">
        <label>Richtung:</label>
        <select v-model="effect.direction" class="select-input" @change="updateText">
          <option value="in">Hereinfahren</option>
          <option value="out">Herausfahren</option>
          <option value="inOut">Herein und Heraus</option>
        </select>
      </div>

      <!-- Von welcher Seite -->
      <div class="control-group">
        <label>Von welcher Seite:</label>
        <select v-model="effect.from" class="select-input" @change="updateText">
          <option value="left">Links</option>
          <option value="right">Rechts</option>
          <option value="top">Oben</option>
          <option value="bottom">Unten</option>
        </select>
      </div>

      <!-- Distanz -->
      <div class="control-group">
        <label>Distanz: {{ effect.distance }}px</label>
        <SliderField
          v-model="effect.distance"
          :min="10"
          :max="1000"
          :step="10"
          :default-value="100"
          class="slider"
          @update:model-value="updateText"
        />
      </div>

      <AnimationTimingControls effect-key="slide" />
      <AnimationLoopControls effect-key="slide" />
      <AnimationDisplayControls effect-key="slide" />
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import SliderField from '../../ui/SliderField.vue'
import AnimationToggleHeader from './AnimationToggleHeader.vue'
import AnimationTimingControls from './AnimationTimingControls.vue'
import AnimationLoopControls from './AnimationLoopControls.vue'
import AnimationDisplayControls from './AnimationDisplayControls.vue'

const { selectedText, updateText, toggleSlide, restartSlide } = inject('textAnimationControls')
const effect = computed(() => selectedText.value?.animation?.slide ?? null)
</script>

<style scoped src="./text-animations-shared.css"></style>
