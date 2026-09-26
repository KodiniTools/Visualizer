<template>
  <div>
    <!-- Timing-Einstellungen -->
    <div class="timing-section">
      <label class="section-label">{{ t('slideshow.timing') }}</label>

      <div class="transition-control">
        <label for="slideshow-transition">{{ t('slideshow.defaultTransitionLabel') }}</label>
        <select id="slideshow-transition" v-model="transition" class="transition-select">
          <option v-for="tr in transitions" :key="tr.id" :value="tr.id">
            {{ tr.icon }} {{ t(`slideshow.transitions.${tr.id}`) }}
          </option>
        </select>
      </div>

      <SliderControl
        v-model="fadeInDuration"
        class="timing-control"
        :label="t('slideshow.fadeIn')"
        :min="100"
        :max="5000"
        :step="100"
        :default-value="1000"
        :value-text="`${(fadeInDuration / 1000).toFixed(1)}s`"
      />

      <SliderControl
        v-model="displayDuration"
        class="timing-control"
        :label="t('slideshow.display')"
        :min="500"
        :max="30000"
        :step="500"
        :default-value="3000"
        :value-text="`${(displayDuration / 1000).toFixed(1)}s`"
      />

      <SliderControl
        v-model="fadeOutDuration"
        class="timing-control"
        :label="t('slideshow.fadeOut')"
        :min="100"
        :max="5000"
        :step="100"
        :default-value="1000"
        :value-text="`${(fadeOutDuration / 1000).toFixed(1)}s`"
      />
    </div>

    <!-- Audio-Reaktiv Option -->
    <div class="audio-reactive-section">
      <label class="checkbox-label">
        <input v-model="applyAudioReactive" type="checkbox" />
        <span>{{ t('slideshow.applyAudioReactive') }}</span>
      </label>
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
import SliderControl from '../../ui/SliderControl.vue'
import { useI18n } from '../../../lib/i18n.js'
import { SLIDESHOW_TRANSITIONS } from '../../../lib/slideshowTransitions.js'

defineProps({
  hasSavedSettings: { type: Boolean, default: false },
})

const fadeInDuration = defineModel('fadeInDuration', { type: Number, default: 1000 })
const displayDuration = defineModel('displayDuration', { type: Number, default: 3000 })
const fadeOutDuration = defineModel('fadeOutDuration', { type: Number, default: 1000 })
const applyAudioReactive = defineModel('applyAudioReactive', { type: Boolean, default: true })
const loopSlideshow = defineModel('loopSlideshow', { type: Boolean, default: false })
// Übergangsanimation für alle Bilder (pro Bild überschreibbar in der Reihenfolge-Liste)
const transition = defineModel('transition', { type: String, default: 'fade' })
const transitions = SLIDESHOW_TRANSITIONS

const { t } = useI18n()
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.transition-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.transition-control label {
  font-size: 11px;
  color: var(--text-muted);
}
.transition-select {
  padding: 4px 6px;
  font-size: 12px;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
[data-theme='light'] .transition-select {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
</style>
