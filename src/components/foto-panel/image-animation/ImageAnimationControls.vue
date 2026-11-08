<template>
  <ImageAnimationPanel
    class="image-animation-controls"
    :title="t('foto.imageAnimation')"
    :hint="t('foto.imageAnimationHint')"
    :animation="view"
    :reset-key="imageKey"
    @toggle="onToggle"
    @restart="onRestart"
  />
</template>

<script setup lang="ts">
/**
 * Animationen (Fade, Scale, Slide wie bei Texten) des ausgewählten
 * Canvas-Bildes. Solange kein Effekt eingeschaltet wurde, trägt das Bild
 * kein `timedAnimation`; das Objekt entsteht beim ersten Einschalten, damit
 * eine reine Auswahl keinen Verlaufsschritt erzeugt.
 */
import { computed, ref, toRaw, watch } from 'vue'
import { useI18n } from '../../../lib/i18n'
import {
  createImageAnimation,
  restartImageAnimation,
  type ImageAnimationKey,
  type ImageAnimationTarget,
  type ImageTimedAnimation,
} from '../../../lib/canvasObjects/imageAnimation'
import ImageAnimationPanel from './ImageAnimationPanel.vue'

const props = defineProps<{
  /** Ausgewähltes Canvas-Bild */
  image: ImageAnimationTarget & { id?: string | number }
}>()

const { t } = useI18n()

// Platzhalter mit Standardwerten, bis ein Effekt eingeschaltet wird
const placeholder = ref<ImageTimedAnimation>(createImageAnimation())
watch(
  () => props.image,
  () => (placeholder.value = createImageAnimation()),
)

const view = computed<ImageTimedAnimation>(() => props.image.timedAnimation ?? placeholder.value)
const imageKey = computed(() => props.image.id ?? null)

function onToggle(key: ImageAnimationKey, enabled: boolean) {
  const image = props.image
  if (!image.timedAnimation) {
    image.timedAnimation = placeholder.value
    placeholder.value = createImageAnimation()
  }
  // Beim Einschalten sofort von vorn beginnen (wie bei Texten)
  if (enabled) restartImageAnimation(toRaw(image), key)
}

function onRestart(key: ImageAnimationKey) {
  restartImageAnimation(toRaw(props.image), key)
}
</script>
