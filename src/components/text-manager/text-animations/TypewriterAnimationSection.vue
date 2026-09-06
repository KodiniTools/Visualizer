<template>
  <div>
    <AnimationToggleHeader
      label="Schreibmaschinen-Effekt:"
      :enabled="Boolean(effect?.enabled)"
      @toggle="toggleTypewriter"
      @restart="restartTypewriter"
    />

    <div v-if="effect?.enabled" class="animation-settings">
      <!-- Geschwindigkeit -->
      <div class="control-group">
        <label>Geschwindigkeit: {{ effect.speed }}ms/Buchstabe</label>
        <SliderField
          v-model="effect.speed"
          :min="10"
          :max="200"
          :default-value="50"
          class="slider"
          @update:model-value="updateText"
        />
        <div class="hint-text">Niedrig = schneller, Hoch = langsamer</div>
      </div>

      <!-- Start-Verzögerung -->
      <div class="control-group">
        <label>Start-Verzögerung: {{ effect.startDelay }}ms</label>
        <SliderField
          v-model="effect.startDelay"
          :min="0"
          :max="3000"
          :step="100"
          :default-value="0"
          class="slider"
          @update:model-value="updateText"
        />
      </div>

      <AnimationLoopControls effect-key="typewriter" :max-delay="5000" />

      <!-- Cursor -->
      <div class="control-group">
        <label class="effect-checkbox">
          <input v-model="effect.showCursor" type="checkbox" @change="updateText" />
          Blinkender Cursor anzeigen
        </label>
      </div>

      <!-- Cursor-Zeichen (nur wenn Cursor aktiv) -->
      <div v-if="effect.showCursor" class="control-group">
        <label>Cursor-Zeichen:</label>
        <select v-model="effect.cursorChar" class="select-input" @change="updateText">
          <option value="|">| (Strich)</option>
          <option value="_">_ (Unterstrich)</option>
          <option value="▌">▌ (Block)</option>
          <option value="█">█ (Voller Block)</option>
        </select>
      </div>

      <AnimationDisplayControls effect-key="typewriter" />
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import SliderField from '../../ui/SliderField.vue'
import AnimationToggleHeader from './AnimationToggleHeader.vue'
import AnimationLoopControls from './AnimationLoopControls.vue'
import AnimationDisplayControls from './AnimationDisplayControls.vue'

const { selectedText, updateText, toggleTypewriter, restartTypewriter } =
  inject('textAnimationControls')
const effect = computed(() => selectedText.value?.animation?.typewriter ?? null)
</script>

<style scoped src="./text-animations-shared.css"></style>
