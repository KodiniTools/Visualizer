<template>
  <!-- Einstellungen eines einzelnen Slideshow-Bildes (bei pausierter Slideshow) -->
  <div ref="rootRef" class="image-editor" role="group" :aria-label="title">
    <div class="image-editor-header">
      <img :src="thumbSrc" :alt="image.name || ''" class="image-editor-thumb" />
      <div class="image-editor-title">
        <span class="image-editor-label">{{ t('slideshow.imageSettings') }}</span>
        <span class="image-editor-name">{{ title }}</span>
      </div>
      <button
        type="button"
        class="btn-close-editor"
        :title="t('slideshow.closeImageSettings')"
        :aria-label="t('slideshow.closeImageSettings')"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- Position + Größe als ein Regler-Stapel (Abstände wie bei den Bild-Filtern) -->
    <div v-if="position || size" class="image-editor-bounds">
      <!-- Position des Bildes auf der Canvas (Mittelpunkt in % der Canvas) -->
      <div v-if="position" class="image-editor-position">
        <SliderControl
          v-for="axis in POSITION_AXES"
          :key="axis"
          :input-class="`editor-position-${axis}`"
          :label="t(axis === 'x' ? 'slideshow.imagePositionX' : 'slideshow.imagePositionY')"
          :model-value="percent(position[axis])"
          :min="0"
          :max="100"
          :step="0.1"
          :default-value="50"
          :value-text="`${percent(position[axis])}%`"
          @update:model-value="(v) => onPosition(axis, v)"
        />
      </div>

      <!-- Größe des Bildes (Breite × Höhe in % der Canvas) -->
      <div v-if="size" class="image-editor-size">
        <SliderControl
          v-for="dim in SIZE_DIMS"
          :key="dim"
          :input-class="`editor-size-${dim}`"
          :label="t(dim === 'width' ? 'slideshow.imageWidth' : 'slideshow.imageHeight')"
          :model-value="sizePercent(size[dim])"
          :min="1"
          :max="200"
          :step="0.1"
          :default-value="sizePercent(size[dim === 'width' ? 'defaultWidth' : 'defaultHeight'])"
          :value-text="`${sizePercent(size[dim])}%`"
          @update:model-value="(v) => onSize(dim, v)"
        />
        <UiSwitch
          v-model="keepAspect"
          class="editor-keep-aspect"
          :label="t('slideshow.keepAspect')"
        />
      </div>
    </div>

    <UiSelect
      class="editor-transition"
      :model-value="transition ?? 'default'"
      :options="transitionSelectOptions"
      :label="t('slideshow.transition')"
      size="sm"
      @update:model-value="onTransition"
    />

    <div class="image-editor-times">
      <label class="image-editor-field">
        <span>{{ t('slideshow.fieldFadeIn') }}</span>
        <span class="image-editor-duration">
          <input
            class="editor-fadein"
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            :value="Number.isFinite(fadeIn) ? fadeIn / 1000 : ''"
            :placeholder="(defaultFadeIn / 1000).toFixed(1)"
            @input="
              emit('update:fadeIn', toMs(($event.target as HTMLInputElement).value, 100, 5000))
            "
          />
          <span>s</span>
        </span>
      </label>
      <label class="image-editor-field">
        <span>{{ t('slideshow.fieldDisplay') }}</span>
        <span class="image-editor-duration">
          <input
            class="editor-duration"
            type="number"
            min="0.5"
            max="60"
            step="0.5"
            :value="Number.isFinite(duration) ? duration / 1000 : ''"
            :placeholder="(defaultDuration / 1000).toFixed(1)"
            @input="
              emit(
                'update:duration',
                toMs(
                  ($event.target as HTMLInputElement).value,
                  DISPLAY_DURATION_MIN_MS,
                  DISPLAY_DURATION_MAX_MS,
                ),
              )
            "
          />
          <span>s</span>
        </span>
      </label>
      <label class="image-editor-field">
        <span>{{ t('slideshow.fieldFadeOut') }}</span>
        <span class="image-editor-duration">
          <input
            class="editor-fadeout"
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            :value="Number.isFinite(fadeOut) ? fadeOut / 1000 : ''"
            :placeholder="(defaultFadeOut / 1000).toFixed(1)"
            @input="
              emit('update:fadeOut', toMs(($event.target as HTMLInputElement).value, 100, 5000))
            "
          />
          <span>s</span>
        </span>
      </label>
    </div>

    <UiSelect
      class="editor-audio"
      :model-value="audioMode"
      :options="audioSelectOptions"
      :label="t('slideshow.perImageAudioHint')"
      size="sm"
      @update:model-value="onAudio"
    />

    <!-- Eigene Audio-Quelle des Bildes (wie beim Bild-Audio-Reaktiv, inkl. Onset) -->
    <SlideshowAudioSourceSelect
      :label="t('slideshow.perImageAudioSource')"
      :inline="false"
      class="editor-audio-source"
      :model-value="audioSource"
      :inherit-label="t('slideshow.audioSourceInherit')"
      :disabled="audioMode === 'off'"
      @update:model-value="(v) => emit('update:audioSource', v)"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Einstellungskarte für ein Slideshow-Bild. Öffnet sich bei pausierter
 * Slideshow per Klick auf das Bild in der Leiste „Bilder auf Canvas“.
 * Rein darstellend: Änderungen werden emittiert, das SlideshowPanel übernimmt
 * sie live in die laufende Slideshow.
 */
