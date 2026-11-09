<template>
  <!-- Reihenfolge der Bilder per Drag & Drop -->
  <div class="order-section">
    <label class="section-label">{{ t('slideshow.order') }}</label>
    <div class="image-order-list">
      <div
        v-for="(img, index) in orderedImages"
        :key="img.id || index"
        class="order-item"
        :class="{ dragging: dragIndex === index }"
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragover.prevent="onDragOver(index)"
        @drop="onDrop"
        @dragend="onDragEnd"
      >
        <span class="order-number">{{ index + 1 }}</span>
        <img
          :src="img.thumbnail || img.img?.src || img.imageObject?.src"
          :alt="img.name || 'Bild'"
          class="order-thumb"
        />
        <span class="order-name">
          <span v-if="img.source === 'stock'" class="order-stock-badge">{{
            t('slideshow.stockBadge')
          }}</span>
          {{ img.name || `Bild ${index + 1}` }}
        </span>
        <span class="drag-handle">&#x2630;</span>
        <!-- Einstellungen dieses Bildes (volle Breite unter der Kopfzeile) -->
        <div class="order-body">
          <!-- Übergang dieses Bildes -->
          <UiSelect
            class="order-transition"
            :class="{ 'is-own': transitionFor(img) !== 'default' }"
            :model-value="transitionFor(img)"
            :options="transitionSelectOptions"
            :label="t('slideshow.fieldTransition')"
            size="sm"
            inline
            @update:model-value="(v) => onTransitionChange(img, v)"
            @mousedown.stop
          />
          <!-- Zeiten dieses Bildes: Einblenden · Anzeige · Ausblenden (leer = Standard) -->
          <div class="order-times">
            <label class="order-time">
              <span class="order-field-label">{{ t('slideshow.fieldFadeIn') }}</span>
              <input
                class="order-fadein"
                :class="{ 'is-own': secondsFor('fadeIns', img) !== '' }"
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                draggable="false"
                :value="secondsFor('fadeIns', img)"
                :placeholder="(defaultFadeIn / 1000).toFixed(1)"
                @input="onMsInput('fadeIns', img, $event, 100, 5000)"
                @dragstart.prevent.stop
                @mousedown.stop
              />
            </label>
            <label class="order-time">
              <span class="order-field-label">{{ t('slideshow.fieldDisplay') }}</span>
              <input
                class="order-duration"
                :class="{ 'is-own': secondsFor('durations', img) !== '' }"
                type="number"
                min="0.5"
                max="60"
                step="0.5"
                draggable="false"
                :value="secondsFor('durations', img)"
                :placeholder="(defaultDuration / 1000).toFixed(1)"
                :aria-label="t('slideshow.perImageDurationHint')"
                @input="onMsInput('durations', img, $event, 500, 60000)"
                @dragstart.prevent.stop
                @mousedown.stop
              />
            </label>
            <label class="order-time">
              <span class="order-field-label">{{ t('slideshow.fieldFadeOut') }}</span>
              <input
                class="order-fadeout"
                :class="{ 'is-own': secondsFor('fadeOuts', img) !== '' }"
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                draggable="false"
                :value="secondsFor('fadeOuts', img)"
                :placeholder="(defaultFadeOut / 1000).toFixed(1)"
                @input="onMsInput('fadeOuts', img, $event, 100, 5000)"
                @dragstart.prevent.stop
                @mousedown.stop
              />
            </label>
            <span class="order-duration-unit">s</span>
          </div>
          <!-- Audio-Reaktion dieses Bildes -->
          <UiSelect
            class="order-audio"
            :class="{ 'is-own': audioModeFor(img) !== 'default' }"
            :model-value="audioModeFor(img)"
            :options="audioSelectOptions"
            :label="t('slideshow.fieldAudio')"
            size="sm"
            inline
            @update:model-value="(v) => onAudioModeChange(img, v)"
            @mousedown.stop
          />
          <!-- Eigene Audio-Quelle dieses Bildes (wie beim Bild-Audio-Reaktiv, inkl. Onset) -->
          <SlideshowAudioSourceSelect
            class="order-audio-source"
            :class="{ 'is-own': audioSourceFor(img) !== null }"
            :model-value="audioSourceFor(img)"
            :label="t('slideshow.fieldAudioSource')"
            :inherit-label="t('slideshow.audioSourceInherit')"
            :disabled="audioModeFor(img) === 'off'"
            @update:model-value="(v) => onAudioSourceChange(img, v)"
            @mousedown.stop
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Bildreihenfolge der Slideshow (Drag & Drop). Die Liste wird per v-model
 * gehalten; nach einem Drop wird `order-changed` mit der neuen Reihenfolge emittiert.
 * Pro Bild optional:
 * - Übergang (v-model:transitions), Ein-/Ausblenddauer (v-model:fade-ins/fade-outs, ms)
 * - eigene Anzeigedauer (v-model:durations, { [key]: ms }); leer = defaultDuration
 * - Audio-Reaktiv-Modus (v-model:audio-modes, { [key]: mode }); fehlt = 'default'
 * - eigene Audio-Quelle (v-model:audio-sources, { [key]: source }); fehlt = wie Einstellung
 */
