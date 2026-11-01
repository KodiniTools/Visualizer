<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-markers">
    <div class="spb-popover-header">
      <span class="section-label"
        >{{ t('player.beatMarkers') }} ({{ beatMarkerStore.markerCount }})</span
      >
      <div class="marker-controls">
        <span
          :title="
            beatMarkerStore.markersEnabled ? t('player.disableMarkers') : t('player.enableMarkers')
          "
        >
          <UiSwitch v-model="markersEnabled" :label="t('player.markersActive')" label-hidden />
        </span>
        <UiIconButton
          :label="t('player.beatMarker')"
          variant="secondary"
          size="sm"
          :pressed="showMarkerPanel"
          @click="addMarkerAtCurrentTime"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
        </UiIconButton>
        <UiIconButton
          v-if="beatMarkerStore.markerCount > 0"
          :label="t('player.deleteAllMarkers')"
          size="sm"
          @click="clearAllMarkers"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
        </UiIconButton>
        <button class="spb-popover-close" :title="t('common.close')" @click="close">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Übergang zwischen Markern (Aus-/Einblenden) -->
    <div class="marker-transition-row">
      <span class="transition-toggle" :title="t('player.transitionHint')">
        <UiSwitch v-model="markerTransition.enabled" :label="t('player.transition')" />
      </span>
      <div v-if="markerTransition.enabled" class="transition-duration">
        <SliderField
          v-model="markerTransition.duration"
          :min="1"
          :max="5"
          :step="0.5"
          :default-value="1.5"
          class="transition-slider"
        />
      </div>
    </div>

    <!-- Marker anlegen / bearbeiten -->
    <div v-if="showMarkerPanel" class="marker-add-form">
      <div class="form-title">
        {{ editingMarkerId !== null ? t('player.editMarkerTitle') : t('player.addMarkerTitle') }}
      </div>

      <div class="form-field">
        <label :for="timeInputId" class="form-label">{{ t('player.time') }}</label>
        <div class="time-row">
          <div class="time-spinner">
            <UiIconButton
              :label="t('player.timeStepBack')"
              variant="secondary"
              size="sm"
              class="btn-step"
              @pointerdown.prevent="startStepRepeat(-1)"
              @pointerup="stopStepRepeat"
              @pointerleave="stopStepRepeat"
              @pointercancel="stopStepRepeat"
              @keydown.enter.prevent="stepMarkerTime(-1)"
              @keydown.space.prevent="stepMarkerTime(-1)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14" stroke-linecap="round" />
              </svg>
            </UiIconButton>
            <input
              :id="timeInputId"
              v-model="pendingMarkerTimeInput"
              type="text"
              class="marker-time-input"
              :placeholder="t('player.timePlaceholder')"
              :aria-describedby="timeHintId"
              @blur="updateMarkerTimeFromInput"
              @keyup.enter="updateMarkerTimeFromInput"
              @keydown.up.prevent="stepMarkerTime(1)"
              @keydown.down.prevent="stepMarkerTime(-1)"
            />
            <UiIconButton
              :label="t('player.timeStepForward')"
              variant="secondary"
              size="sm"
              class="btn-step"
              @pointerdown.prevent="startStepRepeat(1)"
              @pointerup="stopStepRepeat"
              @pointerleave="stopStepRepeat"
              @pointercancel="stopStepRepeat"
              @keydown.enter.prevent="stepMarkerTime(1)"
              @keydown.space.prevent="stepMarkerTime(1)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" stroke-linecap="round" />
              </svg>
            </UiIconButton>
          </div>
          <span class="time-max">/ {{ formatTimePrecise(playerStore.duration) }}</span>
        </div>
        <UiSegmentedControl
          v-model="timeStepModel"
          :options="stepOptions"
          :label="t('player.timeStepLabel')"
          size="sm"
          class="time-step-options"
        />
        <span :id="timeHintId" class="form-hint">{{ t('player.timeFormatHint') }}</span>
      </div>

      <UiSelect
        v-model="newMarkerVisualizer"
        :label="t('player.visualizer')"
        :options="visualizerOptions"
        :disabled="!newMarkerShowVisualizer"
        size="sm"
      />
      <span class="form-switch" :title="t('player.visualizerVisibleHint')">
        <UiSwitch v-model="newMarkerShowVisualizer" :label="t('player.visualizerVisible')" />
      </span>

      <div class="form-field">
        <span class="form-label">{{ t('player.color') }}</span>
        <div class="color-row">
          <ColorField v-model="newMarkerColor" class="marker-color" />
          <UiSwitch v-model="newMarkerChangeColor" :label="t('player.change')" />
        </div>
      </div>

      <UiSelect
        v-model="newMarkerBackgroundKey"
        :label="t('player.background')"
        :options="backgroundOptions"
        size="sm"
      />

      <UiSelect
        v-model="newMarkerBgImageId"
        :label="t('player.backgroundImage')"
        :options="bgImageOptions"
        :title="t('player.backgroundImageHint')"
        size="sm"
      />
      <p v-if="newMarkerBgImageId !== ''" class="form-hint marker-form-hint">
        {{ t('player.backgroundImageHint') }}
      </p>

      <UiSelect
        v-model="newMarkerTextId"
        :label="t('player.text')"
        :options="textSelectOptions"
        :title="t('player.textAppears')"
        size="sm"
      />

      <UiSelect
        v-model="newMarkerShapeId"
        :label="t('player.shape')"
        :options="shapeSelectOptions"
        :title="t('player.shapeAppears')"
        size="sm"
      />
      <p v-if="String(newMarkerShapeId).startsWith('gallery:')" class="form-hint marker-form-hint">
        {{ t('player.newShapeHint') }}
      </p>

      <UiTextField
        v-model="newMarkerLabel"
        :label="t('player.label')"
        :placeholder="t('player.labelPlaceholder')"
      />

      <div class="form-buttons">
        <UiButton variant="ghost" size="sm" @click="cancelAddMarker">
          {{ t('common.cancel') }}
        </UiButton>
        <UiButton variant="primary" size="sm" @click="confirmAddMarker">
          {{ editingMarkerId !== null ? t('common.save') : t('common.add') }}
        </UiButton>
      </div>
    </div>

    <!-- Marker-Liste -->
    <ul v-if="beatMarkerStore.markerCount > 0" class="marker-list">
      <li
        v-for="marker in beatMarkerStore.sortedMarkers"
        :key="marker.id"
        class="marker-item"
        :class="{ triggered: marker.triggered, editing: editingMarkerId === marker.id }"
      >
        <span class="marker-time" @click="seekToMarker(marker.time)">{{
          formatTimePrecise(marker.time)
        }}</span>
        <span
          class="marker-label"
          :title="t('player.editMarker')"
          @click="startEditMarker(marker)"
          >{{ marker.label }}</span
        >
        <span
          v-if="marker.action.visualizerVisible === false || marker.action.hideVisualizer"
          class="marker-action marker-action-off"
          :title="t('player.visualizerHidden')"
          >🚫 {{ t('player.visualizer') }}</span
        >
        <span v-else-if="marker.action.visualizer" class="marker-action">{{
          getVisualizerName(marker.action.visualizer)
        }}</span>
        <span
          v-if="marker.action.background"
          class="marker-action marker-action-bg"
          :title="t('player.backgroundChanges')"
          >🎨 {{ marker.action.backgroundLabel || 'BG' }}</span
        >
        <span
          v-if="marker.action.backgroundImage"
          class="marker-action marker-action-bgimage"
          :title="t('player.backgroundImageHint')"
          >🖼️ {{ marker.action.backgroundImage.name }}</span
        >
        <span
          v-if="
            marker.action.textId !== undefined &&
            marker.action.textId !== null &&
            marker.action.textId !== ''
          "
          class="marker-action marker-action-text"
          :title="t('player.textAppears')"
          >📝 {{ marker.action.textLabel || t('player.text') }}</span
        >
        <span
          v-if="
            marker.action.shapeId !== undefined &&
            marker.action.shapeId !== null &&
            marker.action.shapeId !== ''
          "
          class="marker-action marker-action-shape"
          :title="t('player.shapeAppears')"
          >◆ {{ marker.action.shapeLabel || t('player.shape') }}</span
        >
        <div class="marker-buttons">
          <UiIconButton
            :label="t('player.editMarker')"
            size="sm"
            class="marker-btn"
            @click="startEditMarker(marker)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
              />
            </svg>
          </UiIconButton>
          <UiIconButton
            :label="t('common.delete')"
            size="sm"
            class="marker-btn marker-btn--danger"
            @click="removeMarker(marker.id)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </UiIconButton>
        </div>
      </li>
    </ul>
    <p v-else class="spb-empty-hint">{{ t('player.addMarkerTitle') }}</p>
  </div>