import { computed, ref, onMounted, watch } from 'vue'
import { loadKeepAspect, saveKeepAspect } from '../../../lib/imagePlacementSettings'
import { useI18n } from '../../../lib/i18n'
import { DISPLAY_DURATION_MAX_MS, DISPLAY_DURATION_MIN_MS } from '../../../lib/displayDuration'
import { isValidTransition } from '../../../lib/slideshowTransitions'
import { isValidSlideshowAudioMode } from '../../../lib/slideshowAudio'
import { audioModeOptions, transitionOptions } from './slideshowSelectOptions'
import SlideshowAudioSourceSelect from './SlideshowAudioSourceSelect.vue'
import SliderControl from '../../ui/SliderControl.vue'
import UiSelect from '../../ui/UiSelect.vue'
import UiSwitch from '../../ui/UiSwitch.vue'
import type { SlideshowSourceImage } from '../../../lib/slideshowSources'
import type {
  SlideshowImagePosition,
  SlideshowImageSize,
  SlideshowImageSizeInput,
} from '../slideshowAdjustmentsApi'

const props = withDefaults(
  defineProps<{
    image: SlideshowSourceImage
    index: number
    total?: number
    transition?: string | null
    duration?: number
    fadeIn?: number
    fadeOut?: number
    defaultDuration?: number
    defaultFadeIn?: number
    defaultFadeOut?: number
    defaultTransition?: string
    audioMode?: string
    // Eigene Audio-Quelle (null = wie Einstellung/Preset)
    audioSource?: string | null
    hasSavedSettings?: boolean
    // Mittelpunkt des Bildes { x, y } relativ 0–1; null = nicht positionierbar
    position?: { x: number; y: number } | null
    // Größe { width, height, defaultWidth, defaultHeight } relativ 0–1; null = nicht skalierbar
    size?: SlideshowImageSize | null
  }>(),
  {
    total: 0,
    transition: null,
    duration: undefined,
    fadeIn: undefined,
    fadeOut: undefined,
    defaultDuration: 3000,
    defaultFadeIn: 1000,
    defaultFadeOut: 1000,
    defaultTransition: 'fade',
    audioMode: 'default',
    audioSource: null,
    hasSavedSettings: false,
    position: null,
    size: null,
  },
)
const emit = defineEmits<{
  'update:transition': [value: string | null]
  'update:duration': [value: number | undefined]
  'update:fadeIn': [value: number | undefined]
  'update:fadeOut': [value: number | undefined]
  'update:audioMode': [value: string]
  'update:audioSource': [value: string | null]
  'update:position': [value: SlideshowImagePosition]
  'update:size': [value: SlideshowImageSizeInput]
  close: []
}>()
const { t } = useI18n()

