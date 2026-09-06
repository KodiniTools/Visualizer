<template>
  <div>
    <!-- Timing-Einstellungen -->
    <div class="timing-section">
      <label class="section-label">{{ t('slideshow.timing') }}</label>

      <div class="timing-control">
        <label>{{ t('slideshow.fadeIn') }}</label>
        <div class="slider-row">
          <SliderField
            v-model="fadeInDuration"
            :min="100"
            :max="5000"
            :step="100"
            :default-value="1000"
          />
          <span class="value">{{ (fadeInDuration / 1000).toFixed(1) }}s</span>
        </div>
      </div>

      <div class="timing-control">
        <label>{{ t('slideshow.display') }}</label>
        <div class="slider-row">
          <SliderField
            v-model="displayDuration"
            :min="500"
            :max="30000"
            :step="500"
            :default-value="3000"
          />
          <span class="value">{{ (displayDuration / 1000).toFixed(1) }}s</span>
        </div>
      </div>

      <div class="timing-control">
        <label>{{ t('slideshow.fadeOut') }}</label>
        <div class="slider-row">
          <SliderField
            v-model="fadeOutDuration"
            :min="100"
            :max="5000"
            :step="100"
            :default-value="1000"
          />
          <span class="value">{{ (fadeOutDuration / 1000).toFixed(1) }}s</span>
        </div>
      </div>
    </div>

    <!-- Audio-Reaktiv Option -->
    <div class="audio-reactive-section">
      <label class="checkbox-label">
        <input v-model="applyAudioReactive" type="checkbox" />
        <span>{{ t('slideshow.applyAudioReactive') }}</span>
      </label>
      <p v-if="applyAudioReactive && hasSavedSettings" class="hint">
        {{ t('slideshow.audioReactiveHint') }}
      </p>
      <p v-if="applyAudioReactive && !hasSavedSettings" class="hint warning">
        {{ t('slideshow.noSavedSettings') }}
      </p>
    </div>

    <!-- Loop Option -->
    <div class="loop-section">
      <label class="checkbox-label">
        <input v-model="loopSlideshow" type="checkbox" />
        <span>{{ t('slideshow.loop') }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
/** Timing (Ein-/Ausblenden, Anzeigedauer), Audio-Reaktiv-Übernahme und Loop. */
import SliderField from '../../ui/SliderField.vue'
import { useI18n } from '../../../lib/i18n.js'

defineProps({
  hasSavedSettings: { type: Boolean, default: false },
})

const fadeInDuration = defineModel('fadeInDuration', { type: Number, default: 1000 })
const displayDuration = defineModel('displayDuration', { type: Number, default: 3000 })
const fadeOutDuration = defineModel('fadeOutDuration', { type: Number, default: 1000 })
const applyAudioReactive = defineModel('applyAudioReactive', { type: Boolean, default: true })
const loopSlideshow = defineModel('loopSlideshow', { type: Boolean, default: false })

const { t } = useI18n()
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.timing-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.timing-control label {
  font-size: 11px;
  color: var(--text-muted);
}
[data-theme='light'] .timing-control label {
  color: #4d6d8e;
}
</style>