import { computed, ref } from 'vue'
import { useI18n } from '../../../lib/i18n'
import {
  SLIDESHOW_AUDIO_DEFAULT,
  isValidSlideshowAudioMode,
  isValidSlideshowAudioSource,
} from '../../../lib/slideshowAudio'
import SlideshowAudioSourceSelect from './SlideshowAudioSourceSelect.vue'
import { slideshowImageKey } from './slideshowImageKey'
import { isValidTransition } from '../../../lib/slideshowTransitions'
import UiSelect from '../../ui/UiSelect.vue'
import { audioModeOptions, transitionOptions } from './slideshowSelectOptions'
import type { SlideshowSourceImage } from '../../../lib/slideshowSources'
import type { PerImageMap } from './useSlideshowPerImageSettings'

type TimeModelName = 'durations' | 'fadeIns' | 'fadeOuts'

const props = withDefaults(
  defineProps<{
    defaultDuration?: number
    // Standardwerte (Einstellungen für alle Bilder) – als Platzhalter/Hinweis
    defaultFadeIn?: number
    defaultFadeOut?: number
    defaultTransition?: string
    hasSavedSettings?: boolean
  }>(),
  {
    defaultDuration: 3000,
    defaultFadeIn: 1000,
    defaultFadeOut: 1000,
    defaultTransition: 'fade',
    hasSavedSettings: false,
  },
)

const orderedImages = defineModel<SlideshowSourceImage[]>({ default: () => [] })
const durations = defineModel<PerImageMap<number>>('durations', { default: () => ({}) })
const audioModes = defineModel<PerImageMap<string>>('audioModes', { default: () => ({}) })
// Eigene Audio-Quelle pro Bild ({ [key]: source }); fehlt = wie Einstellung
const audioSources = defineModel<PerImageMap<string>>('audioSources', { default: () => ({}) })
// Eigene Übergangsanimation pro Bild ({ [key]: transitionId }); fehlt = globaler Übergang
const transitions = defineModel<PerImageMap<string>>('transitions', { default: () => ({}) })
// Eigene Ein-/Ausblenddauer pro Bild ({ [key]: ms }); fehlt = Standard
const fadeIns = defineModel<PerImageMap<number>>('fadeIns', { default: () => ({}) })
const fadeOuts = defineModel<PerImageMap<number>>('fadeOuts', { default: () => ({}) })
const transitionSelectOptions = computed(() => transitionOptions(t, props.defaultTransition))
const audioSelectOptions = computed(() => audioModeOptions(t, props.hasSavedSettings))
const emit = defineEmits<{ 'order-changed': [images: SlideshowSourceImage[]] }>()
const { t } = useI18n()

