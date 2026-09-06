<template>
  <template v-if="effect">
    <!-- Dauer -->
    <div class="control-group">
      <label>Dauer: {{ effect.duration }}ms</label>
      <SliderField
        v-model="effect.duration"
        :min="100"
        :max="20000"
        :step="100"
        :default-value="1000"
        class="slider"
        @update:model-value="updateText"
      />
      <div v-if="durationHint" class="hint-text">{{ durationHint }}</div>
    </div>

    <!-- Start-Verzögerung -->
    <div class="control-group">
      <label>Start-Verzögerung: {{ effect.startDelay }}ms</label>
      <SliderField
        v-model="effect.startDelay"
        :min="0"
        :max="20000"
        :step="100"
        :default-value="0"
        class="slider"
        @update:model-value="updateText"
      />
    </div>

    <!-- Easing -->
    <div class="control-group">
      <label>Animation:</label>
      <select v-model="effect.easing" class="select-input" @change="updateText">
        <option value="linear">Linear (gleichmäßig)</option>
        <option value="ease">Ease (natürlich)</option>
        <option value="easeIn">Ease In (langsamer Start)</option>
        <option value="easeOut">Ease Out (langsames Ende)</option>
      </select>
    </div>
  </template>
</template>

<script setup>
/** Dauer, Start-Verzögerung und Easing einer Animation (Fade/Scale/Slide). */
import { computed, inject } from 'vue'
import SliderField from '../../ui/SliderField.vue'

const props = defineProps({
  /** Schlüssel unter selectedText.animation (z. B. 'fade') */
  effectKey: { type: String, required: true },
  durationHint: { type: String, default: '' },
})

const { selectedText, updateText } = inject('textAnimationControls')
const effect = computed(() => selectedText.value?.animation?.[props.effectKey] ?? null)
</script>

<style scoped src="./text-animations-shared.css"></style>
