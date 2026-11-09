<template>
  <ImageAnimationPanel
    class="image-animation-controls"
    :title="title ?? t('foto.imageAnimation')"
    :hint="hint ?? t('foto.imageAnimationHint')"
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
import { computed, inject, ref, toRaw, watch, type Ref } from 'vue'
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
  /** Überschrift (Standard: „Animation“) */
  title?: string
  /** Hinweis unter der Überschrift (Standard: Foto-Panel-Hinweis) */
  hint?: string
}>()

/** Teil des MultiImageManagers, den die Regler brauchen */
interface MarkerVisibility {
  setMarkerHidden?(id: string | number, hidden: boolean): void
  redrawCallback?(): void
}
const multiImageManager = inject<Ref<MarkerVisibility | null>>('multiImageManager', ref(null))

/**
 * Ein Beat-Marker kann das Bild bis zu seinem Zeitpunkt ausblenden. Wer die
 * Animation neu startet oder einschaltet, will sie sehen → einblenden.
 */
function reveal() {
  const id = props.image.id
  const mim = multiImageManager.value
  if (id === undefined || !mim?.setMarkerHidden) return
  mim.setMarkerHidden(id, false)
  mim.redrawCallback?.()
}

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
  if (enabled) {
    restartImageAnimation(toRaw(image), key)
    reveal()
  }
}

function onRestart(key: ImageAnimationKey) {
  restartImageAnimation(toRaw(props.image), key)
  reveal()
}
</script>
