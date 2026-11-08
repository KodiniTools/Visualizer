<template>
  <div>
    <!-- Timing-Einstellungen -->
    <div class="timing-section">
      <span class="section-label">{{ t('slideshow.timing') }}</span>

      <!-- class landet auf dem nativen select (Test-Anker im SlideshowPanel-Spec) -->
      <UiSelect
        v-model="transition"
        class="transition-select"
        :options="transitionOptions"
        :label="t('slideshow.defaultTransitionLabel')"
        size="sm"
      />

      <div class="slider-stack">
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
    </div>

    <!-- Audio-Reaktiv Option -->
    <div class="audio-reactive-section">
      <UiSwitch v-model="applyAudioReactive" :label="t('slideshow.applyAudioReactive')" />
      <UiCallout v-if="applyAudioReactive && !hasSavedSettings" type="warning">
        {{ t('slideshow.noSavedSettings') }}
      </UiCallout>
    </div>

    <!-- Loop Option -->
    <div class="loop-section">
      <UiSwitch v-model="loopSlideshow" :label="t('slideshow.loop')" />
    </div>
  </div>
</template>

<script setup>
/** Timing (Ein-/Ausblenden, Anzeigedauer), Audio-Reaktiv-Übernahme und Loop. */
import { computed } from 'vue'
import SliderControl from '../../ui/SliderControl.vue'
import UiCallout from '../../ui/UiCallout.vue'
import UiSelect from '../../ui/UiSelect.vue'
import UiSwitch from '../../ui/UiSwitch.vue'
import { useI18n } from '../../../lib/i18n'
import { SLIDESHOW_TRANSITIONS } from '../../../lib/slideshowTransitions'

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
const { t } = useI18n()

/** Symbol + übersetzter Name, wie in Reihenfolge-Liste und Bild-Editor. */
const transitionOptions = computed(() =>
  SLIDESHOW_TRANSITIONS.map((tr) => ({
    value: tr.id,
    label: `${tr.icon} ${t(`slideshow.transitions.${tr.id}`)}`,
  })),
)
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.timing-section > .section-label {
  margin-bottom: 0;
}
</style>
