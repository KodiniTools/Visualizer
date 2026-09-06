<template>
  <template v-if="effect">
    <!-- Loop -->
    <div class="control-group">
      <label class="effect-checkbox">
        <input v-model="effect.loop" type="checkbox" @change="updateText" />
        Animation wiederholen (Loop)
      </label>
    </div>

    <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
    <div v-if="effect.loop" class="control-group">
      <label>Pause zwischen Wiederholungen: {{ effect.loopDelay }}ms</label>
      <SliderField
        v-model="effect.loopDelay"
        :min="0"
        :max="maxDelay"
        :step="100"
        :default-value="1000"
        class="slider"
        @update:model-value="updateText"
      />
    </div>
  </template>
</template>

<script setup>
/** Wiederholung (Loop) + Pause zwischen den Wiederholungen. */
import { computed, inject } from 'vue'
import SliderField from '../../ui/SliderField.vue'

const props = defineProps({
  effectKey: { type: String, required: true },
  maxDelay: { type: Number, default: 20000 },
})

const { selectedText, updateText } = inject('textAnimationControls')
const effect = computed(() => selectedText.value?.animation?.[props.effectKey] ?? null)
</script>

<style scoped src="./text-animations-shared.css"></style>