const dragIndex = ref<number | null>(null)

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  const dt = event.dataTransfer as DataTransfer
  dt.effectAllowed = 'move'
  dt.setData('text/plain', index.toString())
}

function onDragOver(index: number) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const list = [...orderedImages.value]
  const item = list[dragIndex.value] as SlideshowSourceImage
  list.splice(dragIndex.value, 1)
  list.splice(index, 0, item)
  orderedImages.value = list
  dragIndex.value = index
}

function onDrop() {
  emit('order-changed', orderedImages.value)
}

// Zeit-Modelle per Name (im Template werden Refs entpackt)
const timeModels = { durations, fadeIns, fadeOuts }

/** Eigener Wert (ms) eines Bildes als Sekunden-Text, leer = Standard. */
function secondsFor(name: TimeModelName, img: SlideshowSourceImage): number | '' {
  const ms = timeModels[name].value[slideshowImageKey(img) as string | number]
  return Number.isFinite(ms) ? (ms as number) / 1000 : ''
}

/** Übernimmt eine Sekunden-Eingabe als ms (begrenzt); leer/ungültig = Standard. */
function onMsInput(
  name: TimeModelName,
  img: SlideshowSourceImage,
  event: Event,
  minMs: number,
  maxMs: number,
) {
  const model = timeModels[name]
  const key = slideshowImageKey(img)
  if (key === undefined) return
  const next = { ...model.value }
  const seconds = parseFloat((event.target as HTMLInputElement).value)
  if (Number.isFinite(seconds) && seconds > 0) {
    next[key] = Math.round(Math.min(maxMs, Math.max(minMs, seconds * 1000)))
  } else {
    delete next[key]
  }
  model.value = next
}

function audioModeFor(img: SlideshowSourceImage): string {
  return audioModes.value[slideshowImageKey(img) as string | number] ?? SLIDESHOW_AUDIO_DEFAULT
}

function audioSourceFor(img: SlideshowSourceImage): string | null {
  return audioSources.value[slideshowImageKey(img) as string | number] ?? null
}

function onAudioSourceChange(img: SlideshowSourceImage, source: unknown) {
  const key = slideshowImageKey(img)
  if (key === undefined) return
  const next = { ...audioSources.value }
  if (isValidSlideshowAudioSource(source)) next[key] = source
  else delete next[key]
  audioSources.value = next
}

function transitionFor(img: SlideshowSourceImage): string {
  return transitions.value[slideshowImageKey(img) as string | number] ?? 'default'
}

function onTransitionChange(img: SlideshowSourceImage, value: unknown) {
  const key = slideshowImageKey(img)
  if (key === undefined) return
  const next = { ...transitions.value }
  if (isValidTransition(value)) next[key] = value as string
  else delete next[key]
  transitions.value = next
}

function onAudioModeChange(img: SlideshowSourceImage, mode: unknown) {
  const key = slideshowImageKey(img)
  if (key === undefined) return
  const next = { ...audioModes.value }
  if (isValidSlideshowAudioMode(mode) && mode !== SLIDESHOW_AUDIO_DEFAULT) {
    next[key] = mode as string
  } else {
    delete next[key]
  }
  audioModes.value = next
}

function onDragEnd() {
  dragIndex.value = null
}
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.order-section .hint {
  padding-left: 0;
  margin-bottom: 6px;
}
.image-order-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 460px;
  overflow-y: auto;
  padding-right: 4px;
}
.image-order-list::-webkit-scrollbar {
  width: 6px;
}
.image-order-list::-webkit-scrollbar-track {
  background: var(--secondary-bg);
  border-radius: var(--ds-radius-sm);
}
.image-order-list::-webkit-scrollbar-thumb {
  background: var(--btn-hover);
  border-radius: var(--ds-radius-sm);
}
.order-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  background-color: var(--card-bg);
  border-radius: var(--ds-radius-sm);
  padding: 8px 10px;
  cursor: grab;
  transition: all var(--ds-duration) var(--ds-ease);
  border: 1px solid transparent;
}
.order-item:hover {
  background-color: var(--secondary-bg);
  border-color: var(--border-color);
}
.order-item.dragging {
  opacity: 0.5;
  border-color: var(--image-section-accent);
}
.order-number {
  width: 22px;
  height: 22px;
  background: var(--ds-link);
  color: #fff;
  border-radius: var(--ds-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  flex-shrink: 0;
}
.order-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: var(--ds-radius-sm);
  flex-shrink: 0;
}
.order-body {
  flex-basis: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
}
.order-field-label {
  flex-shrink: 0;
  width: 58px;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}
