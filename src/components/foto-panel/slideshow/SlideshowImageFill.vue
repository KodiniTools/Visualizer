<template>
  <!-- Eigenes Bild als Fläche unter der Slideshow -->
  <div class="image-fill" :class="`${prefix}-image-fill`">
    <label class="checkbox-label">
      <input
        :checked="fill.enabled"
        :class="`${prefix}-image-toggle`"
        type="checkbox"
        :disabled="disabled"
        @change="emit('update', { enabled: $event.target.checked })"
      />
      <span>{{ t('slideshow.imageFill') }}</span>
    </label>

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
        <button
          type="button"
          class="btn-image-fill"
          :class="`${prefix}-image-choose`"
          :disabled="disabled"
          :aria-expanded="choosing"
          @click="choosing = !choosing"
        >
          {{ t('slideshow.imageFillChoose') }}
        </button>
        <button
          v-if="thumb || hasRef"
          type="button"
          class="btn-image-fill secondary"
          :class="`${prefix}-image-clear`"
          :disabled="disabled"
          @click="emit('clear')"
        >
          {{ t('slideshow.imageFillRemove') }}
        </button>
      </div>

      <div v-if="choosing" class="image-fill-picker" role="listbox">
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
          <span class="option-source">{{ c.source === 'stock' ? '🗂' : '⬆' }}</span>
        </button>
      </div>

      <label class="image-fill-field">
        <span>{{ t('slideshow.imageFillFit') }}</span>
        <select
          :value="fill.fit"
          :class="`${prefix}-image-fit`"
          :disabled="disabled"
          @change="emit('update', { fit: $event.target.value })"
        >
          <option value="cover">{{ t('slideshow.imageFillCover') }}</option>
          <option value="contain">{{ t('slideshow.imageFillContain') }}</option>
        </select>
      </label>

      <!-- Audio-Reaktiv für das Bild -->
      <label class="checkbox-label audio-toggle">
        <input
          :checked="fill.audio.enabled"
          :class="`${prefix}-image-audio-toggle`"
          type="checkbox"
          :disabled="disabled"
          @change="updateAudio({ enabled: $event.target.checked })"
        />
        <span>{{ t('slideshow.imageFillAudio') }}</span>
      </label>
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
        <SliderControl
          v-for="fx in audioEffects"
          :key="fx.id"
          class="image-fill-slider"
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
  font-size: 12px;
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
  border-radius: 4px;
  flex-shrink: 0;
}
.image-fill-empty,
.image-fill-name {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn-image-fill {
  flex-shrink: 0;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a9af8 100%);
}
.btn-image-fill.secondary {
  background: var(--secondary-bg);
  color: inherit;
  border: 1px solid var(--border-color);
}
.btn-image-fill:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.image-fill-picker {
  flex-basis: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
  padding: 4px;
  border-radius: 6px;
  background-color: var(--card-bg);
}
.image-fill-option {
  position: relative;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
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
.image-fill-option:hover,
.image-fill-option:focus-visible {
  border-color: #6ea8fe;
}
.option-source {
  position: absolute;
  right: 1px;
  bottom: 0;
  font-size: 9px;
}
.image-fill-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11px;
}
.image-fill-slider {
  flex-basis: 100%;
}
.image-fill-field select {
  padding: 3px 6px;
  font-size: 11px;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.audio-toggle {
  flex-basis: 100%;
}
[data-theme='light'] .image-fill-field select,
[data-theme='light'] .btn-image-fill.secondary {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
[data-theme='light'] .image-fill-picker {
  background-color: #f0ead0;
}
</style>
