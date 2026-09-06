<template>
  <div>
    <AnimationToggleHeader
      label="Skalierungs-Effekt (Scale):"
      :enabled="Boolean(effect?.enabled)"
      @toggle="toggleScale"
      @restart="restartScale"
    />

    <div v-if="effect?.enabled" class="animation-settings">
      <!-- Richtung -->
      <div class="control-group">
        <label>Richtung:</label>
        <select v-model="effect.direction" class="select-input" @change="updateText">
          <option value="in">Reinzoomen (klein → groß)</option>
          <option value="out">Rauszoomen (groß → klein)</option>
          <option value="inOut">Rein und Raus</option>
        </select>
      </div>

      <!-- Start-Skalierung -->
      <div class="control-group">
        <label>Start-Größe: {{ Math.round(effect.startScale * 100) }}%</label>
        <SliderField
          v-model="effect.startScale"
          :min="0"
          :max="3"
          :step="0.1"
          :default-value="0"
          class="slider"
          @update:model-value="updateText"
        />
        <div class="hint-text">0% = unsichtbar, 100% = normal</div>
      </div>

      <!-- End-Skalierung -->
      <div class="control-group">
        <label>End-Größe: {{ Math.round(effect.endScale * 100) }}%</label>
        <SliderField
          v-model="effect.endScale"
          :min="0"
          :max="3"
          :step="0.1"
          :default-value="1"
          class="slider"
          @update:model-value="updateText"
        />
      </div>

      <AnimationTimingControls effect-key="scale" />
      <AnimationLoopControls effect-key="scale" />
      <AnimationDisplayControls effect-key="scale" />
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

const { selectedText, updateText, toggleScale, restartScale } = inject('textAnimationControls')
const effect = computed(() => selectedText.value?.animation?.scale ?? null)
</script>

<style scoped src="./text-animations-shared.css"></style>