.order-times {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding-left: 64px; /* bündig mit den Auswahlfeldern (Label-Spalte) */
}
.order-time {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.order-time .order-field-label {
  width: auto;
}
.order-fadein,
.order-fadeout,
.order-times .order-duration {
  width: 48px;
  flex-shrink: 0;
  padding: 3px 4px;
  font-size: var(--ds-text-xs);
  text-align: right;
  background: var(--secondary-bg);
  color: var(--ds-text);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
}
/* Eigener Wert (≠ Standard) hervorheben – auch am nativen select im UiSelect */
.order-item .is-own,
.order-item :deep(.ui-select__native.is-own) {
  border-color: var(--image-section-accent);
}
[data-theme='light'] .order-fadein,
[data-theme='light'] .order-fadeout {
  background: var(--secondary-bg);
  color: var(--text-primary);
  border-color: var(--ds-border);
}
.order-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
/* Auswahlfelder (UiSelect): Beschriftung als schmale Spalte links */
.order-body :deep(.ui-select--inline) {
  gap: 6px;
}
.order-body :deep(.ui-select__label) {
  flex-shrink: 0;
  width: 58px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-regular);
  color: var(--text-muted);
  white-space: normal;
}
.order-body :deep(.ui-select__control) {
  flex: 1;
  min-width: 0;
}
.order-body :deep(.ui-select__native) {
  font-size: var(--ds-text-xs);
}
.order-stock-badge {
  display: inline-block;
  margin-right: 4px;
  padding: 0 4px;
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  text-transform: uppercase;
  background: color-mix(in srgb, var(--ds-link) 25%, transparent);
  color: var(--ds-link);
}
.order-name {
  font-size: var(--ds-text-xs);
  color: var(--ds-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.order-duration {
  width: 52px;
  flex-shrink: 0;
  padding: 3px 4px;
  font-size: var(--ds-text-xs);
  text-align: right;
  background: var(--secondary-bg);
  color: var(--ds-text);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
}
.order-duration-unit {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-left: -4px;
}
.drag-handle {
  margin-left: auto;
  color: var(--ds-text-3);
  font-size: var(--ds-text-md);
  cursor: grab;
  padding: 4px;
}
.drag-handle:hover {
  color: var(--text-muted);
}
[data-theme='light'] .image-order-list::-webkit-scrollbar-thumb {
  background: var(--ds-surface-3);
}
[data-theme='light'] .order-item {
  background-color: var(--ds-surface-3);
}
[data-theme='light'] .order-item:hover {
  background-color: var(--ds-surface-3);
  border-color: var(--ds-border);
}
[data-theme='light'] .order-number {
  background: var(--accent-primary);
  color: var(--accent-text);
}
[data-theme='light'] .order-name {
  color: var(--text-primary);
}
[data-theme='light'] .order-transition,
[data-theme='light'] .order-audio,
[data-theme='light'] .order-audio-source,
[data-theme='light'] .order-duration {
  background: var(--secondary-bg);
  color: var(--text-primary);
  border-color: var(--ds-border);
}
[data-theme='light'] .drag-handle {
  color: var(--text-muted);
}
[data-theme='light'] .drag-handle:hover {
  color: var(--text-primary);
}
</style>
