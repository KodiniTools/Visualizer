<template>
  <div class="image-animation-sections">
    <template v-for="(section, index) in SECTIONS" :key="section.key">
      <hr v-if="index > 0" class="image-animation-divider" />
      <AnimationEditSection
        :data-effect="section.key"
        :label="t(section.label)"
        :effect="animation[section.key]"
        :restartable="restartable"
        @toggle="toggle(section.key)"
        @restart="emit('restart', section.key)"
      >
        <component
          :is="section.controls"
          :effect="animation[section.key]"
          @change="emit('change', section.key)"
        />
      </AnimationEditSection>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Fade-, Scale- und Slide-Animation für Bilder – dieselben Abschnitte und
 * Regler wie bei Texten (text-manager/text-animations/*). Bearbeitet das
 * übergebene Animations-Objekt direkt (wie die Text-Regler).
 */
import { useI18n } from '../../../lib/i18n'
import type {
  ImageAnimationKey,
  ImageTimedAnimation,
} from '../../../lib/canvasObjects/imageAnimation'
import AnimationEditSection from '../../text-manager/text-animations/AnimationEditSection.vue'
import FadeControls from '../../text-manager/text-animations/FadeControls.vue'
import ScaleControls from '../../text-manager/text-animations/ScaleControls.vue'
import SlideControls from '../../text-manager/text-animations/SlideControls.vue'

const props = withDefaults(
  defineProps<{
    /** Einstellungen ({ fade, scale, slide }) */
    animation: ImageTimedAnimation
    /** „Neu starten“ anbieten (nur für Bilder auf dem Canvas sinnvoll) */
    restartable?: boolean
  }>(),
  { restartable: true },
)

const emit = defineEmits<{
  /** Effekt an/aus; das Feld `enabled` ist bereits umgeschaltet */
  (e: 'toggle', key: ImageAnimationKey, enabled: boolean): void
  (e: 'restart', key: ImageAnimationKey): void
  /** Regler des Effekts `key` geändert */
  (e: 'change', key: ImageAnimationKey): void
}>()

const { t } = useI18n()

const SECTIONS = [
  { key: 'fade', label: 'textManager.fadeEffect', controls: FadeControls },
  { key: 'scale', label: 'textManager.scaleEffect', controls: ScaleControls },
  { key: 'slide', label: 'textManager.slideEffect', controls: SlideControls },
] as const

function toggle(key: ImageAnimationKey) {
  // Regler arbeiten direkt am übergebenen Objekt (wie bei Texten)
  const effect = props.animation[key]
  effect.enabled = !effect.enabled
  emit('toggle', key, effect.enabled)
}
</script>

<style scoped>
.image-animation-sections {
  display: flex;
  flex-direction: column;
}
.image-animation-divider {
  width: 100%;
  margin: var(--ds-space-2) 0;
  border: none;
  border-top: var(--ds-border-width) solid var(--ds-border);
}
</style>