</template>

<script setup>
import ColorField from '../ui/ColorField.vue'
import SliderField from '../ui/SliderField.vue'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiSegmentedControl from '../ui/UiSegmentedControl.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSwitch from '../ui/UiSwitch.vue'
import UiTextField from '../ui/UiTextField.vue'
import { inject, computed, onUnmounted, useId } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore.js'
import { useLayerPresetStore, toLayerPresetRef } from '../../stores/layerPresetStore.js'
import { formatTimePrecise } from '../../utils/formatTime.js'
import { getBackgroundPresetOptions } from '../../utils/backgroundPresets.js'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t } = useI18n()
const playerStore = usePlayerStore()
const beatMarkerStore = useBeatMarkerStore()
const visualizerStore = useVisualizerStore()
const markerTransition = useMarkerTransitionStore()
const layerPresetStore = useLayerPresetStore()

const { popover, markers } = inject('playerBar')
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('markers')
const initOffset = cascadeOffset('markers')
const {
  showMarkerPanel,
  editingMarkerId,
  pendingMarkerTimeInput,
  markerTimeStep,
  newMarkerVisualizer,
  newMarkerColor,
  newMarkerChangeColor,
  newMarkerShowVisualizer,
  newMarkerBackgroundKey,
  newMarkerTextId,
  newMarkerShapeId,
  newMarkerBgImageId,
  newMarkerLabel,
  getMarkerTexts,
  getMarkerShapes,
  getMarkerShapeGallery,
  getMarkerGalleryImages,
  updateMarkerTimeFromInput,
  stepMarkerTime,
  addMarkerAtCurrentTime,
  startEditMarker,
  confirmAddMarker,
  cancelAddMarker,
  seekToMarker,
  removeMarker,
  clearAllMarkers,
  getVisualizerName,
} = markers

