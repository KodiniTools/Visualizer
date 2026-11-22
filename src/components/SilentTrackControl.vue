<template>
  <div :class="['silent-track', { 'silent-track--compact': compact }]">
    <!-- Titel nur im Playlist-Popover; im Audio-Panel steht das Feld ohne Überschrift -->
    <span v-if="compact" class="silent-track__title">{{ t('silentTrack.title') }}</span>
    <div class="silent-track__row">
      <UiTextField
        v-model="durationText"
        class="silent-track__duration"
        :label="t('silentTrack.duration')"
        label-hidden
        placeholder="m:ss"
        inputmode="text"
        autocomplete="off"
        spellcheck="false"
        maxlength="10"
        :aria-invalid="durationError ? 'true' : undefined"
        :aria-describedby="durationError || !compact ? feedbackId : undefined"
        data-testid="silent-track-duration"
        @keydown.enter.prevent="addSilence"
      />
      <UiButton
        variant="secondary"
        size="sm"
        :disabled="parsedSeconds === null"
        data-testid="silent-track-add"
        @click="addSilence"
      >
        <template #icon>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        </template>
        {{ t('silentTrack.add') }}
      </UiButton>
    </div>
    <p
      v-if="durationError || !compact"
      :id="feedbackId"
      :class="['silent-track__feedback', { 'silent-track__feedback--error': durationError }]"
      :role="durationError ? 'alert' : undefined"
      data-testid="silent-track-feedback"
    >
      {{ durationError || durationHint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from '../lib/i18n'
import { usePlayerStore } from '../stores/playerStore'
import { useBeatMarkerStore } from '../stores/beatMarkerStore'
import { useToastStore } from '../stores/toastStore'
import {
  SILENT_TRACK_MAX_SECONDS,
  SILENT_TRACK_MIN_SECONDS,
  formatSilentDuration,
  parseSilentDuration,
  suggestSilentDuration,
} from '../lib/audio/silentTrack'
import UiTextField from './ui/UiTextField.vue'
import UiButton from './ui/UiButton.vue'

/**
 * „Ohne Track abspielen“: fügt der Playlist Stille in frei wählbarer Länge
 * hinzu (m:ss, h:mm:ss oder Minuten). Vorbelegt ist eine Länge, die alle
 * Beat-Drop-Marker abdeckt.
 * Der Player läuft damit wie mit einem Song (Visualizer, Beat-Drop-Marker,
 * Aufnahme); Ton kommt über Marker mit Track oder Video.
 */
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { t } = useI18n()
const playerStore = usePlayerStore()
const beatMarkerStore = useBeatMarkerStore()
const toastStore = useToastStore()

const uid = useId()
const feedbackId = `silent-track-feedback-${uid}`

// Vorschlag beim Öffnen: lang genug für die vorhandenen Marker
const durationText = ref(
  formatSilentDuration(suggestSilentDuration(beatMarkerStore.markers.map((m) => m.time))),
)

const maxLabel = formatSilentDuration(SILENT_TRACK_MAX_SECONDS)
const durationHint = computed(() => t('silentTrack.durationHint').replace('{max}', maxLabel))

const rawSeconds = computed(() => parseSilentDuration(durationText.value))

/** Gültige Länge in Sekunden, sonst null (Button aus, Fehlertext) */
const parsedSeconds = computed(() => {
  const s = rawSeconds.value
  if (s === null || s < SILENT_TRACK_MIN_SECONDS || s > SILENT_TRACK_MAX_SECONDS) return null
  return s
})

const durationError = computed(() => {
  if (durationText.value.trim() === '') return ''
  const s = rawSeconds.value
  if (s === null) return t('silentTrack.durationInvalid')
  if (s < SILENT_TRACK_MIN_SECONDS) return t('silentTrack.durationTooShort')
  if (s > SILENT_TRACK_MAX_SECONDS)
    return t('silentTrack.durationTooLong').replace('{max}', maxLabel)
  return ''
})

function addSilence() {
  const length = parsedSeconds.value
  if (length === null) return
  const label = formatSilentDuration(length)
  const name = t('silentTrack.trackName').replace('{duration}', label)
  const track = playerStore.addSilentTrack(length, name)
  if (!track) return
  // Eingabe normalisieren (z. B. „5“ → „5:00“), damit klar ist, was hinzugefügt wurde
  durationText.value = label
  toastStore.success(t('silentTrack.added').replace('{name}', name))
}
</script>

<style scoped>
.silent-track {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  padding: var(--ds-space-2);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-2);
}

.silent-track--compact {
  padding: var(--ds-space-1) var(--ds-space-2);
}

.silent-track__title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}

.silent-track__row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}

.silent-track__duration {
  flex: 1;
  min-width: 0;
}

/* Gleiche Höhe wie der kleine Button daneben */
.silent-track__duration :deep(.ui-field__input) {
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-2);
  font-size: var(--ds-text-sm);
  font-variant-numeric: tabular-nums;
}

.silent-track__feedback {
  margin: 0;
  font-size: var(--ds-text-xs);
  line-height: 1.4;
  color: var(--ds-text-3);
}

.silent-track__feedback--error {
  color: var(--ds-danger);
}
</style>
