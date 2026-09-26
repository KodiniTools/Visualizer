<template>
  <!-- Reihenfolge der Bilder per Drag & Drop -->
  <div class="order-section">
    <label class="section-label">{{ t('slideshow.order') }}</label>
    <p class="hint">{{ t('slideshow.perImageHint') }}</p>
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
          <span v-if="img.source === 'stock'" class="order-stock-badge">Stock</span>
          {{ img.name || `Bild ${index + 1}` }}
        </span>
        <span class="drag-handle">&#x2630;</span>
        <!-- Einstellungen dieses Bildes (volle Breite unter der Kopfzeile) -->
        <div class="order-body">
          <!-- Übergang dieses Bildes -->
          <label class="order-field">
            <span class="order-field-label">{{ t('slideshow.fieldTransition') }}</span>
            <select
              class="order-transition"
              :class="{ 'is-own': transitionFor(img) !== 'default' }"
              :value="transitionFor(img)"
              :title="t('slideshow.perImageTransitionHint')"
              @change="onTransitionChange(img, $event)"
              @mousedown.stop
            >
              <option value="default">
                {{ t('slideshow.transitionDefault') }} ({{
                  t(`slideshow.transitions.${defaultTransition}`)
                }})
              </option>
              <option v-for="tr in transitionOptions" :key="tr.id" :value="tr.id">
                {{ tr.icon }} {{ t(`slideshow.transitions.${tr.id}`) }}
              </option>
            </select>
          </label>
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
                :title="t('slideshow.perImageFadeInHint')"
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
                :title="t('slideshow.perImageDurationHint')"
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
                :title="t('slideshow.perImageFadeOutHint')"
                @input="onMsInput('fadeOuts', img, $event, 100, 5000)"
                @dragstart.prevent.stop
                @mousedown.stop
              />
            </label>
            <span class="order-duration-unit">s</span>
          </div>
          <!-- Audio-Reaktion dieses Bildes -->
          <label class="order-field">
            <span class="order-field-label">{{ t('slideshow.fieldAudio') }}</span>
            <select
              class="order-audio"
              :class="{ 'is-own': audioModeFor(img) !== 'default' }"
              :value="audioModeFor(img)"
              :title="t('slideshow.perImageAudioHint')"
              @change="onAudioModeChange(img, $event)"
              @mousedown.stop
            >
              <option value="default">{{ t('slideshow.audioModeDefault') }}</option>
              <option value="off">{{ t('slideshow.audioModeOff') }}</option>
              <option value="saved" :disabled="!hasSavedSettings">
                {{ t('slideshow.audioModeSaved') }}
              </option>
              <option v-for="p in presetOptions" :key="p.id" :value="p.id">
                {{ p.icon }} {{ p.name }}
              </option>
            </select>
          </label>
          <!-- Eigene Audio-Quelle dieses Bildes (wie beim Bild-Audio-Reaktiv, inkl. Onset) -->
          <label class="order-field">
            <span class="order-field-label">{{ t('slideshow.fieldAudioSource') }}</span>
            <SlideshowAudioSourceSelect
              class="order-audio-source"
              :class="{ 'is-own': audioSourceFor(img) !== null }"
              :model-value="audioSourceFor(img)"
              :inherit-label="t('slideshow.audioSourceInherit')"
              :disabled="audioModeFor(img) === 'off'"
              :title="t('slideshow.perImageAudioSource')"
              @update:model-value="(v) => onAudioSourceChange(img, v)"
              @mousedown.stop
            />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Bildreihenfolge der Slideshow (Drag & Drop). Die Liste wird per v-model
 * gehalten; nach einem Drop wird `order-changed` mit der neuen Reihenfolge emittiert.
 * Pro Bild optional:
 * - Übergang (v-model:transitions), Ein-/Ausblenddauer (v-model:fade-ins/fade-outs, ms)
 * - eigene Anzeigedauer (v-model:durations, { [key]: ms }); leer = defaultDuration
 * - Audio-Reaktiv-Modus (v-model:audio-modes, { [key]: mode }); fehlt = 'default'
 * - eigene Audio-Quelle (v-model:audio-sources, { [key]: source }); fehlt = wie Einstellung
 */
import { ref } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import {
  SLIDESHOW_AUDIO_DEFAULT,
  SLIDESHOW_AUDIO_PRESET_OPTIONS,
  isValidSlideshowAudioMode,
  isValidSlideshowAudioSource,
} from '../../../lib/slideshowAudio.js'
import SlideshowAudioSourceSelect from './SlideshowAudioSourceSelect.vue'
import { slideshowImageKey } from './slideshowImageKey.js'
import { SLIDESHOW_TRANSITIONS, isValidTransition } from '../../../lib/slideshowTransitions.js'

defineProps({
  defaultDuration: { type: Number, default: 3000 },
  // Standardwerte (Einstellungen für alle Bilder) – als Platzhalter/Hinweis
  defaultFadeIn: { type: Number, default: 1000 },
  defaultFadeOut: { type: Number, default: 1000 },
  defaultTransition: { type: String, default: 'fade' },
  hasSavedSettings: { type: Boolean, default: false },
})

