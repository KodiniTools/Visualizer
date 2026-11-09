<template>
  <details class="image-animation-panel" :open="isOpen" @toggle="onDetailsToggle">
    <summary class="image-animation-summary">
      <span class="image-animation-title">{{ title }}</span>
      <span v-for="badge in activeBadges" :key="badge" class="image-animation-badge">{{
        badge
      }}</span>
    </summary>
    <p v-if="hint" class="image-animation-hint">{{ hint }}</p>
    <ImageAnimationSections
      :animation="animation"
      :restartable="restartable"
      @toggle="(key, enabled) => emit('toggle', key, enabled)"
      @restart="(key) => emit('restart', key)"
      @change="(key) => emit('change', key)"
    />
  </details>
</template>

<script setup lang="ts">
/**
 * Klappbarer Rahmen um die Bild-Animationen: Titel mit Status-Badges,
 * Hinweis und die Abschnitte Fade/Scale/Slide. Klappt beim Wechsel des
 * Animations-Objekts auf, wenn schon ein Effekt aktiv ist.
 */
import { computed, ref, watch } from 'vue'
import {
  IMAGE_ANIMATION_KEYS,
  type ImageAnimationKey,
  type ImageTimedAnimation,
} from '../../../lib/canvasObjects/imageAnimation'
import ImageAnimationSections from './ImageAnimationSections.vue'

const props = withDefaults(
  defineProps<{
    title: string
    hint?: string
    animation: ImageTimedAnimation
    restartable?: boolean
    /** Wechsel dieses Werts (z. B. Bild-ID) setzt den Aufklapp-Zustand neu */
    resetKey?: string | number | null
  }>(),
  { hint: '', restartable: true, resetKey: null },
)

const emit = defineEmits<{
  (e: 'toggle', key: ImageAnimationKey, enabled: boolean): void
  (e: 'restart', key: ImageAnimationKey): void
  (e: 'change', key: ImageAnimationKey): void
}>()

const BADGES: Record<ImageAnimationKey, string> = { fade: 'Fade', scale: 'Scale', slide: 'Slide' }
const activeBadges = computed(() =>
  IMAGE_ANIMATION_KEYS.filter((key) => props.animation[key]?.enabled).map((key) => BADGES[key]),
)

const isOpen = ref(false)
watch(
  () => props.resetKey,
  () => (isOpen.value = activeBadges.value.length > 0),
  { immediate: true },
)
function onDetailsToggle(event: Event) {
  isOpen.value = (event.target as HTMLDetailsElement).open
}
</script>

<style scoped>
.image-animation-panel {
  margin-top: var(--ds-space-3);
  padding: var(--ds-space-2) var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}
.image-animation-summary {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  cursor: pointer;
  list-style: none;
}
.image-animation-summary::-webkit-details-marker {
  display: none;
}
.image-animation-summary::before {
  content: '▸';
  color: var(--ds-text-3);
  transition: transform var(--ds-duration) var(--ds-ease);
}
.image-animation-panel[open] > .image-animation-summary::before {
  transform: rotate(90deg);
}
.image-animation-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}
.image-animation-badge {
  padding: 0 var(--ds-space-2);
  font-size: var(--ds-text-xs);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
}
.image-animation-hint {
  margin: var(--ds-space-2) 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
  line-height: 1.4;
}
</style>
