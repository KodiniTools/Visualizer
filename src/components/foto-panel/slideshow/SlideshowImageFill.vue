<template>
  <!-- Eigenes Bild als Fläche unter der Slideshow -->
  <div class="image-fill" :class="`${prefix}-image-fill`">
    <UiSwitch
      :model-value="fill.enabled"
      :class="`${prefix}-image-toggle`"
      :label="t('slideshow.imageFill')"
      :disabled="disabled"
      @update:model-value="(v) => emit('update', { enabled: v })"
    />

    <div v-if="fill.enabled" class="image-fill-options">
      <div class="image-fill-current">
        <img
          v-if="thumb"
          :src="thumb"
          alt=""
          class="image-fill-thumb"
          :class="`${prefix}-image-current`"
        />
        <span v-else class="image-fill-empty">{{
          loading ? t('slideshow.imageFillLoading') : t('slideshow.imageFillNone')
        }}</span>
        <span v-if="thumb" class="image-fill-name">{{ name }}</span>
        <UiButton
          size="sm"
          :class="`${prefix}-image-choose`"
          :disabled="disabled"
          :aria-expanded="choosing ? 'true' : 'false'"
          @click="choosing = !choosing"
        >
          {{ t('slideshow.imageFillChoose') }}
        </UiButton>
        <UiButton
          v-if="thumb || hasRef"
          variant="ghost"
          size="sm"
          :class="`${prefix}-image-clear`"
          :disabled="disabled"
          @click="emit('clear')"
        >
          {{ t('slideshow.imageFillRemove') }}
        </UiButton>
      </div>

      <div
        v-if="choosing"
        class="image-fill-picker"
        role="group"
        :aria-label="t('slideshow.imageFillChoose')"
      >
        <p v-if="candidates.length === 0" class="hint">{{ t('slideshow.imageFillNoImages') }}</p>
        <button
          v-for="c in candidates"
          :key="c.id"
          type="button"
          class="image-fill-option"
          :class="`${prefix}-image-option`"
          :title="c.name"
          :aria-label="c.name"
          @click="pick(c)"
        >
          <img :src="c.thumb" alt="" loading="lazy" />
          <!-- Herkunft: Stock-Galerie (Raster) oder eigener Upload (Pfeil) -->
          <span class="option-source" aria-hidden="true">
            <svg
              v-if="c.source === 'stock'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <rect x="4" y="4" width="7" height="7" />
              <rect x="13" y="4" width="7" height="7" />
              <rect x="4" y="13" width="7" height="7" />
              <rect x="13" y="13" width="7" height="7" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </span>
        </button>
      </div>

      <UiSelect
        :model-value="fill.fit"
        :options="fitOptions"
        :label="t('slideshow.imageFillFit')"
        :class="`${prefix}-image-fit`"
        :disabled="disabled"
        size="sm"
        inline
        @update:model-value="(v) => emit('update', { fit: v })"
      />

      <!-- Audio-Reaktiv für das Bild -->
      <UiSwitch
        :model-value="fill.audio.enabled"
        class="audio-toggle"
        :class="`${prefix}-image-audio-toggle`"
        :label="t('slideshow.imageFillAudio')"
        :disabled="disabled"
        @update:model-value="(v) => updateAudio({ enabled: v })"
      />
      <template v-if="fill.audio.enabled">
        <label class="image-fill-field">
          <span>{{ t('slideshow.gradientAudioSource') }}</span>
          <SlideshowAudioSourceSelect
            :model-value="fill.audio.source"
            :class="`${prefix}-image-audio-source`"
            :disabled="disabled"
            @update:model-value="(v) => updateAudio({ source: v })"
          />
        </label>
        <div class="image-fill-slider">
          <SliderControl
            v-for="fx in audioEffects"
            :key="fx.id"
            :input-class="`${prefix}-image-audio-${fx.id}`"
            :label="t(fx.label)"
            :model-value="fill.audio[fx.id]"
            :min="0"
            :max="100"
            :step="1"
            :default-value="SLIDESHOW_IMAGE_FILL_DEFAULT.audio[fx.id]"
            :disabled="disabled"
            :value-text="`${fill.audio[fx.id]} %`"
            @update:model-value="(v) => updateAudio({ [fx.id]: v })"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * Eigenes Bild als Slideshow-Fläche (Canvas oder Workspace): Auswahl aus
 * Upload-/Stock-Galerie, Füllen/Einpassen und Audio-Reaktiv.
 * Rein darstellend: Änderungen werden emittiert.
 */