const orderedImages = defineModel({ type: Array, default: () => [] })
const durations = defineModel('durations', { type: Object, default: () => ({}) })
const audioModes = defineModel('audioModes', { type: Object, default: () => ({}) })
// Eigene Audio-Quelle pro Bild ({ [key]: source }); fehlt = wie Einstellung
const audioSources = defineModel('audioSources', { type: Object, default: () => ({}) })
// Eigene Übergangsanimation pro Bild ({ [key]: transitionId }); fehlt = globaler Übergang
const transitions = defineModel('transitions', { type: Object, default: () => ({}) })
// Eigene Ein-/Ausblenddauer pro Bild ({ [key]: ms }); fehlt = Standard
const fadeIns = defineModel('fadeIns', { type: Object, default: () => ({}) })
const fadeOuts = defineModel('fadeOuts', { type: Object, default: () => ({}) })
const transitionOptions = SLIDESHOW_TRANSITIONS
const presetOptions = SLIDESHOW_AUDIO_PRESET_OPTIONS
const emit = defineEmits(['order-changed'])
const { t } = useI18n()

const dragIndex = ref(null)

function onDragStart(index, event) {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', index.toString())
}

function onDragOver(index) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const list = [...orderedImages.value]
  const item = list[dragIndex.value]
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
function secondsFor(name, img) {
  const ms = timeModels[name].value[slideshowImageKey(img)]
  return Number.isFinite(ms) ? ms / 1000 : ''
}

/** Übernimmt eine Sekunden-Eingabe als ms (begrenzt); leer/ungültig = Standard. */
function onMsInput(name, img, event, minMs, maxMs) {
  const model = timeModels[name]
  const key = slideshowImageKey(img)
  if (key === undefined) return
  const next = { ...model.value }
  const seconds = parseFloat(event.target.value)
  if (Number.isFinite(seconds) && seconds > 0) {
    next[key] = Math.round(Math.min(maxMs, Math.max(minMs, seconds * 1000)))
  } else {
    delete next[key]
  }
  model.value = next
}

function audioModeFor(img) {
  return audioModes.value[slideshowImageKey(img)] ?? SLIDESHOW_AUDIO_DEFAULT
}

function audioSourceFor(img) {
  return audioSources.value[slideshowImageKey(img)] ?? null
}

function onAudioSourceChange(img, source) {
  const key = slideshowImageKey(img)
  if (key === undefined) return
  const next = { ...audioSources.value }
  if (isValidSlideshowAudioSource(source)) next[key] = source
  else delete next[key]
  audioSources.value = next
}

function transitionFor(img) {
  return transitions.value[slideshowImageKey(img)] ?? 'default'
}

function onTransitionChange(img, event) {
  const key = slideshowImageKey(img)
  if (key === undefined) return
  const value = event.target.value
  const next = { ...transitions.value }
  if (isValidTransition(value)) next[key] = value
  else delete next[key]
  transitions.value = next
}

function onAudioModeChange(img, event) {
  const key = slideshowImageKey(img)
  if (key === undefined) return
  const mode = event.target.value
  const next = { ...audioModes.value }
  if (isValidSlideshowAudioMode(mode) && mode !== SLIDESHOW_AUDIO_DEFAULT) {
    next[key] = mode
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
  border-radius: 3px;
}
.image-order-list::-webkit-scrollbar-thumb {
  background: var(--btn-hover);
  border-radius: 3px;
}
.order-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  background-color: var(--card-bg);
  border-radius: 6px;
  padding: 8px 10px;
  cursor: grab;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}
.order-item:hover {
  background-color: var(--secondary-bg);
  border-color: var(--border-color);
}
.order-item.dragging {
  opacity: 0.5;
  border-color: var(--image-section-accent, #6ea8fe);
}
.order-number {
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a9af8 100%);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.order-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
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
.order-field {
  display: flex;
  align-items: center;
  gap: 6px;
}
.order-field-label {
  flex-shrink: 0;
  width: 58px;
  font-size: 10px;
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
  font-size: 11px;
  text-align: right;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
/* Eigener Wert (≠ Standard) hervorheben */
.order-item .is-own {
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 0 0 1px rgba(110, 168, 254, 0.35);
}
[data-theme='light'] .order-fadein,
[data-theme='light'] .order-fadeout {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
.order-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.order-transition,
.order-audio,
.order-audio-source {
  flex: 1;
  min-width: 0;
  padding: 3px 4px;
  font-size: 11px;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
/* Quelle gesperrt (Audio „Aus“) */
.order-audio-source:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.order-stock-badge {
  display: inline-block;
  margin-right: 4px;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(110, 168, 254, 0.25);
  color: #6ea8fe;
}
.order-name {
  font-size: 12px;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.order-duration {
  width: 52px;
  flex-shrink: 0;
  padding: 3px 4px;
  font-size: 11px;
  text-align: right;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.order-duration-unit {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: -4px;
}
.drag-handle {
  margin-left: auto;
  color: #666;
  font-size: 14px;
  cursor: grab;
  padding: 4px;
}
.drag-handle:hover {
  color: var(--text-muted);
}
[data-theme='light'] .image-order-list::-webkit-scrollbar-track {
  background: #f9f2d5;
}
[data-theme='light'] .image-order-list::-webkit-scrollbar-thumb {
  background: #d4c8a8;
}
[data-theme='light'] .order-item {
  background-color: #f0ead0;
}
[data-theme='light'] .order-item:hover {
  background-color: #e8e0c0;
  border-color: #d4c8a8;
}
[data-theme='light'] .order-number {
  background: linear-gradient(135deg, #014f99 0%, #003971 100%);
  color: #f5f4d6;
}
[data-theme='light'] .order-name {
  color: #003971;
}
[data-theme='light'] .order-transition,
[data-theme='light'] .order-audio,
[data-theme='light'] .order-audio-source,
[data-theme='light'] .order-duration {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
[data-theme='light'] .drag-handle {
  color: #4d6d8e;
}
[data-theme='light'] .drag-handle:hover {
  color: #003971;
}
</style>