const timeInputId = `marker-time-${useId()}`
const timeHintId = `${timeInputId}-hint`

// Marker an/aus über den Store (Schalter in der Kopfzeile)
const markersEnabled = computed({
  get: () => beatMarkerStore.markersEnabled,
  set: (enabled) => {
    if (enabled !== beatMarkerStore.markersEnabled) beatMarkerStore.toggleEnabled()
  },
})

// Schrittweiten des Zeit-Spinners: langsam (Hundertstel) bis schnell (Sekunden).
// Das Segmented Control arbeitet mit Strings, der Spinner mit Zahlen.
const stepOptions = ['0.01', '0.1', '1'].map((value) => ({ value, label: `${value}s` }))
const timeStepModel = computed({
  get: () => String(markerTimeStep.value),
  set: (value) => {
    markerTimeStep.value = Number(value)
  },
})

// Halten der +/−-Buttons wiederholt den Schritt (kurze Verzögerung, dann zügig)
const STEP_REPEAT_DELAY_MS = 400
const STEP_REPEAT_INTERVAL_MS = 60
let stepRepeatTimeout = null
let stepRepeatInterval = null

function stopStepRepeat() {
  if (stepRepeatTimeout !== null) {
    clearTimeout(stepRepeatTimeout)
    stepRepeatTimeout = null
  }
  if (stepRepeatInterval !== null) {
    clearInterval(stepRepeatInterval)
    stepRepeatInterval = null
  }
}

function startStepRepeat(direction) {
  stopStepRepeat()
  stepMarkerTime(direction)
  stepRepeatTimeout = setTimeout(() => {
    stepRepeatInterval = setInterval(() => stepMarkerTime(direction), STEP_REPEAT_INTERVAL_MS)
  }, STEP_REPEAT_DELAY_MS)
}

onUnmounted(stopStepRepeat)