const transitionSelectOptions = computed(() => transitionOptions(t, props.defaultTransition))
const audioSelectOptions = computed(() => audioModeOptions(t, props.hasSavedSettings))
const rootRef = ref<HTMLElement | null>(null)

const title = computed(
  () => `${t('slideshow.image')} ${props.index + 1}/${props.total} · ${props.image.name || ''}`,
)
const thumbSrc = computed(
  () => props.image.thumbnail || props.image.img?.src || props.image.imageObject?.src || '',
)

function onTransition(value: unknown) {
  emit('update:transition', isValidTransition(value) ? (value as string) : null)
}

/** Sekunden-Eingabe → ms (begrenzt); leer/ungültig = undefined (Standard). */
function toMs(value: string, minMs: number, maxMs: number): number | undefined {
  const seconds = parseFloat(value)
  return Number.isFinite(seconds) && seconds > 0
    ? Math.round(Math.min(maxMs, Math.max(minMs, seconds * 1000)))
    : undefined
}

const POSITION_AXES = ['x', 'y'] as const

/** Relativ (0–1) → Prozent mit einer Nachkommastelle. */
function percent(value: number | undefined): number {
  return Number.isFinite(value) ? Math.round((value as number) * 1000) / 10 : 50
}

/** Prozent-Eingabe (begrenzt auf 0–100) → relative Position; ungültig = ignoriert. */
function onPosition(axis: 'x' | 'y', value: string | number) {
  const p = parseFloat(value as string)
  if (!Number.isFinite(p)) return
  const rel = Math.min(100, Math.max(0, p)) / 100
  emit('update:position', { ...props.position, [axis]: rel })
}

const SIZE_DIMS = ['width', 'height'] as const
// Seitenverhältnis beibehalten (Standard) – sonst wird das Bild verzerrt
const keepAspect = ref(loadKeepAspect()) // dauerhaft gespeichert
watch(keepAspect, saveKeepAspect)

/** Relative Größe → Prozent mit einer Nachkommastelle; ungültig = 100. */
function sizePercent(value: number | undefined): number {
  return Number.isFinite(value) && (value as number) > 0
    ? Math.round((value as number) * 1000) / 10
    : 100
}

/** Prozent-Eingabe (begrenzt auf 1–200) → relative Größe; ungültig = ignoriert. */
function onSize(dim: 'width' | 'height', value: string | number) {
  const p = parseFloat(value as string)
  if (!Number.isFinite(p)) return
  const rel = Math.min(200, Math.max(1, p)) / 100
  emit('update:size', { [dim]: rel, keepAspect: keepAspect.value })
}

function onAudio(value: unknown) {
  emit('update:audioMode', isValidSlideshowAudioMode(value) ? (value as string) : 'default')
}

onMounted(() => {
  rootRef.value?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
})
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.image-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: var(--ds-radius-md);
  border: 1px solid var(--image-section-accent);
  background-color: var(--card-bg);
}
.image-editor-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.image-editor-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: var(--ds-radius-sm);
  flex-shrink: 0;
}
.image-editor-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.image-editor-label {
  font-size: var(--ds-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}
.image-editor-name {
  font-size: var(--ds-text-xs);
  color: var(--ds-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn-close-editor {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--ds-text-md);
  padding: 2px 6px;
}
.image-editor-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}
.image-editor-field input {
  padding: 4px 6px;
  font-size: var(--ds-text-xs);
  background: var(--secondary-bg);
  color: var(--ds-text);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
}
.image-editor-times {
  display: flex;
  gap: 8px;
}
.image-editor-duration {
  display: flex;
  align-items: center;
  gap: 4px;
}
.image-editor-duration input {
  width: 56px;
  text-align: right;
}
.image-editor-position,
.image-editor-size {
  display: block;
}
.image-editor .hint {
  padding-left: 0;
}
[data-theme='light'] .image-editor {
  background-color: var(--ds-surface-3);
}
[data-theme='light'] .image-editor-name {
  color: var(--text-primary);
}
[data-theme='light'] .image-editor-field input {
  color: var(--text-primary);
  border-color: var(--ds-border);
}
</style>
