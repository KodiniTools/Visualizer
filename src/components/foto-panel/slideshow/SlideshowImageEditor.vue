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

    <label class="image-editor-field">
      <span>{{ t('slideshow.transition') }}</span>
      <select
        class="editor-transition"
        :value="transition ?? 'default'"
        @change="onTransition($event.target.value)"
      >
        <option value="default">
          {{ t('slideshow.transitionDefault') }} ({{
            t(`slideshow.transitions.${defaultTransition}`)
          }})
        </option>
        <option v-for="tr in transitions" :key="tr.id" :value="tr.id">
          {{ tr.icon }} {{ t(`slideshow.transitions.${tr.id}`) }}
        </option>
      </select>
    </label>

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
            @input="emit('update:fadeIn', toMs($event.target.value, 100, 5000))"
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
            @input="emit('update:duration', toMs($event.target.value, 500, 60000))"
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
            @input="emit('update:fadeOut', toMs($event.target.value, 100, 5000))"
          />
          <span>s</span>
        </span>
      </label>
    </div>

    <label class="image-editor-field">
      <span>{{ t('slideshow.perImageAudioHint') }}</span>
      <select class="editor-audio" :value="audioMode" @change="onAudio($event.target.value)">
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

    <!-- Eigene Audio-Quelle des Bildes (wie beim Bild-Audio-Reaktiv, inkl. Onset) -->
    <label class="image-editor-field">
      <span>{{ t('slideshow.perImageAudioSource') }}</span>
      <SlideshowAudioSourceSelect
        class="editor-audio-source"
        :model-value="audioSource"
        :inherit-label="t('slideshow.audioSourceInherit')"
        :disabled="audioMode === 'off'"
        @update:model-value="(v) => emit('update:audioSource', v)"
      />
    </label>
  </div>
</template>

<script setup>
/**
 * Einstellungskarte für ein Slideshow-Bild. Öffnet sich bei pausierter
 * Slideshow per Klick auf das Bild in der Leiste „Bilder auf Canvas“.
 * Rein darstellend: Änderungen werden emittiert, das SlideshowPanel übernimmt
 * sie live in die laufende Slideshow.
 */
import { computed, ref, onMounted } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import { SLIDESHOW_TRANSITIONS, isValidTransition } from '../../../lib/slideshowTransitions.js'
import {
  SLIDESHOW_AUDIO_PRESET_OPTIONS,
  isValidSlideshowAudioMode,
} from '../../../lib/slideshowAudio.js'
import SlideshowAudioSourceSelect from './SlideshowAudioSourceSelect.vue'

const props = defineProps({
  image: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, default: 0 },
  transition: { type: String, default: null },
  duration: { type: Number, default: undefined },
  fadeIn: { type: Number, default: undefined },
  fadeOut: { type: Number, default: undefined },
  defaultDuration: { type: Number, default: 3000 },
  defaultFadeIn: { type: Number, default: 1000 },
  defaultFadeOut: { type: Number, default: 1000 },
  defaultTransition: { type: String, default: 'fade' },
  audioMode: { type: String, default: 'default' },
  // Eigene Audio-Quelle (null = wie Einstellung/Preset)
  audioSource: { type: String, default: null },
  hasSavedSettings: { type: Boolean, default: false },
})
const emit = defineEmits([
  'update:transition',
  'update:duration',
  'update:fadeIn',
  'update:fadeOut',
  'update:audioMode',
  'update:audioSource',
  'close',
])
const { t } = useI18n()

const transitions = SLIDESHOW_TRANSITIONS
const presetOptions = SLIDESHOW_AUDIO_PRESET_OPTIONS
const rootRef = ref(null)

const title = computed(
  () => `${t('slideshow.image')} ${props.index + 1}/${props.total} · ${props.image.name || ''}`,
)
const thumbSrc = computed(
  () => props.image.thumbnail || props.image.img?.src || props.image.imageObject?.src || '',
)

function onTransition(value) {
  emit('update:transition', isValidTransition(value) ? value : null)
}

/** Sekunden-Eingabe → ms (begrenzt); leer/ungültig = undefined (Standard). */
function toMs(value, minMs, maxMs) {
  const seconds = parseFloat(value)
  return Number.isFinite(seconds) && seconds > 0
    ? Math.round(Math.min(maxMs, Math.max(minMs, seconds * 1000)))
    : undefined
}

function onAudio(value) {
  emit('update:audioMode', isValidSlideshowAudioMode(value) ? value : 'default')
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
  border-radius: 8px;
  border: 1px solid var(--image-section-accent, #6ea8fe);
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
  border-radius: 4px;
  flex-shrink: 0;
}
.image-editor-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.image-editor-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}
.image-editor-name {
  font-size: 12px;
  color: #e0e0e0;
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
  font-size: 14px;
  padding: 2px 6px;
}
.image-editor-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
  color: var(--text-muted);
}
.image-editor-field select,
.image-editor-field input {
  padding: 4px 6px;
  font-size: 12px;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
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
.image-editor .hint {
  padding-left: 0;
}
[data-theme='light'] .image-editor {
  background-color: #f0ead0;
}
[data-theme='light'] .image-editor-name {
  color: #003971;
}
[data-theme='light'] .image-editor-field select,
[data-theme='light'] .image-editor-field input {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
</style>