// Text-Auswahl (Texte aus dem Text-Verzeichnis). Wird beim Öffnen des Formulars
// neu geladen, damit gerade hinzugefügte Texte sofort erscheinen.
const textOptions = computed(() => {
  void showMarkerPanel.value
  return getMarkerTexts()
})

// Formen-Auswahl (Formen & Symbole). Reaktiv auf den shapeStore, damit neu
// eingefügte Formen sofort erscheinen.
const shapeOptions = computed(() => {
  void showMarkerPanel.value
  return getMarkerShapes()
})

// Galerie „Formen & Symbole“ (neue Form wird beim Speichern angelegt)
const shapeGalleryOptions = computed(() => getMarkerShapeGallery())

// Hintergrund-Bilder aus der eigenen Bildgalerie (reaktiv auf die Galerie)
const galleryImageOptions = computed(() => {
  void showMarkerPanel.value
  return getMarkerGalleryImages()
})

// Hintergrund-Auswahl (Vorlagen + gespeicherte Presets). Wird beim Öffnen des
// Formulars neu geladen, damit frisch gespeicherte Presets sofort erscheinen.
const backgroundPresetOptions = computed(() => {
  void showMarkerPanel.value
  return getBackgroundPresetOptions()
})

// ── Optionen für die Auswahlfelder (Gruppen werden zu <optgroup>) ──

/** Gruppe nur anzeigen, wenn sie Einträge hat */
const group = (label, options) => (options.length ? [{ label, options }] : [])

const visualizerOptions = computed(() => [
  { value: '', label: t('player.noChange') },
  ...group(
    t('player.myLayerPresets'),
    layerPresetStore.layerPresets.map((preset) => ({
      value: toLayerPresetRef(preset.id),
      label: `${preset.name} (${preset.layers.length})`,
    })),
  ),
  ...Object.entries(visualizerStore.categorizedVisualizers).flatMap(([category, items]) =>
    group(
      category,
      items.map((viz) => ({ value: viz.id, label: viz.name })),
    ),
  ),
])

const backgroundOptions = computed(() => {
  const toOption = (bg) => ({ value: bg.key, label: bg.label })
  const { user, builtin } = backgroundPresetOptions.value
  return [
    { value: '', label: t('player.noChange') },
    ...group(t('player.myBackgrounds'), user.map(toOption)),
    { label: t('player.backgroundTemplates'), options: builtin.map(toOption) },
  ]
})

const bgImageOptions = computed(() => [
  { value: '', label: t('player.noBackgroundImage') },
  ...(galleryImageOptions.value.length === 0
    ? [{ value: '__empty-gallery', label: t('player.emptyImageGallery'), disabled: true }]
    : galleryImageOptions.value.map((img) => ({
        value: img.id,
        label: `${img.number}. ${img.name}`,
      }))),
])

const textSelectOptions = computed(() => [
  { value: '', label: t('player.noText') },
  ...textOptions.value.map((txt) => ({
    value: txt.id,
    label:
      `${t('player.text')} ${txt.number}` +
      (txt.content ? ` — ${txt.content}` : '') +
      (txt.offCanvas ? ` ${t('player.textOffCanvas')}` : ''),
  })),
])

const shapeSelectOptions = computed(() => [
  { value: '', label: t('player.noShape') },
  ...group(
    t('player.insertedShapes'),
    shapeOptions.value.map((sh) => ({
      value: sh.id,
      label: `${sh.number}. ${sh.name}${sh.extra ? ` — ${sh.extra}` : ''}`,
    })),
  ),
  ...shapeGalleryOptions.value.map((g) => ({
    label: g.label,
    options: g.items.map((item) => ({ value: item.value, label: item.name })),
  })),
])
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.marker-controls :deep(.ui-icon-button svg) {
  width: var(--ds-icon-sm);
  height: var(--ds-icon-sm);
}
.marker-transition-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-3);
  min-height: 36px;
  padding: var(--ds-space-1) var(--ds-space-2);
  margin-bottom: var(--ds-space-2);
  background-color: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}