import { computed, ref } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import SlideshowAudioSourceSelect from './SlideshowAudioSourceSelect.vue'
import SliderControl from '../../ui/SliderControl.vue'
import { UiButton, UiSelect, UiSwitch } from '../../ui/index.js'
import { SLIDESHOW_IMAGE_FILL_DEFAULT } from '../../../lib/slideshowImageFill.js'

const props = defineProps({
  fill: { type: Object, required: true },
  // Vorschau des gewählten Bildes ('' = keines geladen)
  thumb: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  // Wählbare Bilder: { id, name, thumb, source, raw }
  candidates: { type: Array, default: () => [] },
  // CSS-Klassen-Präfix ('base' | 'workspace') – unterscheidet die Felder
  prefix: { type: String, default: 'base' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update', 'select', 'clear'])
const { t } = useI18n()

const audioEffects = [
  { id: 'brightness', label: 'slideshow.fillAudioBrightness' },
  { id: 'hue', label: 'slideshow.fillAudioHue' },
  { id: 'zoom', label: 'slideshow.imageFillZoom' },
]
const choosing = ref(false)

const fitOptions = computed(() => [
  { value: 'cover', label: t('slideshow.imageFillCover') },
  { value: 'contain', label: t('slideshow.imageFillContain') },
])

const hasRef = computed(() => Boolean(props.fill.stock || props.fill.upload))
const name = computed(() => props.fill.stock?.name || props.fill.upload?.name || '')

function pick(candidate) {
  choosing.value = false
  emit('select', candidate.raw)
}

function updateAudio(partial) {
  emit('update', { audio: { ...props.fill.audio, ...partial } })
}
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.image-fill {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--ds-text-xs);
}
.image-fill-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding-left: 20px;
}
.image-fill-current {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.image-fill-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: var(--ds-radius-sm);
  flex-shrink: 0;
}
.image-fill-empty,
.image-fill-name {
  flex: 1;
  min-width: 0;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.image-fill-picker {
  flex-basis: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
  padding: 4px;
  border-radius: var(--ds-radius-sm);
  background-color: var(--card-bg);
}
.image-fill-option {
  position: relative;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  background: none;
  cursor: pointer;
  aspect-ratio: 1;
  overflow: hidden;
}
.image-fill-option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.image-fill-option:hover {
  border-color: var(--ds-accent);
}
.image-fill-option:focus-visible {
  outline: none;
  border-color: var(--ds-accent);
  box-shadow: var(--ds-focus-ring);
}
.option-source {
  position: absolute;
  right: 2px;
  bottom: 2px;
  display: flex;
  padding: 2px;
  border-radius: var(--ds-radius-sm);
  background: rgba(0, 0, 0, 0.55);
  color: white;
}
.option-source svg {
  width: 10px;
  height: 10px;
}
.image-fill-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: var(--ds-text-xs);
}
/* Audio-Quelle (SlideshowAudioSourceSelect ist ein natives select) */
.image-fill-field select {
  padding: 3px 6px;
  font-size: var(--ds-text-xs);
  background: var(--secondary-bg);
  color: var(--ds-text);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
}
[data-theme='light'] .image-fill-field select {
  color: var(--text-primary);
  border-color: var(--ds-border);
}
.image-fill-slider {
  flex-basis: 100%;
}
.audio-toggle {
  flex-basis: 100%;
}
[data-theme='light'] .image-fill-picker {
  background-color: var(--ds-surface-3);
}
</style>
