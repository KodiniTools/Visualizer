<template>
  <template v-if="effect">
    <!-- Permanent anzeigen -->
    <div class="control-group">
      <label class="effect-checkbox">
        <input v-model="effect.permanent" type="checkbox" @change="updateText" />
        Permanent anzeigen
      </label>
      <div class="hint-text">Text bleibt dauerhaft sichtbar</div>
    </div>

    <!-- Anzeigedauer (nur wenn nicht permanent) -->
    <div v-if="!effect.permanent" class="control-group">
      <label>Anzeigedauer: {{ effect.displayDuration }}ms</label>
      <div class="dur-row">
        <SliderField
          v-model="effect.displayDuration"
          :min="500"
          :max="30000"
          :step="100"
          :default-value="5000"
          class="slider"
          @update:model-value="updateText"
        />
      </div>
      <div class="hint-text">Wie lange der Text sichtbar bleibt, bevor er verschwindet</div>
    </div>
  </template>
</template>

<script setup>
/** Permanent anzeigen / Anzeigedauer einer Animation. */
import { computed, inject } from 'vue'
import SliderField from '../../ui/SliderField.vue'

const props = defineProps({
  effectKey: { type: String, required: true },
})

const { selectedText, updateText } = inject('textAnimationControls')
const effect = computed(() => selectedText.value?.animation?.[props.effectKey] ?? null)
</script>

<style scoped src="./text-animations-shared.css"></style>