.transition-toggle {
  white-space: nowrap;
}
/* Dauer-Regler in eigener Zeile, damit er neben dem Schalter nicht schrumpft */
.transition-duration {
  flex-basis: 100%;
  min-width: 0;
}
.marker-add-form {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  margin-bottom: var(--ds-space-2);
  padding: var(--ds-space-3);
  background-color: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border-strong);
  border-radius: var(--ds-radius-md);
}
.form-title {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
}
/* gleiche Optik wie die Labels von UiSelect/UiTextField */
.form-label {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text-2);
}
.form-hint {
  font-size: var(--ds-text-xs);
  line-height: var(--ds-leading);
  color: var(--ds-text-3);
}
.marker-form-hint {
  margin: calc(-1 * var(--ds-space-2)) 0 0;
}
.form-switch {
  align-self: flex-start;
  margin-top: calc(-1 * var(--ds-space-1));
}
.time-row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}
.time-spinner {
  display: flex;
  align-items: center;
  gap: var(--ds-space-1);
}
.btn-step {
  user-select: none;
  touch-action: none;
}
.btn-step svg {
  width: var(--ds-icon-sm);
  height: var(--ds-icon-sm);
}
.marker-time-input {
  width: 84px;
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-2);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  font-family: var(--ds-font-mono);
  text-align: center;
  color: var(--ds-text);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border-strong);
  border-radius: var(--ds-radius-sm);
}
.marker-time-input:focus-visible {
  outline: none;
  border-color: var(--ds-accent);
  box-shadow: var(--ds-focus-ring);
}
.time-max {
  font-size: var(--ds-text-xs);
  font-family: var(--ds-font-mono);
  color: var(--ds-text-3);
}
.time-step-options {
  align-self: flex-start;
  margin-top: var(--ds-space-1);
}
.color-row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
}
.marker-color {
  width: 28px;
  height: 22px;
  padding: 0;
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  background: transparent;
}
.marker-add-form :deep(.ui-field__input) {
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-2);
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-sm);
}
/* lange Optionen (z. B. Visualizer-Namen) dürfen das Formular nicht verbreitern */
.marker-add-form :deep(.ui-select__native) {
  min-width: 0;
}
.form-buttons {
  display: flex;
  gap: var(--ds-space-2);
  justify-content: flex-end;
}
.marker-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.marker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: var(--ds-text-xs);
  background-color: var(--secondary-bg);
  border-radius: var(--ds-radius-sm);
  transition: all var(--ds-duration) var(--ds-ease);
}
.marker-item:hover {
  background-color: var(--btn-hover);
}
.marker-item.triggered {
  background-color: color-mix(in srgb, var(--ds-success) 20%, transparent);
  border-left: 2px solid var(--ds-success);
}
.marker-item.editing {
  background-color: var(--ds-accent-soft);
  border-left: 2px solid var(--accent-primary);
}
.marker-time {
  font-weight: var(--ds-weight-semibold);
  font-family: var(--ds-font-mono);
  color: var(--accent-ink);
  cursor: pointer;
  min-width: 52px;
}
.marker-time:hover {
  text-decoration: underline;
}
.marker-label {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.marker-label:hover {
  color: var(--accent-ink);
}
.marker-action {
  font-size: var(--ds-text-xs);
  color: var(--accent-ink);
  background-color: var(--ds-accent-soft);
  padding: 2px 6px;
  border-radius: var(--ds-radius-sm);
}
.marker-action-bg,
.marker-action-bgimage {
  color: var(--ds-success);
  background-color: color-mix(in srgb, var(--ds-success) 12%, transparent);
}
.marker-action-text {
  color: var(--ds-link);
  background-color: color-mix(in srgb, var(--ds-link) 14%, transparent);
}
.marker-action-shape {
  color: var(--accent-text);
  background-color: color-mix(in srgb, var(--ds-accent) 14%, transparent);
}
.marker-action-off {
  color: var(--ds-danger);
  background-color: color-mix(in srgb, var(--ds-danger) 12%, transparent);
}
.marker-buttons {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.marker-btn {
  opacity: 0.6;
}
.marker-btn svg {
  width: 12px;
  height: 12px;
}
.marker-item:hover .marker-btn,
.marker-btn:focus-visible {
  opacity: 1;
}
.marker-btn--danger:hover {
  color: var(--ds-danger);
}
</style>
