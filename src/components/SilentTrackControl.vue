<template>
  <div :class="['silent-track', { 'silent-track--compact': compact }]">
    <div class="silent-track__head">
      <span class="silent-track__title">{{ t('silentTrack.title') }}</span>
      <span v-if="!compact" class="silent-track__hint">{{ t('silentTrack.hint') }}</span>
    </div>
    <div class="silent-track__row">
      <UiSelect
        v-model="seconds"
        class="silent-track__select"
        size="sm"
        :label="t('silentTrack.duration')"
        label-hidden
        :options="durationOptions"
        data-testid="silent-track-duration"
      />
      <UiButton variant="secondary" size="sm" data-testid="silent-track-add" @click="addSilence">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '../lib/i18n'
import { usePlayerStore } from '../stores/playerStore'
import { useBeatMarkerStore } from '../stores/beatMarkerStore'
import { useToastStore } from '../stores/toastStore'
import {
  SILENT_TRACK_DURATIONS,
  formatSilentDuration,
  suggestSilentDuration,
} from '../lib/audio/silentTrack'
import UiSelect from './ui/UiSelect.vue'
import UiButton from './ui/UiButton.vue'

/**
 * „Ohne Track abspielen“: fügt der Playlist Stille in wählbarer Länge hinzu.
 * Der Player läuft damit wie mit einem Song (Visualizer, Beat-Drop-Marker,
 * Aufnahme); Ton kommt über Marker mit Track oder Video.
 */
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { t } = useI18n()
const playerStore = usePlayerStore()
const beatMarkerStore = useBeatMarkerStore()
const toastStore = useToastStore()

// Vorschlag beim Öffnen: lang genug für die vorhandenen Marker
const seconds = ref<string | number>(
  suggestSilentDuration(beatMarkerStore.markers.map((m) => m.time)),
)

const durationOptions = computed(() =>
  SILENT_TRACK_DURATIONS.map((d) => ({ value: d, label: formatSilentDuration(d) })),
)

function addSilence() {
  const length = Number(seconds.value)
  const name = t('silentTrack.trackName').replace('{duration}', formatSilentDuration(length))
  const track = playerStore.addSilentTrack(length, name)
  if (track) toastStore.success(t('silentTrack.added').replace('{name}', name))
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

.silent-track__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.silent-track__title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}

.silent-track__hint {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  line-height: 1.4;
}

.silent-track__row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}

.silent-track__select {
  flex: 1;
  min-width: 0;
}
</style>
